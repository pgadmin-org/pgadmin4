##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Base LLM client interface and factory."""

from abc import ABC, abstractmethod
from typing import Optional

from pgadmin.llm.models import (
    Message, Tool, LLMResponse, LLMError
)


class LLMClient(ABC):
    """
    Abstract base class for LLM clients.

    All LLM provider implementations should inherit from this class
    and implement the required methods.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of the LLM provider."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the name of the model being used."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the LLM client is properly configured and available.

        Returns:
            True if the client can be used, False otherwise.
        """
        pass

    @abstractmethod
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
        Send a chat request to the LLM.

        Args:
            messages: List of conversation messages.
            tools: Optional list of tools the LLM can use.
            system_prompt: Optional system prompt to set context.
            max_tokens: Maximum tokens in the response.
            temperature: Sampling temperature (0.0 = deterministic).
            **kwargs: Additional provider-specific parameters.

        Returns:
            LLMResponse containing the model's response.

        Raises:
            LLMError: If the request fails.
        """
        pass

    def validate_connection(self) -> tuple[bool, Optional[str]]:
        """
        Validate the connection to the LLM provider.

        Returns:
            Tuple of (success, error_message).
            If success is True, error_message is None.
        """
        try:
            # Try a minimal request to validate the connection
            self.chat(
                messages=[Message.user("Hello")],
                max_tokens=10
            )
            return True, None
        except LLMError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class LLMClientError(Exception):
    """Exception raised for LLM client errors."""

    def __init__(self, error: LLMError):
        self.error = error
        super().__init__(str(error))


def get_llm_client(
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> Optional[LLMClient]:
    """
    Get an LLM client instance for the specified or default provider.

    Args:
        provider: Optional provider name ('anthropic', 'openai', 'ollama',
                  'docker'). If not specified, uses the configured default
                  provider.
        model: Optional model name to use. If not specified, uses the
               configured default model for the provider.

    Returns:
        An LLMClient instance, or None if no provider is configured.

    Raises:
        ValueError: If an invalid provider is specified.
        LLMClientError: If the client cannot be initialized.
    """
    from pgadmin.llm.utils import (
        get_default_provider,
        get_anthropic_api_key, get_anthropic_model,
        get_openai_api_key, get_openai_model,
        get_ollama_api_url, get_ollama_model,
        get_docker_api_url, get_docker_model
    )

    # Determine which provider to use
    if provider is None:
        provider = get_default_provider()
        if provider is None:
            return None

    provider = provider.lower()

    if provider == 'anthropic':
        from pgadmin.llm.providers.anthropic import AnthropicClient
        api_key = get_anthropic_api_key()
        if not api_key:
            raise LLMClientError(LLMError(
                message="Anthropic API key not configured",
                provider="anthropic"
            ))
        model_name = model or get_anthropic_model()
        return AnthropicClient(api_key=api_key, model=model_name)

    elif provider == 'openai':
        from pgadmin.llm.providers.openai import OpenAIClient
        api_key = get_openai_api_key()
        if not api_key:
            raise LLMClientError(LLMError(
                message="OpenAI API key not configured",
                provider="openai"
            ))
        model_name = model or get_openai_model()
        return OpenAIClient(api_key=api_key, model=model_name)

    elif provider == 'ollama':
        from pgadmin.llm.providers.ollama import OllamaClient
        api_url = get_ollama_api_url()
        if not api_url:
            raise LLMClientError(LLMError(
                message="Ollama API URL not configured",
                provider="ollama"
            ))
        model_name = model or get_ollama_model()
        return OllamaClient(api_url=api_url, model=model_name)

    elif provider == 'docker':
        from pgadmin.llm.providers.docker import DockerClient
        api_url = get_docker_api_url()
        if not api_url:
            raise LLMClientError(LLMError(
                message="Docker Model Runner API URL not configured",
                provider="docker"
            ))
        model_name = model or get_docker_model()
        return DockerClient(api_url=api_url, model=model_name)

    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


def is_llm_available() -> bool:
    """
    Check if an LLM client is available and properly configured.

    Returns:
        True if an LLM client can be created, False otherwise.
    """
    try:
        client = get_llm_client()
        return client is not None and client.is_available()
    except (LLMClientError, ValueError):
        return False
