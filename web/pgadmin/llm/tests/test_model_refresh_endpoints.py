##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from unittest.mock import patch
from pgadmin.utils.route import BaseTestGenerator


class RefreshAnthropicEndpointTestCase(BaseTestGenerator):
    """Integration tests for Anthropic refresh endpoint error handling"""

    scenarios = [
        ('Bad api_key_file returns generic error', dict(
            post_data={'api_key_file': '/etc/passwd', 'api_url': ''},
            mock_validate_path_return=None,
            expect_error_contains='not permitted',
        )),
        ('Disallowed api_url returns rejection', dict(
            post_data={
                'api_key_file': '',
                'api_url': 'http://169.254.169.254/'
            },
            mock_validate_path_return='skip',
            mock_validate_url_return=False,
            expect_error_contains='not in the allowed list',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        patches = [
            patch(
                'pgadmin.authenticate.mfa.utils.mfa_required',
                lambda f: f
            ),
        ]

        if self.mock_validate_path_return != 'skip':
            patches.append(patch(
                'pgadmin.llm.utils.validate_api_key_path',
                return_value=self.mock_validate_path_return
            ))

        if hasattr(self, 'mock_validate_url_return'):
            patches.append(patch(
                'pgadmin.llm.utils.validate_api_url',
                return_value=self.mock_validate_url_return
            ))

        for p in patches:
            p.start()

        try:
            response = self.tester.post(
                '/llm/models/anthropic/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('error', data['data'])
            self.assertIn(
                self.expect_error_contains,
                data['data']['error']
            )
            # Ensure no file contents leak in the error
            self.assertNotIn(
                'root:', data['data'].get('error', '')
            )
        finally:
            for p in patches:
                p.stop()


class RefreshOpenAIEndpointTestCase(BaseTestGenerator):
    """Integration tests for OpenAI refresh endpoint error handling"""

    scenarios = [
        ('Bad api_key_file returns generic error', dict(
            post_data={'api_key_file': '/etc/passwd', 'api_url': ''},
            mock_validate_path_return=None,
            mock_validate_url_return='skip',
            expect_error_contains='not permitted',
        )),
        ('Disallowed api_url returns rejection', dict(
            post_data={
                'api_key_file': '',
                'api_url': 'http://169.254.169.254/'
            },
            mock_validate_path_return='skip',
            mock_validate_url_return=False,
            expect_error_contains='not in the allowed list',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        patches = [
            patch(
                'pgadmin.authenticate.mfa.utils.mfa_required',
                lambda f: f
            ),
        ]

        if self.mock_validate_path_return != 'skip':
            patches.append(patch(
                'pgadmin.llm.utils.validate_api_key_path',
                return_value=self.mock_validate_path_return
            ))

        if hasattr(self, 'mock_validate_url_return') and \
                self.mock_validate_url_return != 'skip':
            patches.append(patch(
                'pgadmin.llm.utils.validate_api_url',
                return_value=self.mock_validate_url_return
            ))

        for p in patches:
            p.start()

        try:
            response = self.tester.post(
                '/llm/models/openai/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('error', data['data'])
            self.assertIn(
                self.expect_error_contains,
                data['data']['error']
            )
            # Ensure no file contents leak in the error
            self.assertNotIn(
                'root:', data['data'].get('error', '')
            )
        finally:
            for p in patches:
                p.stop()


class RefreshOllamaEndpointTestCase(BaseTestGenerator):
    """Integration tests for Ollama refresh endpoint error handling"""

    scenarios = [
        ('Disallowed api_url returns rejection', dict(
            post_data={'api_url': 'http://169.254.169.254/'},
            mock_validate_url_return=False,
            expect_error_contains='not in the allowed list',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        with patch(
            'pgadmin.authenticate.mfa.utils.mfa_required',
            lambda f: f
        ), patch(
            'pgadmin.llm.utils.validate_api_url',
            return_value=self.mock_validate_url_return
        ):
            response = self.tester.post(
                '/llm/models/ollama/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('error', data['data'])
            self.assertIn(
                self.expect_error_contains,
                data['data']['error']
            )


class RefreshDockerEndpointTestCase(BaseTestGenerator):
    """Integration tests for Docker refresh endpoint error handling"""

    scenarios = [
        ('Disallowed api_url returns rejection', dict(
            post_data={'api_url': 'http://169.254.169.254/'},
            mock_validate_url_return=False,
            expect_error_contains='not in the allowed list',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        with patch(
            'pgadmin.authenticate.mfa.utils.mfa_required',
            lambda f: f
        ), patch(
            'pgadmin.llm.utils.validate_api_url',
            return_value=self.mock_validate_url_return
        ):
            response = self.tester.post(
                '/llm/models/docker/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('error', data['data'])
            self.assertIn(
                self.expect_error_contains,
                data['data']['error']
            )


# Happy-path integration tests. These bypass the network by mocking the
# _fetch_*_models helpers and assert that valid input flows through
# validation and back out as a models list.

_FAKE_MODELS = [
    {'label': 'fake-model-a', 'value': 'fake-model-a'},
    {'label': 'fake-model-b', 'value': 'fake-model-b'},
]


class RefreshAnthropicHappyPathTestCase(BaseTestGenerator):
    """Happy-path test: Anthropic refresh returns models when input valid."""

    scenarios = [
        ('Valid key file and URL returns models', dict(
            post_data={
                'api_key_file': '/tmp/fake-key',
                'api_url': 'https://api.anthropic.com/v1',
            },
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        with patch(
            'pgadmin.authenticate.mfa.utils.mfa_required', lambda f: f
        ), patch(
            'pgadmin.llm.utils.validate_api_url', return_value=True
        ), patch(
            'pgadmin.llm.utils.validate_api_key_path',
            return_value='/tmp/fake-key'
        ), patch(
            'pgadmin.llm.utils.read_api_key_file', return_value='sk-test'
        ), patch(
            'pgadmin.llm._fetch_anthropic_models', return_value=_FAKE_MODELS
        ):
            response = self.tester.post(
                '/llm/models/anthropic/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertNotIn('error', data['data'])
            self.assertEqual(data['data']['models'], _FAKE_MODELS)


class RefreshOpenAIHappyPathTestCase(BaseTestGenerator):
    """Happy-path test: OpenAI refresh returns models when input valid."""

    scenarios = [
        ('Valid key file and URL returns models', dict(
            post_data={
                'api_key_file': '/tmp/fake-key',
                'api_url': 'https://api.openai.com/v1',
            },
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        with patch(
            'pgadmin.authenticate.mfa.utils.mfa_required', lambda f: f
        ), patch(
            'pgadmin.llm.utils.validate_api_url', return_value=True
        ), patch(
            'pgadmin.llm.utils.validate_api_key_path',
            return_value='/tmp/fake-key'
        ), patch(
            'pgadmin.llm.utils.read_api_key_file', return_value='sk-test'
        ), patch(
            'pgadmin.llm._fetch_openai_models', return_value=_FAKE_MODELS
        ):
            response = self.tester.post(
                '/llm/models/openai/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertNotIn('error', data['data'])
            self.assertEqual(data['data']['models'], _FAKE_MODELS)


class RefreshOllamaHappyPathTestCase(BaseTestGenerator):
    """Happy-path test: Ollama refresh returns models when input valid."""

    scenarios = [
        ('Valid URL returns models', dict(
            post_data={'api_url': 'http://localhost:11434'},
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        with patch(
            'pgadmin.authenticate.mfa.utils.mfa_required', lambda f: f
        ), patch(
            'pgadmin.llm.utils.validate_api_url', return_value=True
        ), patch(
            'pgadmin.llm._fetch_ollama_models', return_value=_FAKE_MODELS
        ):
            response = self.tester.post(
                '/llm/models/ollama/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertNotIn('error', data['data'])
            self.assertEqual(data['data']['models'], _FAKE_MODELS)


class RefreshDockerHappyPathTestCase(BaseTestGenerator):
    """Happy-path test: Docker refresh returns models when input valid."""

    scenarios = [
        ('Valid URL returns models', dict(
            post_data={'api_url': 'http://localhost:12434'},
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        with patch(
            'pgadmin.authenticate.mfa.utils.mfa_required', lambda f: f
        ), patch(
            'pgadmin.llm.utils.validate_api_url', return_value=True
        ), patch(
            'pgadmin.llm._fetch_docker_models', return_value=_FAKE_MODELS
        ):
            response = self.tester.post(
                '/llm/models/docker/refresh',
                data=json.dumps(self.post_data),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertNotIn('error', data['data'])
            self.assertEqual(data['data']['models'], _FAKE_MODELS)
