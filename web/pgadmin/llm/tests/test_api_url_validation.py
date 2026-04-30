##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import patch
from pgadmin.utils.route import BaseTestGenerator


class ValidateApiUrlTestCase(BaseTestGenerator):
    """Test cases for validate_api_url"""

    scenarios = [
        ('Allowed Anthropic URL', dict(
            url='https://api.anthropic.com/v1/models',
            allowed_urls=[
                'https://api.anthropic.com:443',
                'https://api.openai.com:443',
                'http://localhost:11434',
                'http://localhost:12434',
            ],
            expected=True,
        )),
        ('Allowed OpenAI URL', dict(
            url='https://api.openai.com/v1/models',
            allowed_urls=[
                'https://api.anthropic.com:443',
                'https://api.openai.com:443',
                'http://localhost:11434',
                'http://localhost:12434',
            ],
            expected=True,
        )),
        ('Allowed Ollama URL', dict(
            url='http://localhost:11434/api/tags',
            allowed_urls=[
                'https://api.anthropic.com:443',
                'https://api.openai.com:443',
                'http://localhost:11434',
                'http://localhost:12434',
            ],
            expected=True,
        )),
        ('Allowed Docker URL', dict(
            url='http://localhost:12434/engines/v1/models',
            allowed_urls=[
                'https://api.anthropic.com:443',
                'https://api.openai.com:443',
                'http://localhost:11434',
                'http://localhost:12434',
            ],
            expected=True,
        )),
        ('Non-allowlisted host rejected', dict(
            url='http://evil.com:8080/',
            allowed_urls=[
                'https://api.anthropic.com:443',
                'http://localhost:11434',
            ],
            expected=False,
        )),
        ('Cloud metadata endpoint rejected', dict(
            url='http://169.254.169.254/latest/meta-data/',
            allowed_urls=[
                'https://api.anthropic.com:443',
                'http://localhost:11434',
            ],
            expected=False,
        )),
        ('Internal IP rejected', dict(
            url='http://10.0.0.1:8080/',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expected=False,
        )),
        ('Scheme mismatch rejected', dict(
            url='http://api.anthropic.com/v1/models',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expected=False,
        )),
        ('Port mismatch rejected', dict(
            url='https://api.anthropic.com:8443/v1/models',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expected=False,
        )),
        ('Empty allowlist allows all', dict(
            url='http://anything.example.com:9999/foo',
            allowed_urls=[],
            expected=True,
        )),
        ('Empty URL rejected', dict(
            url='',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expected=False,
        )),
        ('HTTPS default port inferred', dict(
            url='https://api.anthropic.com/v1/models',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expected=True,
        )),
        ('HTTP default port inferred', dict(
            url='http://localhost/api/tags',
            allowed_urls=[
                'http://localhost:80',
            ],
            expected=True,
        )),
        ('Different local port rejected', dict(
            url='http://localhost:22/',
            allowed_urls=[
                'http://localhost:11434',
            ],
            expected=False,
        )),
        ('file:// scheme rejected', dict(
            url='file:///etc/passwd',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expected=False,
        )),
        ('ftp:// scheme rejected', dict(
            url='ftp://evil.com/file',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expected=False,
        )),
        ('Malformed port rejected', dict(
            url='http://localhost:abc/',
            allowed_urls=[
                'http://localhost:11434',
            ],
            expected=False,
        )),
        ('URL without scheme rejected', dict(
            url='localhost:11434/api/tags',
            allowed_urls=[
                'http://localhost:11434',
            ],
            expected=False,
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.utils import validate_api_url

        with patch('config.ALLOWED_LLM_API_URLS', self.allowed_urls):
            result = validate_api_url(self.url)
            self.assertEqual(result, self.expected)


class GetApiUrlPreferenceRejectionTestCase(BaseTestGenerator):
    """Test that get_*_api_url() rejects non-allowlisted preference
    URLs and falls through to system config."""

    scenarios = [
        ('Anthropic: allowed pref URL returned', dict(
            getter='get_anthropic_api_url',
            pref_name='anthropic_api_url',
            pref_value='https://api.anthropic.com/v1',
            config_attr='ANTHROPIC_API_URL',
            config_value='https://fallback.example.com/v1',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expect='https://api.anthropic.com/v1',
        )),
        ('Anthropic: disallowed pref falls to config', dict(
            getter='get_anthropic_api_url',
            pref_name='anthropic_api_url',
            pref_value='http://169.254.169.254/',
            config_attr='ANTHROPIC_API_URL',
            config_value='https://fallback.example.com/v1',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expect='https://fallback.example.com/v1',
        )),
        ('Ollama: disallowed pref falls to config', dict(
            getter='get_ollama_api_url',
            pref_name='ollama_api_url',
            pref_value='http://10.0.0.1:8080/',
            config_attr='OLLAMA_API_URL',
            config_value='http://localhost:11434',
            allowed_urls=[
                'http://localhost:11434',
            ],
            expect='http://localhost:11434',
        )),
        ('OpenAI: disallowed pref falls to config', dict(
            getter='get_openai_api_url',
            pref_name='openai_api_url',
            pref_value='http://evil.com:9999/',
            config_attr='OPENAI_API_URL',
            config_value='',
            allowed_urls=[
                'https://api.openai.com:443',
            ],
            expect='',
        )),
        ('Docker: disallowed pref falls to config', dict(
            getter='get_docker_api_url',
            pref_name='docker_api_url',
            pref_value='http://192.168.1.1:12434/',
            config_attr='DOCKER_API_URL',
            config_value='http://localhost:12434',
            allowed_urls=[
                'http://localhost:12434',
            ],
            expect='http://localhost:12434',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        import pgadmin.llm.utils as llm_utils
        getter_fn = getattr(llm_utils, self.getter)

        with patch(
            'config.ALLOWED_LLM_API_URLS', self.allowed_urls
        ), patch.object(
            llm_utils, '_get_preference_value',
            return_value=self.pref_value
        ), patch(
            'config.' + self.config_attr, self.config_value
        ):
            result = getter_fn()
            self.assertEqual(result, self.expect)
