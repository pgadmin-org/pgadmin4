##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""OpenAI GPT LLM client implementation."""

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
DEFAULT_MODEL = 'gpt-4o'

# Default API base URL
DEFAULT_API_BASE_URL = 'https://api.openai.com/v1'


class OpenAIClient(LLMClient):
    """
    OpenAI GPT API client.

    Implements the LLMClient interface for OpenAI's GPT models
    and any OpenAI-compatible API endpoint. Supports both the
    Chat Completions API (/v1/chat/completions) and the Responses
    API (/v1/responses) for newer models that require it.
    """

    def __init__(self, api_key: Optional[str] = None,
                 model: Optional[str] = None,
                 api_url: Optional[str] = None):
        """
        Initialize the OpenAI client.

        Args:
            api_key: The OpenAI API key. Optional when using a custom
                     API URL with a provider that does not require
                     authentication.
            model: Optional model name. Defaults to gpt-4o.
            api_url: Optional custom API base URL. Defaults to
                     https://api.openai.com/v1.
        """
        self._api_key = api_key or ''
        self._model = model or DEFAULT_MODEL
        base_url = (api_url or DEFAULT_API_BASE_URL).rstrip('/')
        # Strip known endpoint suffixes in case the user provided a full URL
        for suffix in ('/chat/completions', '/responses'):
            if base_url.endswith(suffix):
                base_url = base_url[:-len(suffix)].rstrip('/')
                break
        self._base_url = base_url
        self._use_responses_api = False

    @property
    def _api_url(self) -> str:
        """Return the appropriate API endpoint URL."""
        if self._use_responses_api:
            return f'{self._base_url}/responses'
        return f'{self._base_url}/chat/completions'

    @property
    def provider_name(self) -> str:
        return 'openai'

    @property
    def model_name(self) -> str:
        return self._model

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        # API key is required for the default OpenAI endpoint, but optional
        # for custom endpoints (e.g., local LLM servers).
        if self._base_url.rstrip('/').startswith(
            DEFAULT_API_BASE_URL.rstrip('/')
        ):
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
        Send a chat request to OpenAI.

        Args:
            messages: List of conversation messages.
            tools: Optional list of tools the model can use.
            system_prompt: Optional system prompt.
            max_tokens: Maximum tokens in response.
            **kwargs: Additional parameters.

        Returns:
            LLMResponse containing the model's response.

        Raises:
            LLMClientError: If the request fails.
        """
        if self._use_responses_api:
            return self._chat_responses(
                messages, tools, system_prompt, max_tokens
            )

        # Try Chat Completions API first
        payload = self._build_chat_payload(
            messages, tools, system_prompt, max_tokens
        )

        try:
            response_data = self._make_request(payload)
            return self._parse_response(response_data)
        except LLMClientError as e:
            if self._should_use_responses_api(e):
                self._use_responses_api = True
                return self._chat_responses(
                    messages, tools, system_prompt, max_tokens
                )
            raise
        except Exception as e:
            raise LLMClientError(LLMError(
                message=f"Request failed: {e!s}",
                provider=self.provider_name
            )) from e

    def _chat_responses(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        """Send a chat request using the Responses API."""
        payload = self._build_responses_payload(
            messages, tools, system_prompt, max_tokens
        )

        try:
            response_data = self._make_request(payload)
            return self._parse_responses_response(response_data)
        except LLMClientError:
            raise
        except Exception as e:
            raise LLMClientError(LLMError(
                message=f"Request failed: {e!s}",
                provider=self.provider_name
            )) from e

    def _should_use_responses_api(self, error: LLMClientError) -> bool:
        """Check if the error indicates we should use the Responses API."""
        error_msg = str(error).lower()
        return ('v1/responses' in error_msg or
                'not supported in the v1/chat/completions' in error_msg or
                'not a chat model' in error_msg)

    def _build_chat_payload(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]],
        system_prompt: Optional[str],
        max_tokens: int
    ) -> dict:
        """Build payload for the Chat Completions API."""
        converted_messages = self._convert_messages(messages)

        if system_prompt:
            converted_messages.insert(0, {
                'role': 'system',
                'content': system_prompt
            })

        payload = {
            'model': self._model,
            'messages': converted_messages,
            'max_completion_tokens': max_tokens,
        }

        if tools:
            payload['tools'] = self._convert_tools(tools)
            payload['tool_choice'] = 'auto'

        return payload

    def _build_responses_payload(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]],
        system_prompt: Optional[str],
        max_tokens: int
    ) -> dict:
        """Build payload for the Responses API."""
        input_items = self._convert_messages_responses(messages)

        payload = {
            'model': self._model,
            'input': input_items,
            'max_output_tokens': max_tokens,
        }

        if system_prompt:
            payload['instructions'] = system_prompt

        if tools:
            payload['tools'] = self._convert_tools_responses(tools)
            payload['tool_choice'] = 'auto'

        return payload

    def _convert_messages(self, messages: list[Message]) -> list[dict]:
        """Convert Message objects to OpenAI Chat Completions API format."""
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

    def _convert_messages_responses(
        self, messages: list[Message]
    ) -> list[dict]:
        """Convert Message objects to OpenAI Responses API format."""
        result = []

        for msg in messages:
            if msg.role == Role.SYSTEM:
                result.append({
                    'role': 'developer',
                    'content': msg.content
                })

            elif msg.role == Role.USER:
                result.append({
                    'role': 'user',
                    'content': msg.content
                })

            elif msg.role == Role.ASSISTANT:
                if msg.content:
                    result.append({
                        'role': 'assistant',
                        'content': msg.content
                    })
                # Tool calls are separate items in Responses API
                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        result.append({
                            'type': 'function_call',
                            'call_id': tc.id,
                            'name': tc.name,
                            'arguments': json.dumps(tc.arguments)
                        })

            elif msg.role == Role.TOOL:
                for tr in msg.tool_results:
                    result.append({
                        'type': 'function_call_output',
                        'call_id': tr.tool_call_id,
                        'output': tr.content
                    })

        return result

    def _convert_tools(self, tools: list[Tool]) -> list[dict]:
        """Convert Tool objects to Chat Completions API format."""
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

    def _convert_tools_responses(self, tools: list[Tool]) -> list[dict]:
        """Convert Tool objects to Responses API format."""
        return [
            {
                'type': 'function',
                'name': tool.name,
                'description': tool.description,
                'parameters': tool.parameters
            }
            for tool in tools
        ]

    def _make_request(self, payload: dict) -> dict:
        """Make an HTTP request to the OpenAI API."""
        headers = {
            'Content-Type': 'application/json',
        }

        if self._api_key:
            headers['Authorization'] = f'Bearer {self._api_key}'

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
        except socket.timeout:
            raise LLMClientError(LLMError(
                message="Request timed out. The request may be too large "
                        "or the server is slow to respond.",
                code='timeout',
                provider=self.provider_name,
                retryable=True
            ))

    def _raise_max_tokens_error(self, input_tokens: int):
        """Raise an error when a response is truncated due to token limit."""
        raise LLMClientError(LLMError(
            message=f'Response truncated due to token limit '
                    f'(input: {input_tokens} tokens). '
                    f'The request is too large for model '
                    f'{self._model}. '
                    f'Try using a model with a larger context '
                    f'window, or analyze a smaller scope (e.g., a '
                    f'specific schema instead of the entire '
                    f'database).',
            code='max_tokens',
            provider=self.provider_name,
            retryable=False
        ))

    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse the Chat Completions API response into an LLMResponse."""
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
                self._raise_max_tokens_error(usage.input_tokens)
            elif finish_reason and finish_reason not in ('stop', 'tool_calls'):
                raise LLMClientError(LLMError(
                    message=(f'Empty response with finish reason: '
                             f'{finish_reason}'),
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

    def _parse_responses_response(self, data: dict) -> LLMResponse:
        """Parse the Responses API response into an LLMResponse."""
        # Check for API-level errors
        if 'error' in data:
            error_info = data['error']
            raise LLMClientError(LLMError(
                message=error_info.get('message', 'Unknown API error'),
                code=error_info.get('code', 'unknown'),
                provider=self.provider_name,
                retryable=False
            ))

        output = data.get('output', [])
        content = ''
        tool_calls = []

        for item in output:
            item_type = item.get('type', '')

            if item_type == 'message':
                for part in item.get('content', []):
                    if part.get('type') == 'output_text':
                        content += part.get('text', '')

            elif item_type == 'function_call':
                try:
                    arguments = json.loads(
                        item.get('arguments', '{}')
                    )
                except json.JSONDecodeError:
                    arguments = {}

                tool_calls.append(ToolCall(
                    id=item.get('call_id', str(uuid.uuid4())),
                    name=item.get('name', ''),
                    arguments=arguments
                ))

        # Determine stop reason from status and incomplete_details
        status = data.get('status', '')
        if tool_calls:
            stop_reason = StopReason.TOOL_USE
        elif status == 'completed':
            stop_reason = StopReason.END_TURN
        elif status == 'incomplete':
            reason = data.get(
                'incomplete_details', {}
            ).get('reason', '')
            if reason == 'content_filter':
                stop_reason = StopReason.STOP_SEQUENCE
            elif reason == 'max_output_tokens':
                stop_reason = StopReason.MAX_TOKENS
            else:
                stop_reason = StopReason.MAX_TOKENS
        else:
            stop_reason = StopReason.UNKNOWN

        # Parse usage information
        usage_data = data.get('usage', {})
        usage = Usage(
            input_tokens=usage_data.get('input_tokens', 0),
            output_tokens=usage_data.get('output_tokens', 0),
            total_tokens=usage_data.get('total_tokens', 0)
        )

        # Check for problematic responses
        if not content and not tool_calls:
            if stop_reason == StopReason.MAX_TOKENS:
                self._raise_max_tokens_error(usage.input_tokens)
            elif stop_reason == StopReason.STOP_SEQUENCE:
                raise LLMClientError(LLMError(
                    message='Response blocked by content filter.',
                    code='content_filter',
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

    def chat_stream(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.0,
        **kwargs
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Stream a chat response from OpenAI."""
        if self._use_responses_api:
            payload = self._build_responses_payload(
                messages, tools, system_prompt, max_tokens
            )
            payload['stream'] = True
            try:
                yield from self._process_stream(payload)
            except LLMClientError:
                raise
            except Exception as e:
                raise LLMClientError(LLMError(
                    message=f"Streaming request failed: {e!s}",
                    provider=self.provider_name
                )) from e
            return

        # Try Chat Completions API first
        payload = self._build_chat_payload(
            messages, tools, system_prompt, max_tokens
        )
        payload['stream'] = True
        payload['stream_options'] = {'include_usage': True}

        try:
            yield from self._process_stream(payload)
        except LLMClientError as e:
            if self._should_use_responses_api(e):
                self._use_responses_api = True
                payload = self._build_responses_payload(
                    messages, tools, system_prompt, max_tokens
                )
                payload['stream'] = True
                yield from self._process_stream(payload)
            else:
                raise
        except Exception as e:
            raise LLMClientError(LLMError(
                message=f"Streaming request failed: {e!s}",
                provider=self.provider_name
            )) from e

    def _process_stream(
        self, payload: dict
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Make a streaming request and yield chunks."""
        headers = {
            'Content-Type': 'application/json',
        }

        if self._api_key:
            headers['Authorization'] = f'Bearer {self._api_key}'

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
            if self._use_responses_api:
                yield from self._read_responses_stream(response)
            else:
                yield from self._read_openai_stream(response)
        finally:
            response.close()

    def _read_openai_stream(
        self, response
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Read and parse an OpenAI Chat Completions SSE stream.

        Uses readline() for incremental reading -- it returns as soon
        as a complete line arrives from the server, unlike read()
        which blocks until a buffer fills up.
        """
        content_parts = []
        # tool_calls_data: {index: {id, name, arguments_str}}
        tool_calls_data = {}
        finish_reason = None
        model_name = self._model
        usage = Usage()

        while True:
            line_bytes = response.readline()
            if not line_bytes:
                break

            line = line_bytes.decode('utf-8', errors='replace').strip()

            if not line or line.startswith(':'):
                continue

            if line == 'data: [DONE]':
                continue

            if not line.startswith('data: '):
                continue

            try:
                data = json.loads(line[6:])
            except json.JSONDecodeError:
                continue

            # Extract usage from the final chunk
            if 'usage' in data and data['usage']:
                u = data['usage']
                usage = Usage(
                    input_tokens=u.get('prompt_tokens', 0),
                    output_tokens=u.get('completion_tokens', 0),
                    total_tokens=u.get('total_tokens', 0)
                )

            if 'model' in data:
                model_name = data['model']

            choices = data.get('choices', [])
            if not choices:
                continue

            choice = choices[0]
            delta = choice.get('delta', {})

            if choice.get('finish_reason'):
                finish_reason = choice['finish_reason']

            # Text content
            text_chunk = delta.get('content')
            if text_chunk:
                content_parts.append(text_chunk)
                yield text_chunk

            # Tool calls (accumulate)
            for tc_delta in delta.get('tool_calls', []):
                idx = tc_delta.get('index', 0)
                if idx not in tool_calls_data:
                    tool_calls_data[idx] = {
                        'id': '', 'name': '', 'arguments': ''
                    }
                tc = tool_calls_data[idx]
                if 'id' in tc_delta:
                    tc['id'] = tc_delta['id']
                func = tc_delta.get('function', {})
                if 'name' in func:
                    tc['name'] = func['name']
                if 'arguments' in func:
                    tc['arguments'] += func['arguments']

        # Build final response
        content = ''.join(content_parts)
        tool_calls = []
        for idx in sorted(tool_calls_data.keys()):
            tc = tool_calls_data[idx]
            try:
                arguments = json.loads(tc['arguments']) \
                    if tc['arguments'] else {}
            except json.JSONDecodeError:
                arguments = {}
            tool_calls.append(ToolCall(
                id=tc['id'] or str(uuid.uuid4()),
                name=tc['name'],
                arguments=arguments
            ))

        stop_reason_map = {
            'stop': StopReason.END_TURN,
            'tool_calls': StopReason.TOOL_USE,
            'length': StopReason.MAX_TOKENS,
            'content_filter': StopReason.STOP_SEQUENCE
        }
        stop_reason = stop_reason_map.get(
            finish_reason or '', StopReason.UNKNOWN
        )

        if not content and not tool_calls:
            raise LLMClientError(LLMError(
                message='No response content returned from API',
                provider=self.provider_name,
                retryable=False
            ))

        yield LLMResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            model=model_name,
            usage=usage
        )

    def _read_responses_stream(
        self, response
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Read and parse an OpenAI Responses API SSE stream.

        The Responses API uses named events with types like
        response.output_text.delta for text streaming and
        response.completed for the final response.
        """
        content_parts = []
        # tool_calls_data: {call_id: {name, arguments}}
        tool_calls_data = {}
        model_name = self._model
        usage = Usage()
        resp_status = ''
        resp_incomplete = {}

        while True:
            line_bytes = response.readline()
            if not line_bytes:
                break

            line = line_bytes.decode('utf-8', errors='replace').strip()

            if not line or line.startswith(':'):
                continue

            # Skip event type lines - we identify events by data type field
            if line.startswith('event: '):
                continue

            if not line.startswith('data: '):
                continue

            try:
                data = json.loads(line[6:])
            except json.JSONDecodeError:
                continue

            event_type = data.get('type', '')

            if event_type == 'response.output_text.delta':
                delta = data.get('delta', '')
                if delta:
                    content_parts.append(delta)
                    yield delta

            elif event_type == 'response.output_item.added':
                item = data.get('item', {})
                if item.get('type') == 'function_call':
                    call_id = item.get('call_id', '')
                    tool_calls_data[call_id] = {
                        'name': item.get('name', ''),
                        'arguments': ''
                    }

            elif event_type == 'response.function_call_arguments.delta':
                call_id = data.get('call_id', '')
                if call_id not in tool_calls_data:
                    tool_calls_data[call_id] = {
                        'name': '', 'arguments': ''
                    }
                tool_calls_data[call_id]['arguments'] += data.get(
                    'delta', ''
                )

            elif event_type == 'response.completed':
                resp = data.get('response', {})
                u = resp.get('usage', {})
                usage = Usage(
                    input_tokens=u.get('input_tokens', 0),
                    output_tokens=u.get('output_tokens', 0),
                    total_tokens=u.get('total_tokens', 0)
                )
                model_name = resp.get('model', model_name)
                resp_status = resp.get('status', '')
                resp_incomplete = resp.get('incomplete_details', {})

        # Build final response
        content = ''.join(content_parts)
        tool_calls = []
        for call_id, tc in tool_calls_data.items():
            try:
                arguments = json.loads(tc['arguments']) \
                    if tc['arguments'] else {}
            except json.JSONDecodeError:
                arguments = {}
            tool_calls.append(ToolCall(
                id=call_id or str(uuid.uuid4()),
                name=tc['name'],
                arguments=arguments
            ))

        # Determine stop reason from final response status
        if tool_calls:
            stop_reason = StopReason.TOOL_USE
        elif resp_status == 'incomplete':
            reason = resp_incomplete.get('reason', '') \
                if resp_incomplete else ''
            if reason == 'content_filter':
                stop_reason = StopReason.STOP_SEQUENCE
            else:
                stop_reason = StopReason.MAX_TOKENS
        elif content:
            stop_reason = StopReason.END_TURN
        else:
            stop_reason = StopReason.UNKNOWN

        if not content and not tool_calls:
            raise LLMClientError(LLMError(
                message='No response content returned from API',
                provider=self.provider_name,
                retryable=False
            ))

        yield LLMResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            model=model_name,
            usage=usage
        )
