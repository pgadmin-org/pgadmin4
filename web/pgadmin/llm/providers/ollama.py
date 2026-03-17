##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Ollama LLM client implementation."""

import json
import urllib.parse
import urllib.request
import urllib.error
from collections.abc import Generator
from typing import Optional, Union
import uuid

from pgadmin.llm.client import LLMClient, LLMClientError
from pgadmin.llm.models import (
    Message, Tool, ToolCall, LLMResponse, LLMError,
    Role, StopReason, Usage
)


# Default configuration
DEFAULT_API_URL = 'http://localhost:11434'
DEFAULT_MODEL = 'llama3.2'


class OllamaClient(LLMClient):
    """
    Ollama API client.

    Implements the LLMClient interface for locally-hosted Ollama models.
    Uses the Ollama chat API with tool support.
    """

    def __init__(self, api_url: str, model: Optional[str] = None):
        """
        Initialize the Ollama client.

        Args:
            api_url: The Ollama API base URL (e.g., http://localhost:11434).
            model: Optional model name. Defaults to llama3.2.
        """
        self._api_url = api_url.rstrip('/')
        self._model = model or DEFAULT_MODEL

        # Validate URL scheme to prevent unsafe access
        parsed = urllib.parse.urlparse(self._api_url)
        if parsed.scheme not in ('http', 'https'):
            raise ValueError(
                f"Ollama URL must use http or https scheme, "
                f"got: {parsed.scheme}"
            )

    @property
    def provider_name(self) -> str:
        return 'ollama'

    @property
    def model_name(self) -> str:
        return self._model

    def is_available(self) -> bool:
        """Check if Ollama is running and the model is available."""
        if not self._api_url:
            return False

        try:
            # Check if Ollama is running
            req = urllib.request.Request(f'{self._api_url}/api/tags')
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                # Check if our model is available
                models = [m.get('name', '') for m in data.get('models', [])]
                # Model names might include tags like ':latest'
                return any(
                    self._model == m or self._model == m.split(':')[0]
                    for m in models
                )
        except Exception:
            return False

    def chat(
        self,
        messages: list[Message],
        tools: Optional[list[Tool]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """
        Send a chat request to Ollama.

        Args:
            messages: List of conversation messages.
            tools: Optional list of tools the model can use.
            system_prompt: Optional system prompt.
            max_tokens: Maximum tokens in response (num_predict in Ollama).
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
            'stream': False,
            'options': {
                'num_predict': max_tokens,
            }
        }

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
        """Convert Message objects to Ollama API format."""
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
                    'content': msg.content or ''
                }

                # Add tool calls if present
                if msg.tool_calls:
                    message['tool_calls'] = [
                        {
                            'function': {
                                'name': tc.name,
                                'arguments': tc.arguments
                            }
                        }
                        for tc in msg.tool_calls
                    ]

                result.append(message)

            elif msg.role == Role.TOOL:
                # Tool results in Ollama
                for tr in msg.tool_results:
                    result.append({
                        'role': 'tool',
                        'content': tr.content
                    })

        return result

    def _convert_tools(self, tools: list[Tool]) -> list[dict]:
        """Convert Tool objects to Ollama API format."""
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
        """Make an HTTP request to the Ollama API."""
        url = f'{self._api_url}/api/chat'

        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                error_msg = error_data.get('error', str(e))
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
                message=f"Cannot connect to Ollama: {e.reason}",
                provider=self.provider_name,
                retryable=True
            ))

    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse the Ollama API response into an LLMResponse."""
        message = data.get('message', {})
        content = message.get('content', '')
        tool_calls = []

        # Parse tool calls if present (native Ollama format)
        for tc in message.get('tool_calls', []):
            func = tc.get('function', {})
            arguments = func.get('arguments', {})

            # Arguments might be a string that needs parsing
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {}

            tool_calls.append(ToolCall(
                id=str(uuid.uuid4()),  # Ollama doesn't provide IDs
                name=func.get('name', ''),
                arguments=arguments
            ))

        # Determine stop reason
        done_reason = data.get('done_reason', '')
        if tool_calls:
            stop_reason = StopReason.TOOL_USE
        elif done_reason == 'stop':
            stop_reason = StopReason.END_TURN
        elif done_reason == 'length':
            stop_reason = StopReason.MAX_TOKENS
        else:
            stop_reason = StopReason.UNKNOWN

        # Parse usage information
        # Ollama provides eval_count (output) and prompt_eval_count (input)
        usage = Usage(
            input_tokens=data.get('prompt_eval_count', 0),
            output_tokens=data.get('eval_count', 0),
            total_tokens=(
                data.get('prompt_eval_count', 0) +
                data.get('eval_count', 0)
            )
        )

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
        """Stream a chat response from Ollama."""
        converted_messages = self._convert_messages(messages)

        if system_prompt:
            converted_messages.insert(0, {
                'role': 'system',
                'content': system_prompt
            })

        payload = {
            'model': self._model,
            'messages': converted_messages,
            'stream': True,
            'options': {
                'num_predict': max_tokens,
                'temperature': temperature
            }
        }

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
        url = f'{self._api_url}/api/chat'

        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            response = urllib.request.urlopen(request, timeout=300)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                error_msg = error_data.get('error', str(e))
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
                message=f"Cannot connect to Ollama: {e.reason}",
                provider=self.provider_name,
                retryable=True
            ))

        try:
            yield from self._read_ollama_stream(response)
        finally:
            response.close()

    def _read_ollama_stream(
        self, response
    ) -> Generator[Union[str, LLMResponse], None, None]:
        """Read and parse an Ollama NDJSON stream.

        Uses readline() for incremental reading.
        """
        content_parts = []
        tool_calls = []
        done_reason = None
        model_name = self._model
        input_tokens = 0
        output_tokens = 0
        final_data = None

        while True:
            line_bytes = response.readline()
            if not line_bytes:
                break

            line = line_bytes.decode('utf-8', errors='replace').strip()

            if not line:
                continue

            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue

            msg = data.get('message', {})

            # Text content
            text = msg.get('content', '')
            if text:
                content_parts.append(text)
                yield text

            # Tool calls (in final message)
            for tc in msg.get('tool_calls', []):
                func = tc.get('function', {})
                arguments = func.get('arguments', {})
                if isinstance(arguments, str):
                    try:
                        arguments = json.loads(arguments)
                    except json.JSONDecodeError:
                        arguments = {}
                tool_calls.append(ToolCall(
                    id=str(uuid.uuid4()),
                    name=func.get('name', ''),
                    arguments=arguments
                ))

            if data.get('done'):
                final_data = data
                done_reason = data.get('done_reason', '')
                model_name = data.get('model', self._model)
                input_tokens = data.get('prompt_eval_count', 0)
                output_tokens = data.get('eval_count', 0)

        # Ensure the stream completed with a terminal done frame;
        # truncated content from a dropped connection is unreliable.
        if final_data is None:
            raise LLMClientError(LLMError(
                message="Ollama stream ended before terminal done frame",
                provider=self.provider_name,
                retryable=True
            ))

        content = ''.join(content_parts)

        if tool_calls:
            stop_reason = StopReason.TOOL_USE
        elif done_reason == 'stop':
            stop_reason = StopReason.END_TURN
        elif done_reason == 'length':
            stop_reason = StopReason.MAX_TOKENS
        else:
            stop_reason = StopReason.UNKNOWN

        yield LLMResponse(
            content=content,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            model=model_name,
            usage=Usage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens
            ),
            raw_response=final_data
        )
