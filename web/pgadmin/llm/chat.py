##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""LLM chat functionality with database tool integration.

This module provides high-level functions for running LLM conversations
that can use database tools to query and inspect PostgreSQL databases.
"""

import json
from typing import Optional

from pgadmin.llm.client import get_llm_client, is_llm_available
from pgadmin.llm.models import Message, StopReason
from pgadmin.llm.tools import DATABASE_TOOLS, execute_tool, DatabaseToolError
from pgadmin.llm.utils import get_max_tool_iterations


# Default system prompt for database assistant
DEFAULT_SYSTEM_PROMPT = (
    "You are a PostgreSQL database assistant integrated into pgAdmin 4. "
    "You have access to tools that allow you to query the database and "
    "inspect its schema.\n\n"
    "When helping users:\n"
    "1. First understand the database structure using get_database_schema "
    "or get_table_info\n"
    "2. Write efficient SQL queries to answer questions about the data\n"
    "3. Explain your findings clearly and concisely\n"
    "4. If a query might return many rows, consider using LIMIT or "
    "aggregations\n\n"
    "Important:\n"
    "- All queries run in READ ONLY mode - you cannot modify data\n"
    "- Results are limited to 1000 rows\n"
    "- Always validate your understanding of the schema before writing "
    "complex queries"
)


def chat_with_database(
    user_message: str,
    sid: int,
    did: int,
    conversation_history: Optional[list[Message]] = None,
    system_prompt: Optional[str] = None,
    max_tool_iterations: Optional[int] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> tuple[str, list[Message]]:
    """
    Run an LLM chat conversation with database tool access.

    This function handles the full conversation loop, executing any
    tool calls the LLM makes and continuing until a final response
    is generated.

    Args:
        user_message: The user's message/question
        sid: Server ID for database connection
        did: Database ID for database connection
        conversation_history: Optional list of previous messages
        system_prompt: Optional custom system prompt (uses default if None)
        max_tool_iterations: Maximum number of tool call rounds (uses preference)
        provider: Optional LLM provider override
        model: Optional model override

    Returns:
        Tuple of (final_response_text, updated_conversation_history)

    Raises:
        LLMClientError: If the LLM request fails
        RuntimeError: If LLM is not available or max iterations exceeded
    """
    if not is_llm_available():
        raise RuntimeError("LLM is not configured. Please configure an LLM "
                           "provider in Preferences > AI.")

    client = get_llm_client(provider=provider, model=model)
    if not client:
        raise RuntimeError("Failed to create LLM client")

    # Initialize conversation history
    messages = list(conversation_history) if conversation_history else []
    messages.append(Message.user(user_message))

    # Use default system prompt if none provided
    if system_prompt is None:
        system_prompt = DEFAULT_SYSTEM_PROMPT

    # Get max iterations from preferences if not specified
    if max_tool_iterations is None:
        max_tool_iterations = get_max_tool_iterations()

    iteration = 0
    while iteration < max_tool_iterations:
        iteration += 1

        # Call the LLM
        response = client.chat(
            messages=messages,
            tools=DATABASE_TOOLS,
            system_prompt=system_prompt
        )

        # Add assistant response to history
        messages.append(response.to_message())

        # Check if we're done
        if response.stop_reason != StopReason.TOOL_USE:
            return response.content, messages

        # Execute tool calls
        tool_results = []
        for tool_call in response.tool_calls:
            try:
                result = execute_tool(
                    tool_name=tool_call.name,
                    arguments=tool_call.arguments,
                    sid=sid,
                    did=did
                )
                tool_results.append(Message.tool_result(
                    tool_call_id=tool_call.id,
                    content=json.dumps(result, default=str),
                    is_error=False
                ))
            except (DatabaseToolError, ValueError) as e:
                tool_results.append(Message.tool_result(
                    tool_call_id=tool_call.id,
                    content=json.dumps({"error": str(e)}),
                    is_error=True
                ))
            except Exception as e:
                tool_results.append(Message.tool_result(
                    tool_call_id=tool_call.id,
                    content=json.dumps({
                        "error": f"Unexpected error: {str(e)}"
                    }),
                    is_error=True
                ))

        # Add tool results to history
        messages.extend(tool_results)

    raise RuntimeError(
        f"Exceeded maximum tool iterations ({max_tool_iterations})"
    )


def single_query(
    question: str,
    sid: int,
    did: int,
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> str:
    """
    Ask a single question about the database.

    This is a convenience function for one-shot questions without
    maintaining conversation history.

    Args:
        question: The question to ask
        sid: Server ID
        did: Database ID
        provider: Optional LLM provider override
        model: Optional model override

    Returns:
        The LLM's response text

    Raises:
        LLMClientError: If the LLM request fails
        RuntimeError: If LLM is not available
    """
    response, _ = chat_with_database(
        user_message=question,
        sid=sid,
        did=did,
        provider=provider,
        model=model
    )
    return response
