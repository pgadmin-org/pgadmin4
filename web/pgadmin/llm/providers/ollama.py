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
import re
import urllib.request
import urllib.error
from typing import Optional
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
        temperature: float = 0.0,
        **kwargs
    ) -> LLMResponse:
        """
        Send a chat request to Ollama.

        Args:
            messages: List of conversation messages.
            tools: Optional list of tools the model can use.
            system_prompt: Optional system prompt.
            max_tokens: Maximum tokens in response (num_predict in Ollama).
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
            'stream': False,
            'options': {
                'num_predict': max_tokens,
                'temperature': temperature
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
                retryable=e.code in (500, 502, 503, 504)
            ))
        except urllib.error.URLError as e:
            raise LLMClientError(LLMError(
                message=f"Cannot connect to Ollama: {e.reason}",
                provider=self.provider_name,
                retryable=True
            ))

    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse the Ollama API response into an LLMResponse."""
        import re

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
