##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""OpenAI GPT LLM client implementation."""

import json
import socket
import ssl
import urllib.request
import urllib.error
from typing import Optional
import uuid

# Try to use certifi for proper SSL certificate handling
try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

from pgadmin.llm.client import LLMClient, LLMClientError
from pgadmin.llm.models import (
    Message, Tool, ToolCall, LLMResponse, LLMError,
    Role, StopReason, Usage
)


# Default model if none specified
DEFAULT_MODEL = 'gpt-4o'

# API configuration
API_URL = 'https://api.openai.com/v1/chat/completions'


class OpenAIClient(LLMClient):
    """
    OpenAI GPT API client.

    Implements the LLMClient interface for OpenAI's GPT models.
    """

    def __init__(self, api_key: str, model: Optional[str] = None):
        """
        Initialize the OpenAI client.

        Args:
            api_key: The OpenAI API key.
            model: Optional model name. Defaults to gpt-4o.
        """
        self._api_key = api_key
        self._model = model or DEFAULT_MODEL

    @property
    def provider_name(self) -> str:
        return 'openai'

    @property
    def model_name(self) -> str:
        return self._model

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        return bool(self._api_key)

    def chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.0,
        **kwargs
    ) -> LLMResponse:
        """
        Send a chat request to OpenAI.

        Args:
            messages: List of conversation messages.
            tools: Optional list of tools the model can use.
            system_prompt: Optional system prompt.
            max_tokens: Maximum tokens in response.
            temperature: Sampling temperature.
            **kwargs: Additional parameters.

        Returns:
            LLMResponse containing the model's response.

        Raises:
            LLMClientError: If the request fails.
        """
        # Build the request payload
        converted_messages = self._convert_messages(messages)

        # Add system prompt at the beginning if provided
        if system_prompt:
            converted_messages.insert(0, {
                'role': 'system',
                'content': system_prompt
            })

        payload = {
            'model': self._model,
            'messages': converted_messages,
            'max_completion_tokens': max_tokens,
            'temperature': temperature
        }

        if tools:
            payload['tools'] = self._convert_tools(tools)
            payload['tool_choice'] = 'auto'

        # Make the API request
        try:
            response_data = self._make_request(payload)
            return self._parse_response(response_data)
        except LLMClientError:
            raise
        except Exception as e:
            raise LLMClientError(LLMError(
                message=f"Request failed: {str(e)}",
                provider=self.provider_name
            ))

    def _convert_messages(self, messages: list[Message]) -> list[dict]:
        """Convert Message objects to OpenAI API format."""
        result = []

        for msg in messages:
            if msg.role == Role.SYSTEM:
                result.append({
                    'role': 'system',
                    'content': msg.content
                })

            elif msg.role == Role.USER:
                result.append({
                    'role': 'user',
                    'content': msg.content
                })

            elif msg.role == Role.ASSISTANT:
                message = {
                    'role': 'assistant',
                    'content': msg.content or None
                }

                # Add tool calls if present
                if msg.tool_calls:
                    message['tool_calls'] = [
                        {
                            'id': tc.id,
                            'type': 'function',
                            'function': {
                                'name': tc.name,
                                'arguments': json.dumps(tc.arguments)
                            }
                        }
                        for tc in msg.tool_calls
                    ]

                result.append(message)

            elif msg.role == Role.TOOL:
                # Each tool result is a separate message in OpenAI
                for tr in msg.tool_results:
                    result.append({
                        'role': 'tool',
                        'tool_call_id': tr.tool_call_id,
                        'content': tr.content
                    })

        return result

    def _convert_tools(self, tools: list[Tool]) -> list[dict]:
        """Convert Tool objects to OpenAI API format."""
        return [
            {
                'type': 'function',
                'function': {
                    'name': tool.name,
                    'description': tool.description,
                    'parameters': tool.parameters
                }
            }
            for tool in tools
        ]

    def _make_request(self, payload: dict) -> dict:
        """Make an HTTP request to the OpenAI API."""
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self._api_key}'
        }

        request = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        try:
            with urllib.request.urlopen(
                request, timeout=120, context=SSL_CONTEXT
            ) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                error_msg = error_data.get('error', {}).get('message', str(e))
            except json.JSONDecodeError:
                error_msg = error_body or str(e)

            raise LLMClientError(LLMError(
                message=error_msg,
                code=str(e.code),
                provider=self.provider_name,
                retryable=e.code in (429, 500, 502, 503, 504)
            ))
        except urllib.error.URLError as e:
            raise LLMClientError(LLMError(
                message=f"Connection error: {e.reason}",
                provider=self.provider_name,
                retryable=True
            ))
        except socket.timeout:
            raise LLMClientError(LLMError(
                message="Request timed out. The request may be too large "
                        "or the server is slow to respond.",
                code='timeout',
                provider=self.provider_name,
                retryable=True
            ))

    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse the OpenAI API response into an LLMResponse."""
        # Check for API-level errors in the response
        if 'error' in data:
            error_info = data['error']
            raise LLMClientError(LLMError(
                message=error_info.get('message', 'Unknown API error'),
                code=error_info.get('code', 'unknown'),
                provider=self.provider_name,
                retryable=False
            ))

        choices = data.get('choices', [])
        if not choices:
            raise LLMClientError(LLMError(
                message='No response choices returned from API',
                provider=self.provider_name,
                retryable=False
            ))

        choice = choices[0]
        message = choice.get('message', {})

        # Check for refusal (content moderation)
        if message.get('refusal'):
            raise LLMClientError(LLMError(
                message=f"Request refused: {message.get('refusal')}",
                provider=self.provider_name,
                retryable=False
            ))

        content = message.get('content', '') or ''
        tool_calls = []

        # Parse tool calls if present
        for tc in message.get('tool_calls', []):
            if tc.get('type') == 'function':
                func = tc.get('function', {})
                try:
                    arguments = json.loads(func.get('arguments', '{}'))
                except json.JSONDecodeError:
                    arguments = {}

                tool_calls.append(ToolCall(
                    id=tc.get('id', str(uuid.uuid4())),
                    name=func.get('name', ''),
                    arguments=arguments
                ))

        # Map OpenAI finish reasons to our enum
        finish_reason = choice.get('finish_reason', '')
        stop_reason_map = {
            'stop': StopReason.END_TURN,
            'tool_calls': StopReason.TOOL_USE,
            'length': StopReason.MAX_TOKENS,
            'content_filter': StopReason.STOP_SEQUENCE
        }
        stop_reason = stop_reason_map.get(finish_reason, StopReason.UNKNOWN)

        # Parse usage information
        usage_data = data.get('usage', {})
        usage = Usage(
            input_tokens=usage_data.get('prompt_tokens', 0),
            output_tokens=usage_data.get('completion_tokens', 0),
            total_tokens=usage_data.get('total_tokens', 0)
        )

        # Check for problematic responses
        if not content and not tool_calls:
            if stop_reason == StopReason.MAX_TOKENS:
                input_tokens = usage.input_tokens
                raise LLMClientError(LLMError(
                    message=f'Response truncated due to token limit '
                            f'(input: {input_tokens} tokens). '
                            f'The request is too large for model {self._model}. '
                            f'Try using a model with a larger context window, '
                            f'or analyze a smaller scope (e.g., a specific schema '
                            f'instead of the entire database).',
                    code='max_tokens',
                    provider=self.provider_name,
                    retryable=False
                ))
            elif finish_reason and finish_reason not in ('stop', 'tool_calls'):
                raise LLMClientError(LLMError(
                    message=f'Empty response with finish reason: {finish_reason}',
                    code=finish_reason,
                    provider=self.provider_name,
                    retryable=False
                ))

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            model=data.get('model', self._model),
            usage=usage,
            raw_response=data
        )
