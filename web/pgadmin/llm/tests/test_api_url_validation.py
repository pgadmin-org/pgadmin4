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
        ('Wildcard port: localhost:* matches arbitrary port', dict(
            url='http://localhost:4000/v1/chat/completions',
            allowed_urls=[
                'http://localhost:*',
            ],
            expected=True,
        )),
        ('Wildcard port: same host, default 80 also matches', dict(
            url='http://localhost/v1',
            allowed_urls=[
                'http://localhost:*',
            ],
            expected=True,
        )),
        ('Wildcard port: 127.0.0.1:* matches', dict(
            url='http://127.0.0.1:8080/foo',
            allowed_urls=[
                'http://127.0.0.1:*',
            ],
            expected=True,
        )),
        ('Wildcard port: IPv6 loopback matches', dict(
            url='http://[::1]:8000/foo',
            allowed_urls=[
                'http://[::1]:*',
            ],
            expected=True,
        )),
        ('Wildcard port does NOT cover other hosts', dict(
            # Cloud metadata endpoint stays blocked even with
            # localhost:* in the allowlist.
            url='http://169.254.169.254/latest/meta-data/',
            allowed_urls=[
                'http://localhost:*',
                'http://127.0.0.1:*',
            ],
            expected=False,
        )),
        ('Wildcard port: scheme still enforced', dict(
            url='https://localhost:8443/v1',
            allowed_urls=[
                'http://localhost:*',
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


class GetApiUrlResolutionTestCase(BaseTestGenerator):
    """Test the get_*_api_url() resolution rules.

    Contract (post-#9936):
      - Pref URL set and allowed   -> pref URL returned
      - Pref URL set but rejected  -> '' returned (NO fallback to
        admin default; otherwise the user's request would be
        silently routed to a different provider)
      - Pref URL unset             -> admin's config URL returned
    """

    scenarios = [
        ('Anthropic: allowed pref URL returned', dict(
            getter='get_anthropic_api_url',
            pref_value='https://api.anthropic.com/v1',
            config_attr='ANTHROPIC_API_URL',
            config_value='https://fallback.example.com/v1',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expect='https://api.anthropic.com/v1',
        )),
        ('Anthropic: rejected pref returns "" (no fallback)', dict(
            getter='get_anthropic_api_url',
            pref_value='http://169.254.169.254/',
            config_attr='ANTHROPIC_API_URL',
            config_value='https://fallback.example.com/v1',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expect='',
        )),
        ('Anthropic: unset pref returns admin config', dict(
            getter='get_anthropic_api_url',
            pref_value=None,
            config_attr='ANTHROPIC_API_URL',
            config_value='https://fallback.example.com/v1',
            allowed_urls=[
                'https://api.anthropic.com:443',
            ],
            expect='https://fallback.example.com/v1',
        )),
        ('Ollama: rejected pref returns "" (no fallback)', dict(
            getter='get_ollama_api_url',
            pref_value='http://10.0.0.1:8080/',
            config_attr='OLLAMA_API_URL',
            config_value='http://localhost:11434',
            allowed_urls=[
                'http://localhost:11434',
            ],
            expect='',
        )),
        ('OpenAI: rejected pref returns "" (no fallback)', dict(
            getter='get_openai_api_url',
            pref_value='http://evil.com:9999/',
            config_attr='OPENAI_API_URL',
            config_value='https://api.openai.com',
            allowed_urls=[
                'https://api.openai.com:443',
            ],
            expect='',
        )),
        ('Docker: rejected pref returns "" (no fallback)', dict(
            getter='get_docker_api_url',
            pref_value='http://192.168.1.1:12434/',
            config_attr='DOCKER_API_URL',
            config_value='http://localhost:12434',
            allowed_urls=[
                'http://localhost:12434',
            ],
            expect='',
        )),
        ('LiteLLM-style pref on localhost:* allowlist', dict(
            getter='get_openai_api_url',
            pref_value='http://localhost:4000/v1',
            config_attr='OPENAI_API_URL',
            config_value='',
            allowed_urls=[
                'http://localhost:*',
            ],
            expect='http://localhost:4000/v1',
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


class IsPrefApiUrlRejectedTestCase(BaseTestGenerator):
    """Test the is_pref_api_url_rejected() helper that client.py
    uses to decide whether to surface a clear 'URL not allowed'
    error instead of a generic 'not configured' error."""

    scenarios = [
        ('No pref set', dict(
            pref_value=None,
            allowed_urls=['https://api.openai.com:443'],
            expect=False,
        )),
        ('Pref allowed', dict(
            pref_value='https://api.openai.com/v1',
            allowed_urls=['https://api.openai.com:443'],
            expect=False,
        )),
        ('Pref rejected', dict(
            pref_value='https://litellm.example.com/v1',
            allowed_urls=['https://api.openai.com:443'],
            expect=True,
        )),
        ('Pref allowed by wildcard', dict(
            pref_value='http://localhost:4000/v1',
            allowed_urls=['http://localhost:*'],
            expect=False,
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        import pgadmin.llm.utils as llm_utils

        with patch(
            'config.ALLOWED_LLM_API_URLS', self.allowed_urls
        ), patch.object(
            llm_utils, '_get_preference_value',
            return_value=self.pref_value
        ):
            self.assertEqual(
                llm_utils.is_pref_api_url_rejected('openai_api_url'),
                self.expect,
            )


class GetApiKeyResolutionTestCase(BaseTestGenerator):
    """Test the get_*_api_key() resolution rules.

    Contract (post-#9936 follow-up for jbro90's comment):
      - Pref key file set and path allowed   -> read user's key
      - Pref key file set but path rejected  -> return None (NO
        fallback to admin default; silent substitution would route
        the request with a different key)
      - Pref key file unset                  -> read admin's
        trusted config key file
    """

    scenarios = [
        ('Anthropic: rejected pref path returns None', dict(
            getter='get_anthropic_api_key',
            pref_value='/etc/passwd',  # outside storage dir
            config_attr='ANTHROPIC_API_KEY_FILE',
            config_value='',
            path_valid=False,
            read_admin_returns=None,
            expect=None,
        )),
        ('OpenAI: rejected pref path returns None', dict(
            getter='get_openai_api_key',
            pref_value='/tmp/malicious.key',
            config_attr='OPENAI_API_KEY_FILE',
            config_value='/etc/pgadmin/admin.key',
            path_valid=False,
            # Even though admin has a valid key file configured, we
            # do NOT silently substitute it — the user explicitly
            # set their own preference.
            read_admin_returns='sk-admin-fallback',
            expect=None,
        )),
        ('Anthropic: allowed pref path returns user key', dict(
            getter='get_anthropic_api_key',
            pref_value='/home/u/private/anthropic.key',
            config_attr='ANTHROPIC_API_KEY_FILE',
            config_value='',
            path_valid=True,
            read_admin_returns=None,
            expect='sk-user-key',
        )),
        ('Anthropic: unset pref falls to admin default', dict(
            getter='get_anthropic_api_key',
            pref_value=None,
            config_attr='ANTHROPIC_API_KEY_FILE',
            config_value='/etc/pgadmin/admin.key',
            path_valid=True,
            read_admin_returns='sk-admin-fallback',
            expect='sk-admin-fallback',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        import pgadmin.llm.utils as llm_utils
        getter_fn = getattr(llm_utils, self.getter)

        validate_ret = ('/safe' + str(self.pref_value)) \
            if self.path_valid and self.pref_value else None

        def fake_read(path, _trusted=False):
            # User pref read path is the validate_api_key_path return.
            if _trusted:
                return self.read_admin_returns
            return 'sk-user-key'

        with patch.object(
            llm_utils, '_get_preference_value',
            return_value=self.pref_value
        ), patch.object(
            llm_utils, 'validate_api_key_path',
            return_value=validate_ret
        ), patch.object(
            llm_utils, '_read_api_key_from_file',
            side_effect=fake_read
        ), patch(
            'config.' + self.config_attr, self.config_value
        ):
            result = getter_fn()
            self.assertEqual(result, self.expect)


class IsPrefApiKeyPathRejectedTestCase(BaseTestGenerator):
    """Test the is_pref_api_key_path_rejected() helper."""

    scenarios = [
        ('No pref set', dict(
            pref_value=None,
            path_valid=True,
            expect=False,
        )),
        ('Pref allowed', dict(
            pref_value='/home/u/private/key',
            path_valid=True,
            expect=False,
        )),
        ('Pref rejected', dict(
            pref_value='/etc/passwd',
            path_valid=False,
            expect=True,
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        import pgadmin.llm.utils as llm_utils
        validate_ret = '/safe' if self.path_valid else None

        with patch.object(
            llm_utils, '_get_preference_value',
            return_value=self.pref_value
        ), patch.object(
            llm_utils, 'validate_api_key_path',
            return_value=validate_ret
        ):
            self.assertEqual(
                llm_utils.is_pref_api_key_path_rejected(
                    'anthropic_api_key_file'
                ),
                self.expect,
            )


class GetLLMClientRejectedKeyFileTestCase(BaseTestGenerator):
    """When the user's preference key file path is rejected by the
    directory allowlist, get_llm_client() must raise a clear
    LLMClientError mentioning private user storage rather than the
    generic 'API key not configured' error."""

    scenarios = [
        ('OpenAI rejected key file', dict(
            provider='openai',
            pref_key='openai_api_key_file',
            pref_value='/etc/passwd',
        )),
        ('Anthropic rejected key file', dict(
            provider='anthropic',
            pref_key='anthropic_api_key_file',
            pref_value='/tmp/leak.key',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.client import get_llm_client, LLMClientError
        import pgadmin.llm.utils as llm_utils

        def fake_get_pref(name):
            return self.pref_value if name == self.pref_key else None

        with patch.object(
            llm_utils, '_get_preference_value', side_effect=fake_get_pref
        ), patch.object(
            llm_utils, 'validate_api_key_path', return_value=None
        ):
            with self.assertRaises(LLMClientError) as ctx:
                get_llm_client(provider=self.provider)

        msg = str(ctx.exception)
        self.assertIn('private', msg.lower())
        self.assertIn(self.provider, msg)


class GetLLMClientRejectedUrlTestCase(BaseTestGenerator):
    """When the user's preference URL is blocked by the allowlist,
    get_llm_client() must raise a clear LLMClientError mentioning
    ALLOWED_LLM_API_URLS instead of a misleading
    'API key not configured' error."""

    scenarios = [
        ('OpenAI rejected URL surfaces clear error', dict(
            provider='openai',
            pref_name='openai_api_url',
            pref_value='https://litellm.example.com/v1',
            allowed_urls=['https://api.openai.com:443'],
        )),
        ('Anthropic rejected URL surfaces clear error', dict(
            provider='anthropic',
            pref_name='anthropic_api_url',
            pref_value='http://10.0.0.1:8080/',
            allowed_urls=['https://api.anthropic.com:443'],
        )),
        ('Ollama rejected URL surfaces clear error', dict(
            provider='ollama',
            pref_name='ollama_api_url',
            pref_value='http://corporate-proxy.example.com:8080/',
            allowed_urls=['http://localhost:11434'],
        )),
        ('Docker rejected URL surfaces clear error', dict(
            provider='docker',
            pref_name='docker_api_url',
            pref_value='http://192.168.1.1:12434/',
            allowed_urls=['http://localhost:12434'],
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        from pgadmin.llm.client import get_llm_client, LLMClientError
        import pgadmin.llm.utils as llm_utils

        def fake_get_pref(name):
            return self.pref_value if name == self.pref_name else None

        with patch(
            'config.ALLOWED_LLM_API_URLS', self.allowed_urls
        ), patch.object(
            llm_utils, '_get_preference_value', side_effect=fake_get_pref
        ):
            with self.assertRaises(LLMClientError) as ctx:
                get_llm_client(provider=self.provider)

        msg = str(ctx.exception)
        self.assertIn('ALLOWED_LLM_API_URLS', msg)
        self.assertIn(self.provider, msg)
