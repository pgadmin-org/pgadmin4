##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.authenticate.registry import AuthSourceRegistry
from unittest.mock import patch, MagicMock
from pgadmin.utils.constants import OAUTH2, INTERNAL
from flask import current_app, redirect


class Oauth2LoginMockTestCase(BaseTestGenerator):
    """
    This class checks oauth2  login functionality by mocking
    External Oauth2 Authentication.
    """

    scenarios = [
        ('Oauth2 External Authentication', dict(
            oauth2_provider='github',
            kind='external_redirect',
            profile={},
            id_token_claims=None,
        )),
        ('Oauth2 Authentication', dict(
            oauth2_provider='github',
            kind='login_success',
            profile={'email': 'oauth2@gmail.com'},
            id_token_claims=None,
        )),
        ('Oauth2 Additional Claims Authentication', dict(
            oauth2_provider='auth-with-additional-claim-check',
            kind='login_success',
            profile={'email': 'oauth2@gmail.com', 'wids': ['789']},
            id_token_claims=None,
        )),
        ('Oauth2 PKCE Support', dict(
            oauth2_provider='keycloak-pkce',
            kind='pkce',
            profile={},
            id_token_claims=None,
        )),
        ('OIDC Uses ID Token Claims', dict(
            oauth2_provider='oidc-basic',
            kind='login_success',
            profile={},
            id_token_claims={'email': 'oidc@example.com', 'sub': 'abc'},
        )),
        ('OIDC Falls Back To Profile Email', dict(
            oauth2_provider='oidc-basic',
            kind='login_success',
            profile={'email': 'fallback@example.com'},
            id_token_claims={'sub': 'abc'},
        )),
        ('OIDC Username Claim Precedence', dict(
            oauth2_provider='oidc-username-claim',
            kind='login_success',
            profile={'email': 'email@example.com'},
            id_token_claims={'preferred_username': 'preferred-user'},
        )),
        ('OIDC Additional Claims Via ID Token', dict(
            oauth2_provider='oidc-additional-claims',
            kind='login_success',
            profile={'email': 'claims@example.com'},
            id_token_claims={'groups': ['group-a']},
        )),
        ('OIDC Additional Claims Rejected', dict(
            oauth2_provider='oidc-additional-claims',
            kind='login_failure',
            profile={'email': 'claims@example.com'},
            id_token_claims={'groups': ['group-b']},
        )),
        ('OIDC get_user_profile Skips Userinfo', dict(
            oauth2_provider='oidc-basic',
            kind='oidc_get_user_profile_skip',
            profile={},
            id_token_claims=None,
        )),
        ('OIDC get_user_profile Calls Userinfo', dict(
            oauth2_provider='oidc-basic',
            kind='oidc_get_user_profile_call',
            profile={},
            id_token_claims=None,
        )),
    ]

    @classmethod
    def setUpClass(cls):
        """Logout the test client as we are testing OAuth2 login scenarios."""
        cls.tester.logout()

    def setUp(self):
        app_config.AUTHENTICATION_SOURCES = [OAUTH2]
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = OAUTH2
        # Ensure OAuth2 users can be created during tests.
        app_config.OAUTH2_AUTO_CREATE_USER = True
        app_config.OAUTH2_CONFIG = [
            {
                'OAUTH2_NAME': 'github',
                'OAUTH2_DISPLAY_NAME': 'Github',
                'OAUTH2_CLIENT_ID': 'testclientid',
                'OAUTH2_CLIENT_SECRET': 'testclientsec',
                'OAUTH2_TOKEN_URL':
                    'https://github.com/login/oauth/access_token',
                'OAUTH2_AUTHORIZATION_URL':
                    'https://github.com/login/oauth/authorize',
                'OAUTH2_API_BASE_URL': 'https://api.github.com/',
                'OAUTH2_USERINFO_ENDPOINT': 'user',
                'OAUTH2_SCOPE': 'openid email profile',
                'OAUTH2_ICON': 'fa-github',
                'OAUTH2_BUTTON_COLOR': '#3253a8',
            },
            {
                'OAUTH2_NAME': 'auth-with-additional-claim-check',
                'OAUTH2_DISPLAY_NAME': 'Additional Authorization',
                'OAUTH2_CLIENT_ID': 'testclientid',
                'OAUTH2_CLIENT_SECRET': 'testclientsec',
                'OAUTH2_TOKEN_URL':
                    'https://dummy.com/123/oauth2/v2.0/token',
                'OAUTH2_AUTHORIZATION_URL':
                    'https://dummy.com/123/oauth2/v2.0/authorize',
                'OAUTH2_API_BASE_URL': 'https://graph.dummy.com/v1.0/',
                'OAUTH2_USERINFO_ENDPOINT': 'me',
                'OAUTH2_SCOPE': 'openid email profile',
                'OAUTH2_ICON': 'briefcase',
                'OAUTH2_BUTTON_COLOR': '#0000ff',
                'OAUTH2_ADDITIONAL_CLAIMS': {
                    'groups': ['123', '456'],
                    'wids': ['789']
                }
            },
            {
                'OAUTH2_NAME': 'keycloak-pkce',
                'OAUTH2_DISPLAY_NAME': 'Keycloak with PKCE',
                'OAUTH2_CLIENT_ID': 'testclientid',
                'OAUTH2_CLIENT_SECRET': 'testclientsec',
                'OAUTH2_TOKEN_URL':
                    'https://keycloak.org/auth/realms/TEST-REALM/protocol/'
                    'openid-connect/token',
                'OAUTH2_AUTHORIZATION_URL':
                    'https://keycloak.org/auth/realms/TEST-REALM/protocol/'
                    'openid-connect/auth',
                'OAUTH2_API_BASE_URL':
                    'https://keycloak.org/auth/realms/TEST-REALM',
                'OAUTH2_USERINFO_ENDPOINT': 'user',
                'OAUTH2_SCOPE': 'openid email profile',
                'OAUTH2_SSL_CERT_VERIFICATION': True,
                'OAUTH2_ICON': 'fa-black-tie',
                'OAUTH2_BUTTON_COLOR': '#3253a8',
                'OAUTH2_CHALLENGE_METHOD': 'S256',
                'OAUTH2_RESPONSE_TYPE': 'code',
            },
            {
                'OAUTH2_NAME': 'oidc-basic',
                'OAUTH2_DISPLAY_NAME': 'OIDC Basic',
                'OAUTH2_CLIENT_ID': 'testclientid',
                'OAUTH2_CLIENT_SECRET': 'testclientsec',
                'OAUTH2_TOKEN_URL': 'https://oidc.example/token',
                'OAUTH2_AUTHORIZATION_URL': 'https://oidc.example/auth',
                'OAUTH2_API_BASE_URL': 'https://oidc.example/',
                'OAUTH2_USERINFO_ENDPOINT': 'userinfo',
                'OAUTH2_SCOPE': 'openid email profile',
                'OAUTH2_SERVER_METADATA_URL':
                    'https://oidc.example/.well-known/openid-configuration',
            },
            {
                'OAUTH2_NAME': 'oidc-username-claim',
                'OAUTH2_DISPLAY_NAME': 'OIDC Username Claim',
                'OAUTH2_CLIENT_ID': 'testclientid',
                'OAUTH2_CLIENT_SECRET': 'testclientsec',
                'OAUTH2_TOKEN_URL': 'https://oidc.example/token',
                'OAUTH2_AUTHORIZATION_URL': 'https://oidc.example/auth',
                'OAUTH2_API_BASE_URL': 'https://oidc.example/',
                'OAUTH2_USERINFO_ENDPOINT': 'userinfo',
                'OAUTH2_SCOPE': 'openid email profile',
                'OAUTH2_SERVER_METADATA_URL':
                    'https://oidc.example/.well-known/openid-configuration',
                'OAUTH2_USERNAME_CLAIM': 'preferred_username',
            },
            {
                'OAUTH2_NAME': 'oidc-additional-claims',
                'OAUTH2_DISPLAY_NAME': 'OIDC Additional Claims',
                'OAUTH2_CLIENT_ID': 'testclientid',
                'OAUTH2_CLIENT_SECRET': 'testclientsec',
                'OAUTH2_TOKEN_URL': 'https://oidc.example/token',
                'OAUTH2_AUTHORIZATION_URL': 'https://oidc.example/auth',
                'OAUTH2_API_BASE_URL': 'https://oidc.example/',
                'OAUTH2_USERINFO_ENDPOINT': 'userinfo',
                'OAUTH2_SCOPE': 'openid email profile',
                'OAUTH2_SERVER_METADATA_URL':
                    'https://oidc.example/.well-known/openid-configuration',
                'OAUTH2_ADDITIONAL_CLAIMS': {
                    'groups': ['group-a']
                }
            }
        ]

    def runTest(self):
        """This function checks oauth2 login functionality."""
        if app_config.SERVER_MODE is False:
            self.skipTest(
                "Can not run Oauth2 Authentication in the Desktop mode."
            )

        self._reset_oauth2_state()

        if self.kind == 'external_redirect':
            self._test_external_authentication(self.oauth2_provider)
        elif self.kind == 'pkce':
            self.test_oauth2_authentication_with_pkce()
        elif self.kind == 'login_success':
            self._test_oauth2_login_success(
                self.oauth2_provider, self.profile, self.id_token_claims
            )
        elif self.kind == 'login_failure':
            self._test_oauth2_login_failure(
                self.oauth2_provider, self.profile, self.id_token_claims
            )
        elif self.kind == 'oidc_get_user_profile_skip':
            self._test_oidc_get_user_profile_skip_userinfo(
                self.oauth2_provider
            )
        elif self.kind == 'oidc_get_user_profile_call':
            self._test_oidc_get_user_profile_calls_userinfo(
                self.oauth2_provider
            )
        else:
            self.fail(f'Unknown test kind: {self.kind}')

    def _reset_oauth2_state(self):
        """Reset singleton caches so each subTest gets a clean OAuth2 state."""
        # Clear AuthSourceRegistry singleton instances.
        AuthSourceRegistry._objects = dict()

        # Clear per-app cache of instantiated auth sources.
        with self.app.app_context():
            cached = getattr(current_app, '_pgadmin_auth_sources', None)
            if isinstance(cached, dict):
                cached.clear()
            else:
                setattr(current_app, '_pgadmin_auth_sources', {})

        # Clear OAuth2Authentication class-level caches.
        from pgadmin.authenticate.oauth2 import OAuth2Authentication
        OAuth2Authentication.oauth2_clients = {}
        OAuth2Authentication.oauth2_config = {}

    def _assert_oauth2_session_logged_in(self):
        with self.tester.session_transaction() as sess:
            asm = sess.get('auth_source_manager')
            self.assertIsNotNone(asm)
            self.assertEqual(asm.get('current_source'), OAUTH2)

    def _assert_oauth2_session_not_logged_in(self):
        with self.tester.session_transaction() as sess:
            asm = sess.get('auth_source_manager')
            self.assertTrue(asm is None or asm == {})

    def _test_external_authentication(self, provider):
        """Ensure the user is redirected to an external URL."""
        from pgadmin.authenticate.oauth2 import OAuth2Authentication

        def _fake_authenticate(self, _form):
            self.oauth2_current_client = provider
            return False, redirect('https://example.com/')

        with patch.object(
                OAuth2Authentication, 'authenticate', new=_fake_authenticate
        ):
            try:
                self.tester.login(
                    email=None, password=None,
                    _follow_redirects=True,
                    headers=None,
                    extra_form_data=dict(oauth2_button=provider)
                )
            except Exception as e:
                self.assertEqual(
                    'Following external redirects is not supported.',
                    str(e)
                )

    def _test_oauth2_login_success(
            self, provider, profile, id_token_claims=None
    ):
        from pgadmin.authenticate.oauth2 import OAuth2Authentication

        def _fake_authenticate(self, _form):
            self.oauth2_current_client = provider
            # Important: AuthSourceManager may be constructed with a dict
            # form for oauth2_button flows, so avoid returning a username.
            return True, None

        def _fake_get_user_profile(self):
            if id_token_claims is not None:
                from flask import session
                session['oauth2_token'] = {
                    'access_token': 'test-access-token',
                    'userinfo': id_token_claims
                }
            return profile

        with patch.object(
            OAuth2Authentication, 'authenticate', new=_fake_authenticate
        ), patch.object(
            OAuth2Authentication, 'get_user_profile',
            new=_fake_get_user_profile
        ):
            res = self.tester.login(
                email=None, password=None,
                _follow_redirects=True,
                headers=None,
                extra_form_data=dict(oauth2_button=provider)
            )
        self.assertEqual(res.status_code, 200)
        self._assert_oauth2_session_logged_in()

    def _test_oauth2_login_failure(
            self, provider, profile, id_token_claims=None
    ):
        from pgadmin.authenticate.oauth2 import OAuth2Authentication

        def _fake_authenticate(self, _form):
            self.oauth2_current_client = provider
            return True, None

        def _fake_get_user_profile(self):
            if id_token_claims is not None:
                from flask import session
                session['oauth2_token'] = {
                    'access_token': 'test-access-token',
                    'userinfo': id_token_claims
                }
            return profile

        with patch.object(
            OAuth2Authentication, 'authenticate', new=_fake_authenticate
        ), patch.object(
            OAuth2Authentication, 'get_user_profile',
            new=_fake_get_user_profile
        ):
            res = self.tester.login(
                email=None, password=None,
                _follow_redirects=True,
                headers=None,
                extra_form_data=dict(oauth2_button=provider)
            )
        self.assertEqual(res.status_code, 200)
        self._assert_oauth2_session_not_logged_in()

    def test_oauth2_authentication_with_pkce(self):
        """
        Ensure that when PKCE parameters are configured, they are passed
        to the OAuth client registration as part of client_kwargs, and that
        the default client_kwargs is correctly included.
        """

        with patch(
            'pgadmin.authenticate.oauth2.OAuth.register'
        ) as mock_register:
            from pgadmin.authenticate.oauth2 import OAuth2Authentication

            OAuth2Authentication()

            pkce_call = None
            for _args, _kwargs in mock_register.call_args_list:
                if _kwargs.get('name') == 'keycloak-pkce':
                    pkce_call = (_args, _kwargs)
                    break

            self.assertIsNotNone(pkce_call)
            _, kwargs = pkce_call
            client_kwargs = kwargs.get('client_kwargs', {})

            # Check that PKCE and default client_kwargs are included
            self.assertEqual(
                client_kwargs.get('code_challenge_method'), 'S256')
            self.assertEqual(
                client_kwargs.get('response_type'), 'code')
            self.assertEqual(
                client_kwargs.get('scope'), 'openid email profile')
            self.assertEqual(
                client_kwargs.get('verify'), True)

    def _test_oidc_get_user_profile_skip_userinfo(self, provider):
        from pgadmin.authenticate.oauth2 import OAuth2Authentication

        with self.app.test_request_context('/'):
            oauth = OAuth2Authentication()
            oauth.oauth2_current_client = provider

            client = MagicMock()
            client.authorize_access_token = MagicMock(return_value={
                'access_token': 't',
                'userinfo': {'email': 'oidc-skip@example.com', 'sub': 'abc'}
            })
            client.get = MagicMock(side_effect=AssertionError(
                'userinfo endpoint should not be called'))

            OAuth2Authentication.oauth2_clients[provider] = client
            profile = oauth.get_user_profile()
            self.assertEqual(profile.get('email'), 'oidc-skip@example.com')
            client.get.assert_not_called()

    def _test_oidc_get_user_profile_calls_userinfo(self, provider):
        from pgadmin.authenticate.oauth2 import OAuth2Authentication

        with self.app.test_request_context('/'):
            oauth = OAuth2Authentication()
            oauth.oauth2_current_client = provider

            client = MagicMock()
            client.authorize_access_token = MagicMock(return_value={
                'access_token': 't',
                'userinfo': {}
            })

            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            resp.json = MagicMock(
                return_value={'email': 'userinfo@example.com'}
            )
            client.get = MagicMock(return_value=resp)

            OAuth2Authentication.oauth2_clients[provider] = client
            profile = oauth.get_user_profile()
            self.assertEqual(profile.get('email'), 'userinfo@example.com')
            client.get.assert_called_once()

    def tearDown(self):
        self.tester.logout()

    @classmethod
    def tearDownClass(cls):
        """
        We need to again login the test client as soon as test scenarios
        finishes.
        """
        cls.tester.logout()
        app_config.AUTHENTICATION_SOURCES = [INTERNAL]
        app_config.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL
        utils.login_tester_account(cls.tester)
