##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Anthropic Claude LLM client implementation."""

import json
import socket
import ssl
import urllib.request
import urllib.error
from collections.abc import Generator
from typing import Optional, Union
import uuid

# Try to use certifi for proper SSL certificate handling
try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

# Enforce minimum TLS 1.2 to satisfy security requirements
SSL_CONTEXT.minimum_version = ssl.TLSVersion.TLSv1_2

from pgadmin.llm.client import LLMClient, LLMClientError
from pgadmin.llm.models import (
    Message, Tool, ToolCall, LLMResponse, LLMError,
    Role, StopReason, Usage
)


# Default model if none specified
DEFAULT_MODEL = 'claude-sonnet-4-20250514'

# Default API base URL
DEFAULT_API_BASE_URL = 'https://api.anthropic.com/v1'
API_VERSION = '2023-06-01'


class AnthropicClient(LLMClient):
    """
    Anthropic Claude API client.

    Implements the LLMClient interface for Anthropic's Claude models
    and any Anthropic-compatible API endpoint.
    """

    def __init__(self, api_key: Optional[str] = None,
                 model: Optional[str] = None,
                 api_url: Optional[str] = None):
        """
        Initialize the Anthropic client.

        Args:
            api_key: The Anthropic API key. Optional when using a custom
                     API URL with a provider that does not require
                     authentication.
            model: Optional model name. Defaults to claude-sonnet-4-20250514.
            api_url: Optional custom API base URL. Defaults to
                     https://api.anthropic.com/v1.
        """
        self._api_key = api_key or ''
        self._model = model or DEFAULT_MODEL
        base_url = (api_url or DEFAULT_API_BASE_URL).rstrip('/')
        self._api_url = f'{base_url}/messages'

    @property
    def provider_name(self) -> str:
        return 'anthropic'

    @property
    def model_name(self) -> str:
        return self._model

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        # API key is required for the default Anthropic endpoint, but optional
        # for custom endpoints (e.g., local proxy servers).
        if self._api_url.startswith(DEFAULT_API_BASE_URL):
            return bool(self._api_key)
        return True

    def chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """
        Send a chat request to Claude.

        Args:
            messages: List of conversation messages.
            tools: Optional list of tools Claude can use.
            system_prompt: Optional system prompt.
            max_tokens: Maximum tokens in response.
            **kwargs: Additional parameters.

        Returns:
            LLMResponse containing Claude's response.

        Raises:
            LLMClientError: If the request fails.
        """
        # Build the request payload
        payload = {
            'model': self._model,
            'max_tokens': max_tokens,
            'messages': self._convert_messages(messages)
        }

        if system_prompt:
            payload['system'] = system_prompt

        if tools:
            payload['tools'] = self._convert_tools(tools)

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
        """Convert Message objects to Anthropic API format."""
        result = []

        for msg in messages:
            if msg.role == Role.SYSTEM:
                # System messages are handled separately in Anthropic API
                continue

            if msg.role == Role.USER:
                result.append({
                    'role': 'user',
                    'content': msg.content
                })

            elif msg.role == Role.ASSISTANT:
                content = []
                if msg.content:
                    content.append({'type': 'text', 'text': msg.content})

                # Add tool use blocks
                for tc in msg.tool_calls:
                    content.append({
                        'type': 'tool_use',
                        'id': tc.id,
                        'name': tc.name,
                        'input': tc.arguments
                    })

                result.append({
                    'role': 'assistant',
                    'content': content if content else msg.content
                })

            elif msg.role == Role.TOOL:
                # Tool results in Anthropic are sent as user messages
                content = []
                for tr in msg.tool_results:
                    content.append({
                        'type': 'tool_result',
                        'tool_use_id': tr.tool_call_id,
                        'content': tr.content,
                        'is_error': tr.is_error
                    })
                result.append({
                    'role': 'user',
                    'content': content
                })

        return result

    def _convert_tools(self, tools: list[Tool]) -> list[dict]:
        """Convert Tool objects to Anthropic API format."""
        return [
            {
                'name': tool.name,
                'description': tool.description,
                'input_schema': tool.parameters
            }
            for tool in tools
        ]

    def _make_request(self, payload: dict) -> dict:
        """Make an HTTP request to the Anthropic API."""
        headers = {
            'Content-Type': 'application/json',
            'anthropic-version': API_VERSION
        }

        if self._api_key:
            headers['x-api-key'] = self._api_key

        request = urllib.request.Request(
            self._api_url,
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

    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse the Anthropic API response into an LLMResponse."""
        content_parts = []
        tool_calls = []

        for block in data.get('content', []):
            if block.get('type') == 'text':
                content_parts.append(block.get('text', ''))
            elif block.get('type') == 'tool_use':
                tool_calls.append(ToolCall(
                    id=block.get('id', str(uuid.uuid4())),
                    name=block.get('name', ''),
                    arguments=block.get('input', {})
                ))

        # Map Anthropic stop reasons to our enum
        stop_reason_map = {
            'end_turn': StopReason.END_TURN,
            'tool_use': StopReason.TOOL_USE,
            'max_tokens': StopReason.MAX_TOKENS,
            'stop_sequence': StopReason.STOP_SEQUENCE
        }
        stop_reason = stop_reason_map.get(
            data.get('stop_reason', ''),
            StopReason.UNKNOWN
        )

        # Parse usage information
        usage_data = data.get('usage', {})
        usage = Usage(
            input_tokens=usage_data.get('input_tokens', 0),
            output_tokens=usage_data.get('output_tokens', 0),
            total_tokens=(
                usage_data.get('input_tokens', 0) +
                usage_data.get('output_tokens', 0)
            )
        )

        return LLMResponse(
            content='\n'.join(content_parts),
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            model=data.get('model', self._model),
            usage=usage,
            raw_response=data
        )

    def chat_stream(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.0,
        **kwargs
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Stream a chat response from Anthropic."""
        payload = {
            'model': self._model,
            'max_tokens': max_tokens,
            'messages': self._convert_messages(messages),
            'stream': True
        }

        if system_prompt:
            payload['system'] = system_prompt

        if temperature > 0:
            payload['temperature'] = temperature

        if tools:
            payload['tools'] = self._convert_tools(tools)

        try:
            yield from self._process_stream(payload)
        except LLMClientError:
            raise
        except Exception as e:
            raise LLMClientError(LLMError(
                message=f"Streaming request failed: {str(e)}",
                provider=self.provider_name
            ))

    def _process_stream(
        self, payload: dict
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Make a streaming request and yield chunks."""
        headers = {
            'Content-Type': 'application/json',
            'anthropic-version': API_VERSION
        }

        if self._api_key:
            headers['x-api-key'] = self._api_key

        request = urllib.request.Request(
            self._api_url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        try:
            response = urllib.request.urlopen(
                request, timeout=120, context=SSL_CONTEXT
            )
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                error_msg = error_data.get(
                    'error', {}
                ).get('message', str(e))
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
                message="Request timed out.",
                code='timeout',
                provider=self.provider_name,
                retryable=True
            ))

        try:
            yield from self._read_anthropic_stream(response)
        finally:
            response.close()

    def _read_anthropic_stream(
        self, response
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Read and parse an Anthropic SSE stream.

        Uses readline() for incremental reading.
        """
        content_parts = []
        tool_calls = []
        current_tool_block = None
        tool_input_json = ''
        stop_reason_str = None
        model_name = self._model
        usage = Usage()
        in_text_block = False

        while True:
            line_bytes = response.readline()
            if not line_bytes:
                break

            line = line_bytes.decode('utf-8', errors='replace').strip()

            if not line or line.startswith(':'):
                continue

            if line.startswith('event: '):
                continue

            if not line.startswith('data: '):
                continue

            try:
                data = json.loads(line[6:])
            except json.JSONDecodeError:
                continue

            event_type = data.get('type', '')

            if event_type == 'message_start':
                msg = data.get('message', {})
                model_name = msg.get('model', self._model)
                u = msg.get('usage', {})
                usage = Usage(
                    input_tokens=u.get('input_tokens', 0),
                    output_tokens=u.get('output_tokens', 0),
                    total_tokens=(
                        u.get('input_tokens', 0) +
                        u.get('output_tokens', 0)
                    )
                )

            elif event_type == 'content_block_start':
                block = data.get('content_block', {})
                if block.get('type') == 'tool_use':
                    current_tool_block = {
                        'id': block.get('id', str(uuid.uuid4())),
                        'name': block.get('name', '')
                    }
                    tool_input_json = ''
                elif block.get('type') == 'text':
                    # Emit a separator between text blocks to
                    # match _parse_response() which joins with '\n'
                    if in_text_block:
                        content_parts.append('\n')
                        yield '\n'
                    in_text_block = True

            elif event_type == 'content_block_delta':
                delta = data.get('delta', {})
                if delta.get('type') == 'text_delta':
                    text = delta.get('text', '')
                    if text:
                        content_parts.append(text)
                        yield text
                elif delta.get('type') == 'input_json_delta':
                    tool_input_json += delta.get(
                        'partial_json', ''
                    )

            elif event_type == 'content_block_stop':
                if current_tool_block is not None:
                    try:
                        arguments = json.loads(
                            tool_input_json
                        ) if tool_input_json else {}
                    except json.JSONDecodeError:
                        arguments = {}
                    tool_calls.append(ToolCall(
                        id=current_tool_block['id'],
                        name=current_tool_block['name'],
                        arguments=arguments
                    ))
                    current_tool_block = None
                    tool_input_json = ''

            elif event_type == 'message_delta':
                delta = data.get('delta', {})
                stop_reason_str = delta.get('stop_reason')
                u = data.get('usage', {})
                if u:
                    usage = Usage(
                        input_tokens=usage.input_tokens,
                        output_tokens=u.get(
                            'output_tokens',
                            usage.output_tokens
                        ),
                        total_tokens=(
                            usage.input_tokens +
                            u.get(
                                'output_tokens',
                                usage.output_tokens
                            )
                        )
                    )

        # Build final response
        stop_reason_map = {
            'end_turn': StopReason.END_TURN,
            'tool_use': StopReason.TOOL_USE,
            'max_tokens': StopReason.MAX_TOKENS,
            'stop_sequence': StopReason.STOP_SEQUENCE
        }
        stop_reason = stop_reason_map.get(
            stop_reason_str or '', StopReason.UNKNOWN
        )

        yield LLMResponse(
            content=''.join(content_parts),
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            model=model_name,
            usage=usage
        )
