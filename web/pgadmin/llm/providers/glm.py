##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""GLM (Z.ai) LLM client implementation."""

from typing import Optional
from urllib.parse import urlparse

from pgadmin.llm.providers.openai import OpenAIClient


# Default API base URL. This is the Z.ai open platform endpoint. Users on a
# Coding Plan subscription or on Zhipu's China platform set their own URL in
# preferences (https://api.z.ai/api/coding/paas/v4 and
# https://open.bigmodel.cn/api/paas/v4 respectively).
DEFAULT_API_BASE_URL = 'https://api.z.ai/api/paas/v4'

# Hosts that always require an API key. Any other host is assumed to be a
# self-hosted or proxied GLM-compatible endpoint, which may not need one.
AUTHENTICATED_HOSTS = ('api.z.ai')


class GLMClient(OpenAIClient):
    """
    GLM API client.

    Implements the LLMClient interface for Z.ai GLM models using the
    OpenAI-compatible API format.

    Deliberately has no default model: the models on offer differ between
    the Z.ai open platform, a Coding Plan subscription and Zhipu's China
    platform, so guessing one yields an opaque 404 rather than a useful
    error. Callers must supply a model.
    """

    DEFAULT_API_BASE_URL = DEFAULT_API_BASE_URL

    def __init__(self, api_key: Optional[str] = None,
                 model: Optional[str] = None,
                 api_url: Optional[str] = None):
        """
        Initialize the GLM client.

        Args:
            api_key: The Z.ai API key.
            model: The model name. Required; there is no default.
            api_url: Optional custom API base URL. Defaults to
                     https://api.z.ai/api/paas/v4.
        """
        super().__init__(
            api_key=api_key,
            model=model,
            api_url=api_url or DEFAULT_API_BASE_URL
        )
        # OpenAIClient falls back to its own default model ('gpt-4o') when
        # none is given. That would silently send an OpenAI model name to
        # Z.ai, so clear it: is_available() then reports the client as
        # unusable and get_llm_client() raises a message naming the
        # preference to set.
        self._model = model or ''

    @property
    def provider_name(self) -> str:
        return 'glm'

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        if not self._model:
            return False

        host = (urlparse(self._base_url).hostname or '').lower()
        if host in AUTHENTICATED_HOSTS:
            return bool(self._api_key)
        return True

    def _build_chat_payload(self, messages, tools, system_prompt,
                            max_tokens) -> dict:
        """
        Build payload for the Chat Completions API.

        Z.ai documents ``max_tokens``. It ignores OpenAI's newer
        ``max_completion_tokens`` outright, which silently removes the
        output limit rather than failing.
        """
        payload = super()._build_chat_payload(
            messages, tools, system_prompt, max_tokens
        )
        payload['max_tokens'] = payload.pop(
            'max_completion_tokens', max_tokens
        )
        return payload

    def _should_use_responses_api(self, error) -> bool:
        """
        Never fall back to the Responses API.

        Z.ai exposes no ``/responses`` endpoint. Without this, an unrelated
        error whose text happens to match the inherited heuristic would
        switch the client onto a path that cannot work, masking the real
        failure.
        """
        return False
