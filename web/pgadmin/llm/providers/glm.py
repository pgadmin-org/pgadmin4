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

from pgadmin.llm.providers.openai import OpenAIClient


class GLMClient(OpenAIClient):
    """
    GLM API client.

    Implements the LLMClient interface for Z.ai GLM models using the
    OpenAI-compatible API format.
    """

    DEFAULT_MODEL = 'glm-4.5'
    DEFAULT_API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'

    def __init__(self, api_key: Optional[str] = None,
                 model: Optional[str] = None,
                 api_url: Optional[str] = None):
        """
        Initialize the GLM client.

        Args:
            api_key: The Z.ai API key.
            model: Optional model name. Defaults to glm-4.5.
            api_url: Optional custom API base URL. Defaults to
                     https://open.bigmodel.cn/api/paas/v4.
        """
        super().__init__(
            api_key=api_key,
            model=model or self.DEFAULT_MODEL,
            api_url=api_url or self.DEFAULT_API_BASE_URL
        )

    @property
    def provider_name(self) -> str:
        return 'glm'

    def is_available(self) -> bool:
        """Check if the client is properly configured."""
        if self._base_url.rstrip('/').startswith(
            self.DEFAULT_API_BASE_URL.rstrip('/')
        ):
            return bool(self._api_key)
        return True
