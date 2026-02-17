##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Data models for LLM interactions."""

from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum


class Role(str, Enum):
    """Message roles in a conversation."""
    SYSTEM = 'system'
    USER = 'user'
    ASSISTANT = 'assistant'
    TOOL = 'tool'


class StopReason(str, Enum):
    """Reasons why the LLM stopped generating."""
    END_TURN = 'end_turn'
    TOOL_USE = 'tool_use'
    MAX_TOKENS = 'max_tokens'
    STOP_SEQUENCE = 'stop_sequence'
    ERROR = 'error'
    UNKNOWN = 'unknown'


@dataclass
class ToolCall:
    """Represents a tool call requested by the LLM."""
    id: str
    name: str
    arguments: dict[str, Any]

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            'id': self.id,
            'name': self.name,
            'arguments': self.arguments
        }


@dataclass
class ToolResult:
    """Represents the result of a tool execution."""
    tool_call_id: str
    content: str
    is_error: bool = False

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            'tool_call_id': self.tool_call_id,
            'content': self.content,
            'is_error': self.is_error
        }


@dataclass
class Message:
    """Represents a message in a conversation."""
    role: Role
    content: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    tool_results: list[ToolResult] = field(default_factory=list)
    name: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        result = {
            'role': self.role.value,
            'content': self.content
        }
        if self.tool_calls:
            result['tool_calls'] = [tc.to_dict() for tc in self.tool_calls]
        if self.tool_results:
            result['tool_results'] = [tr.to_dict() for tr in self.tool_results]
        if self.name:
            result['name'] = self.name
        return result

    @classmethod
    def system(cls, content: str) -> 'Message':
        """Create a system message."""
        return cls(role=Role.SYSTEM, content=content)

    @classmethod
    def user(cls, content: str) -> 'Message':
        """Create a user message."""
        return cls(role=Role.USER, content=content)

    @classmethod
    def assistant(cls, content: str,
                  tool_calls: list[ToolCall] = None) -> 'Message':
        """Create an assistant message."""
        return cls(
            role=Role.ASSISTANT,
            content=content,
            tool_calls=tool_calls or []
        )

    @classmethod
    def tool_result(cls, tool_call_id: str, content: str,
                    is_error: bool = False) -> 'Message':
        """Create a tool result message."""
        return cls(
            role=Role.TOOL,
            content='',
            tool_results=[ToolResult(
                tool_call_id=tool_call_id,
                content=content,
                is_error=is_error
            )]
        )


@dataclass
class Tool:
    """Represents a tool that can be called by the LLM."""
    name: str
    description: str
    parameters: dict[str, Any]

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            'name': self.name,
            'description': self.description,
            'parameters': self.parameters
        }


@dataclass
class Usage:
    """Token usage information."""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            'input_tokens': self.input_tokens,
            'output_tokens': self.output_tokens,
            'total_tokens': self.total_tokens
        }


@dataclass
class LLMResponse:
    """Represents a response from an LLM."""
    content: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: StopReason = StopReason.END_TURN
    model: str = ''
    usage: Usage = field(default_factory=Usage)
    raw_response: Optional[Any] = None

    @property
    def has_tool_calls(self) -> bool:
        """Check if the response contains tool calls."""
        return len(self.tool_calls) > 0

    def to_message(self) -> Message:
        """Convert response to an assistant message."""
        return Message.assistant(
            content=self.content,
            tool_calls=self.tool_calls
        )

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            'content': self.content,
            'tool_calls': [tc.to_dict() for tc in self.tool_calls],
            'stop_reason': self.stop_reason.value,
            'model': self.model,
            'usage': self.usage.to_dict()
        }


@dataclass
class LLMError:
    """Represents an error from an LLM operation."""
    message: str
    code: Optional[str] = None
    provider: Optional[str] = None
    retryable: bool = False

    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message
