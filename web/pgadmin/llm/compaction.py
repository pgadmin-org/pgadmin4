##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Conversation history compaction for managing LLM token budgets.

This module implements a compaction strategy to keep conversation history
within token limits. It classifies messages by importance and drops
lower-value messages first, while preserving tool call/result pairs
and recent conversation context.

Inspired by the approach described at:
https://www.pgedge.com/blog/lessons-learned-writing-an-mcp-server-for-postgresql
"""

import re
from typing import Optional

from pgadmin.llm.models import Message, Role, ToolCall


# Token budget defaults
DEFAULT_MAX_TOKENS = 100000
DEFAULT_RECENT_WINDOW = 10

# Provider-specific characters-per-token ratios
CHARS_PER_TOKEN = {
    'anthropic': 3.8,
    'openai': 4.0,
    'ollama': 4.5,
    'docker': 4.0,
}

# SQL content is tokenized less efficiently
SQL_TOKEN_MULTIPLIER = 1.2

# Overhead per message (role markers, formatting, etc.)
MESSAGE_OVERHEAD_TOKENS = 10

# Importance tiers
CLASS_ANCHOR = 1.0       # Schema info, corrections - always keep
CLASS_IMPORTANT = 0.8    # Query analysis, errors, insights
CLASS_CONTEXTUAL = 0.6   # Detailed responses, tool results
CLASS_ROUTINE = 0.4      # Short responses, standard messages
CLASS_TRANSIENT = 0.1    # Acknowledgments, short phrases

# Patterns for classification
_SCHEMA_PATTERNS = re.compile(
    r'\b(CREATE|ALTER|DROP)\s+(TABLE|INDEX|VIEW|SCHEMA)\b'
    r'|PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT\b',
    re.IGNORECASE
)

_QUERY_PATTERNS = re.compile(
    r'\bEXPLAIN\s+ANALYZE\b|execution\s+time\b'
    r'|seq\s+scan\b|index\s+scan\b|query\s+plan\b',
    re.IGNORECASE
)

_ERROR_PATTERNS = re.compile(
    r'\berror\b|\bfailed\b|\bsyntax\s+error\b'
    r'|\bpermission\s+denied\b|\bdoes\s+not\s+exist\b',
    re.IGNORECASE
)


def estimate_tokens(text: str, provider: str = 'openai') -> int:
    """Estimate the number of tokens in a text string.

    Uses provider-specific character-per-token ratios and applies
    a multiplier for SQL-heavy content.

    Args:
        text: The text to estimate tokens for.
        provider: The LLM provider name for ratio selection.

    Returns:
        Estimated token count.
    """
    if not text:
        return 0

    chars_per_token = CHARS_PER_TOKEN.get(provider, 4.0)
    base_tokens = len(text) / chars_per_token

    # Apply SQL multiplier if content looks like SQL
    if re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b',
                 text, re.IGNORECASE):
        base_tokens *= SQL_TOKEN_MULTIPLIER

    return int(base_tokens) + MESSAGE_OVERHEAD_TOKENS


def estimate_message_tokens(message: Message, provider: str = 'openai') -> int:
    """Estimate token count for a single Message object.

    Args:
        message: The Message to estimate.
        provider: The LLM provider name.

    Returns:
        Estimated token count.
    """
    total = estimate_tokens(message.content, provider)

    # Account for tool call arguments
    for tc in message.tool_calls:
        import json
        total += estimate_tokens(json.dumps(tc.arguments), provider)
        total += estimate_tokens(tc.name, provider)

    # Account for tool results
    for tr in message.tool_results:
        total += estimate_tokens(tr.content, provider)

    return total


def estimate_history_tokens(
    messages: list[Message], provider: str = 'openai'
) -> int:
    """Estimate total token count for a conversation history.

    Args:
        messages: List of Message objects.
        provider: The LLM provider name.

    Returns:
        Estimated total token count.
    """
    return sum(estimate_message_tokens(m, provider) for m in messages)


def _classify_message(message: Message) -> float:
    """Classify a message by importance for compaction decisions.

    Args:
        message: The message to classify.

    Returns:
        Importance score from 0.0 to 1.0.
    """
    content = message.content or ''

    # Tool results containing schema info are anchors
    if message.role == Role.TOOL:
        for tr in message.tool_results:
            if _SCHEMA_PATTERNS.search(tr.content):
                return CLASS_ANCHOR
            if _ERROR_PATTERNS.search(tr.content):
                return CLASS_IMPORTANT
            # Large tool results are contextual
            if len(tr.content) > 500:
                return CLASS_CONTEXTUAL
        return CLASS_ROUTINE

    # Assistant messages with tool calls are important (they reference tools)
    if message.role == Role.ASSISTANT and message.tool_calls:
        return CLASS_IMPORTANT

    # Check content patterns
    if _SCHEMA_PATTERNS.search(content):
        return CLASS_ANCHOR
    if _ERROR_PATTERNS.search(content):
        return CLASS_IMPORTANT
    if _QUERY_PATTERNS.search(content):
        return CLASS_IMPORTANT

    # Short messages are transient
    if len(content) < 30:
        return CLASS_TRANSIENT

    # Medium messages are routine
    if len(content) < 100:
        return CLASS_ROUTINE

    return CLASS_CONTEXTUAL


def _find_tool_pair_indices(
    messages: list[Message]
) -> dict[int, frozenset[int]]:
    """Find indices of tool_call/tool_result groups that must stay together.

    An assistant message may contain multiple tool_calls, each with a
    corresponding tool result message. All messages in such a group
    must be dropped or kept together.

    Returns a mapping where every index in a group maps to the full
    set of indices in that group.

    Args:
        messages: The message list.

    Returns:
        Dict mapping index -> frozenset of all indices in the group.
    """
    groups: dict[int, frozenset[int]] = {}

    for i, msg in enumerate(messages):
        if msg.role == Role.ASSISTANT and msg.tool_calls:
            tool_call_ids = {tc.id for tc in msg.tool_calls}
            group_indices = {i}
            for j in range(i + 1, len(messages)):
                if messages[j].role == Role.TOOL:
                    for tr in messages[j].tool_results:
                        if tr.tool_call_id in tool_call_ids:
                            group_indices.add(j)
                            break
            group = frozenset(group_indices)
            for idx in group:
                groups[idx] = group

    return groups


def compact_history(
    messages: list[Message],
    max_tokens: int = DEFAULT_MAX_TOKENS,
    recent_window: int = DEFAULT_RECENT_WINDOW,
    provider: str = 'openai'
) -> list[Message]:
    """Compact conversation history to fit within a token budget.

    Strategy:
    1. Always keep the first message (provides original context)
    2. Always keep the last `recent_window` messages
    3. Among remaining messages, classify by importance and drop
       lowest-value messages first
    4. Keep tool_call/tool_result pairs together

    Args:
        messages: Full conversation history.
        max_tokens: Maximum token budget for the history.
        recent_window: Number of recent messages to always preserve.
        provider: LLM provider name for token estimation.

    Returns:
        Compacted list of messages that fits within the token budget.
    """
    if not messages:
        return messages

    # Check if we're already within budget
    current_tokens = estimate_history_tokens(messages, provider)
    if current_tokens <= max_tokens:
        return messages

    total = len(messages)

    # Determine protected indices
    protected = set()

    # Always protect the first message
    protected.add(0)

    # Always protect the recent window
    recent_start = max(1, total - recent_window)
    for i in range(recent_start, total):
        protected.add(i)

    # If protected messages alone exceed the budget, shrink the
    # recent window until we have room for compaction candidates.
    while recent_window > 0:
        protected_tokens = sum(
            estimate_message_tokens(messages[i], provider)
            for i in protected
        )
        if protected_tokens <= max_tokens:
            break
        recent_window -= 1
        recent_start = max(1, total - recent_window)
        protected = {0} | set(range(recent_start, total))

    # Find tool groups
    tool_groups = _find_tool_pair_indices(messages)

    # Expand protected set to include entire tool groups so we never
    # split a tool-use turn (leaving orphaned call or result messages).
    for i in list(protected):
        if i in tool_groups:
            protected |= set(tool_groups[i])

    # Classify and score all non-protected messages
    candidates = []
    for i in range(len(messages)):
        if i not in protected:
            score = _classify_message(messages[i])
            candidates.append((i, score))

    # Sort by importance (lowest first - these get dropped first)
    candidates.sort(key=lambda x: x[1])

    # Drop messages starting from lowest importance until within budget
    dropped = set()
    for idx, score in candidates:
        if current_tokens <= max_tokens:
            break

        # Skip if already dropped (as part of a group)
        if idx in dropped:
            continue

        # Don't drop anchor messages unless we absolutely must
        if score >= CLASS_ANCHOR:
            break

        # Calculate tokens saved by dropping this message
        saved = estimate_message_tokens(messages[idx], provider)
        dropped.add(idx)

        # If this is part of a tool group, drop all partners too
        if idx in tool_groups:
            for partner in tool_groups[idx]:
                if partner != idx and partner not in protected:
                    saved += estimate_message_tokens(
                        messages[partner], provider
                    )
                    dropped.add(partner)

        current_tokens -= saved

    # If still over budget, drop anchor messages too
    if current_tokens > max_tokens:
        for idx, score in candidates:
            if current_tokens <= max_tokens:
                break
            if idx in dropped:
                continue

            saved = estimate_message_tokens(messages[idx], provider)
            dropped.add(idx)

            if idx in tool_groups:
                for partner in tool_groups[idx]:
                    if partner != idx and partner not in protected:
                        saved += estimate_message_tokens(
                            messages[partner], provider
                        )
                        dropped.add(partner)

            current_tokens -= saved

    # Build the compacted message list preserving order
    result = [msg for i, msg in enumerate(messages) if i not in dropped]

    return result


def deserialize_history(
    history_data: list[dict]
) -> list[Message]:
    """Deserialize conversation history from JSON request data.

    Converts a list of message dictionaries (from the frontend) into
    Message objects suitable for passing to chat_with_database().

    Args:
        history_data: List of dicts with 'role' and 'content' keys,
            and optionally 'tool_calls' and 'tool_results'.

    Returns:
        List of Message objects.
    """
    if not isinstance(history_data, list):
        return []

    messages = []
    for item in history_data:
        if not isinstance(item, dict):
            continue

        role_str = item.get('role', '')
        content = item.get('content', '')

        try:
            role = Role(role_str)
        except ValueError:
            continue  # Skip unknown roles

        # Reconstruct tool calls if present
        tool_calls = []
        for tc_data in item.get('tool_calls') or []:
            if not isinstance(tc_data, dict):
                continue
            tool_calls.append(ToolCall(
                id=tc_data.get('id', ''),
                name=tc_data.get('name', ''),
                arguments=tc_data.get('arguments', {})
            ))

        # Reconstruct tool results if present
        from pgadmin.llm.models import ToolResult
        tool_results = []
        for tr_data in item.get('tool_results') or []:
            if not isinstance(tr_data, dict):
                continue
            tool_results.append(ToolResult(
                tool_call_id=tr_data.get('tool_call_id', ''),
                content=tr_data.get('content', ''),
                is_error=tr_data.get('is_error', False)
            ))

        messages.append(Message(
            role=role,
            content=content,
            tool_calls=tool_calls,
            tool_results=tool_results
        ))

    return messages


def filter_conversational(messages: list[Message]) -> list[Message]:
    """Filter history to only conversational messages for storage.

    Keeps user messages and final assistant responses (those without
    tool calls). Drops intermediate assistant messages that contain
    tool_use requests and all tool result messages, since these are
    internal to each turn and don't need to persist between turns.

    This dramatically reduces history size since tool results often
    contain large schema dumps and query results.

    Args:
        messages: Full message history including tool call internals.

    Returns:
        Filtered list with only user messages and final assistant
        responses.
    """
    result = []
    for msg in messages:
        if msg.role == Role.USER:
            result.append(msg)
        elif msg.role == Role.ASSISTANT and not msg.tool_calls:
            # Final assistant response (no pending tool calls)
            result.append(msg)
        # Skip Role.TOOL and assistant messages with tool_calls
    return result
