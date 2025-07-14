##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.authenticate.registry import AuthSourceRegistry
from unittest.mock import patch, MagicMock
from pgadmin.authenticate import AuthSourceManager
from pgadmin.utils.constants import OAUTH2, INTERNAL


class Oauth2LoginMockTestCase(BaseTestGenerator):
    """
    This class checks oauth2  login functionality by mocking
    External Oauth2 Authentication.
    """

    scenarios = [
        ('Oauth2 External Authentication', dict(
            auth_source=['oauth2'],
            oauth2_provider='github',
            flag=1
        )),
        ('Oauth2 Authentication', dict(
            auth_source=['oauth2'],
            oauth2_provider='github',
            flag=2
        )),
        ('Oauth2 Additional Claims Authentication', dict(
            auth_source=['oauth2'],
            oauth2_provider='auth-with-additional-claim-check',
            flag=3
        )),
        ('Oauth2 PKCE Support', dict(
            auth_source=['oauth2'],
            oauth2_provider='keycloak-pkce',
            flag=4
        )),
    ]

    @classmethod
    def setUpClass(cls):
        """
        We need to logout the test client as we are testing
        OAuth2 login scenarios.
        """
        cls.tester.logout()

    def setUp(self):
        app_config.AUTHENTICATION_SOURCES = self.auth_source
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = OAUTH2
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
            }
        ]

    def runTest(self):
        """This function checks oauth2 login functionality."""
        if app_config.SERVER_MODE is False:
            self.skipTest(
                "Can not run Oauth2 Authentication in the Desktop mode."
            )

        if self.flag == 1:
            self.test_external_authentication()
        elif self.flag == 2:
            self.test_oauth2_authentication()
        elif self.flag == 3:
            self.test_oauth2_authentication_with_additional_claims_success()
        elif self.flag == 4:
            self.test_oauth2_authentication_with_pkce()

    def test_external_authentication(self):
        """
        Ensure that the user should be redirected
        to the external url for the authentication.
        """

        AuthSourceManager.update_auth_sources = MagicMock()

        try:
            self.tester.login(
                email=None, password=None,
                _follow_redirects=True,
                headers=None,
                extra_form_data=dict(oauth2_button=self.oauth2_provider)
            )
        except Exception as e:
            self.assertEqual('Following external'
                             ' redirects is not supported.', str(e))

    def test_oauth2_authentication(self):
        """
        Ensure that when the client sends an correct authorization token,
        they receive a 200 OK response and the user principal is extracted and
        passed on to the routed method.
        """

        profile = self.mock_user_profile()

        # Mock Oauth2 Authenticate
        AuthSourceRegistry._registry[OAUTH2].authenticate = MagicMock(
            return_value=[True, ''])

        AuthSourceManager.update_auth_sources = MagicMock()

        # Create AuthSourceManager object
        auth_obj = AuthSourceManager({}, [OAUTH2])
        auth_source = AuthSourceRegistry.get(OAUTH2)
        auth_obj.set_source(auth_source)
        auth_obj.set_current_source(auth_source.get_source_name())

        # Check the login with Oauth2
        res = self.tester.login(email=None, password=None,
                                _follow_redirects=True,
                                headers=None,
                                extra_form_data=dict(
                                    oauth2_button=self.oauth2_provider)
                                )

        respdata = 'Gravatar image for %s' % profile['email']
        self.assertTrue(respdata in res.data.decode('utf8'))

    def test_oauth2_authentication_with_additional_claims_success(self):
        """
        Ensure that when an oauth2 config has a dict OAUTH2_ADDITIONAL_CLAIMS,
        any match of the OAUTH2_ADDITIONAL_CLAIMS dict will allow user login.
        """

        profile = self.mock_user_profile_with_additional_claims()

        # Mock Oauth2 Authenticate
        AuthSourceRegistry._registry[OAUTH2].authenticate = MagicMock(
            return_value=[True, ''])

        AuthSourceManager.update_auth_sources = MagicMock()

        # Create AuthSourceManager object
        auth_obj = AuthSourceManager({}, [OAUTH2])
        auth_source = AuthSourceRegistry.get(OAUTH2)
        auth_obj.set_source(auth_source)
        auth_obj.set_current_source(auth_source.get_source_name())

        # Check the login with Oauth2
        res = self.tester.login(email=None, password=None,
                                _follow_redirects=True,
                                headers=None,
                                extra_form_data=dict(
                                    oauth2_button=self.oauth2_provider)
                                )

        respdata = 'Gravatar image for %s' % profile['email']
        self.assertTrue(respdata in res.data.decode('utf8'))

    def test_oauth2_authentication_with_pkce(self):
        """
        Ensure that when PKCE parameters are configured, they are passed
        to the OAuth client registration as part of client_kwargs, and that
        the default client_kwargs is correctly included.
        """

        with patch('pgadmin.authenticate.oauth2.OAuth.register') as \
                mock_register:
            from pgadmin.authenticate.oauth2 import OAuth2Authentication

            OAuth2Authentication()

            args, kwargs = mock_register.call_args
            client_kwargs = kwargs.get('client_kwargs', {})

            # Check that PKCE and default client_kwargs are included
            self.assertEqual(
                client_kwargs.get('code_challenge_method'), 'S256')
            self.assertEqual(
                client_kwargs.get('response_type'), 'code')
            self.assertEqual(
                client_kwargs.get('scope'), 'openid email profile')
            self.assertEqual(
                client_kwargs.get('verify'), 'true')

    def mock_user_profile_with_additional_claims(self):
        profile = {'email': 'oauth2@gmail.com', 'wids': ['789']}

        AuthSourceRegistry._registry[OAUTH2].get_user_profile = MagicMock(
            return_value=profile)
        return profile

    def mock_user_profile(self):
        profile = {'email': 'oauth2@gmail.com'}

        AuthSourceRegistry._registry[OAUTH2].get_user_profile = MagicMock(
            return_value=profile)
        return profile

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
