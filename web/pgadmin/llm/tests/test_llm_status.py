##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from unittest.mock import patch, MagicMock, mock_open
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils


class LLMStatusTestCase(BaseTestGenerator):
    """Test cases for LLM status endpoint"""

    scenarios = [
        ('LLM Status - Disabled', dict(
            url='/llm/status',
            provider_enabled=False,
            expected_enabled=False
        )),
        ('LLM Status - Anthropic Enabled', dict(
            url='/llm/status',
            provider_enabled=True,
            expected_enabled=True,
            provider_name='anthropic'
        )),
        ('LLM Status - OpenAI Enabled', dict(
            url='/llm/status',
            provider_enabled=True,
            expected_enabled=True,
            provider_name='openai'
        )),
        ('LLM Status - Ollama Enabled', dict(
            url='/llm/status',
            provider_enabled=True,
            expected_enabled=True,
            provider_name='ollama'
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test LLM status endpoint returns correct availability status"""
        provider_value = self.provider_name if (
            self.provider_enabled and hasattr(self, 'provider_name')
        ) else None

        with patch('pgadmin.llm.utils.is_llm_enabled') as mock_enabled, \
             patch('pgadmin.llm.utils.is_llm_enabled_system') as mock_system, \
             patch('pgadmin.llm.utils.get_default_provider') as mock_provider, \
             patch('pgadmin.authenticate.mfa.utils.mfa_required', lambda f: f):

            mock_enabled.return_value = self.expected_enabled
            mock_system.return_value = self.provider_enabled
            mock_provider.return_value = provider_value

            response = self.tester.get(
                self.url,
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertEqual(data['data']['enabled'], self.expected_enabled)

            if self.expected_enabled and hasattr(self, 'provider_name'):
                self.assertEqual(data['data']['provider'], self.provider_name)
