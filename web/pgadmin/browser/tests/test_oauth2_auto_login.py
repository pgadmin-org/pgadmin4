##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import patch

from flask import current_app

import config as app_config
from pgAdmin4 import app
from pgadmin.authenticate.registry import AuthSourceRegistry
from pgadmin.utils.constants import OAUTH2, INTERNAL, MessageType
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

PROVIDER = {
    'OAUTH2_NAME': 'github',
    'OAUTH2_DISPLAY_NAME': 'Github',
    'OAUTH2_CLIENT_ID': 'testclientid',
    'OAUTH2_CLIENT_SECRET': 'testclientsec',
    'OAUTH2_TOKEN_URL': 'https://github.com/login/oauth/access_token',
    'OAUTH2_AUTHORIZATION_URL': 'https://github.com/login/oauth/authorize',
    'OAUTH2_API_BASE_URL': 'https://api.github.com/',
    'OAUTH2_USERINFO_ENDPOINT': 'user',
    'OAUTH2_SCOPE': 'email profile',
}

SECOND_PROVIDER = dict(PROVIDER, OAUTH2_NAME='gitlab',
                       OAUTH2_DISPLAY_NAME='GitLab')


class Oauth2AutoLoginTestCase(BaseTestGenerator):
    """
    Check that OAUTH2_AUTO_LOGIN sends users straight to the provider only
    when it should, and that the login page is shown otherwise.
    """

    scenarios = [
        ('Auto-login redirects to the single provider', dict(
            kind='redirects', url='/login', auto_login=True,
            sources=[OAUTH2], providers=[PROVIDER],
        )),
        ('Auto-login redirects from the root URL', dict(
            kind='redirects', url='/', auto_login=True,
            sources=[OAUTH2], providers=[PROVIDER],
        )),
        ('No redirect when auto-login is disabled', dict(
            kind='login_page', url='/login', auto_login=False,
            sources=[OAUTH2], providers=[PROVIDER],
        )),
        ('No redirect with more than one provider', dict(
            kind='login_page', url='/login', auto_login=True,
            sources=[OAUTH2], providers=[PROVIDER, SECOND_PROVIDER],
        )),
        ('No redirect with another authentication source', dict(
            kind='login_page', url='/login', auto_login=True,
            sources=[OAUTH2, INTERNAL], providers=[PROVIDER],
        )),
        ('No redirect with no_auto_login in the URL', dict(
            kind='login_page', url='/login?no_auto_login', auto_login=True,
            sources=[OAUTH2], providers=[PROVIDER],
        )),
        ('No redirect while a message is waiting to be shown', dict(
            kind='flashed_message', url='/login', auto_login=True,
            sources=[OAUTH2], providers=[PROVIDER],
        )),
        ('No redirect if the provider redirect fails', dict(
            kind='provider_error', url='/login', auto_login=True,
            sources=[OAUTH2], providers=[PROVIDER],
        )),
        ('Login page shown after logout', dict(
            kind='logout', url='/login', auto_login=True,
            sources=[OAUTH2], providers=[PROVIDER],
        )),
    ]

    SAVED_SETTINGS = ('AUTHENTICATION_SOURCES', 'OAUTH2_CONFIG',
                      'OAUTH2_AUTO_CREATE_USER', 'OAUTH2_AUTO_LOGIN')

    @classmethod
    def setUpClass(cls):
        """Logout the test client as we are testing OAuth2 login."""
        cls.saved_settings = {
            name: getattr(app_config, name)
            for name in cls.SAVED_SETTINGS if hasattr(app_config, name)
        }
        cls.tester.logout()

    def setUp(self):
        app_config.AUTHENTICATION_SOURCES = self.sources
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = OAUTH2
        app_config.OAUTH2_AUTO_CREATE_USER = True
        app_config.OAUTH2_CONFIG = self.providers
        app_config.OAUTH2_AUTO_LOGIN = self.auto_login
        self._reset_oauth2_state()

    def _reset_oauth2_state(self):
        """Reset the cached auth sources so the config above is used."""
        AuthSourceRegistry._objects = dict()
        with self.app.app_context():
            setattr(current_app, '_pgadmin_auth_sources', {})
        from pgadmin.authenticate.oauth2 import OAuth2Authentication
        OAuth2Authentication.oauth2_clients = {}
        OAuth2Authentication.oauth2_config = {}

    def runTest(self):
        if app_config.SERVER_MODE is False:
            self.skipTest(
                "Can not run Oauth2 Authentication in the Desktop mode."
            )

        if self.kind == 'redirects':
            self._test_redirects()
        elif self.kind == 'login_page':
            self._assert_login_page()
        elif self.kind == 'flashed_message':
            with self.tester.session_transaction() as sess:
                sess['_flashes'] = [(MessageType.ERROR, 'Login failed')]
            self._assert_login_page()
        elif self.kind == 'provider_error':
            from authlib.integrations.flask_client import FlaskOAuth2App
            with patch.object(FlaskOAuth2App, 'authorize_redirect',
                              side_effect=RuntimeError('unreachable')):
                self._assert_login_page()
        elif self.kind == 'logout':
            self._test_logout()
        else:
            self.fail(f'Unknown test kind: {self.kind}')

    def _test_redirects(self):
        res = self.tester.get(self.url, follow_redirects=False)
        self.assertEqual(res.status_code, 302)
        self.assertTrue(
            res.location.startswith(PROVIDER['OAUTH2_AUTHORIZATION_URL']),
            'Expected a redirect to the provider, got %s' % res.location)
        with self.tester.session_transaction() as sess:
            self.assertEqual(sess.get('oauth2_current_client'),
                             PROVIDER['OAUTH2_NAME'])

    def _assert_login_page(self):
        res = self.tester.get(self.url, follow_redirects=False)
        self.assertEqual(res.status_code, 200)
        with self.tester.session_transaction() as sess:
            self.assertNotIn('oauth2_current_client', sess)

    def _test_logout(self):
        from pgadmin.authenticate.oauth2 import OAuth2Authentication

        def _fake_authenticate(self, _form):
            self.oauth2_current_client = PROVIDER['OAUTH2_NAME']
            return True, None

        def _fake_get_user_profile(self):
            from flask import session
            session['oauth2_token'] = {
                'access_token': 'test-access-token',
                'id_token': 'mock.jwt.token',
                'token_type': 'Bearer',
                'userinfo': {'email': 'oauth2@example.com'}
            }
            return {'email': 'oauth2@example.com'}

        # The test client's login fetches the login page first, so log in
        # with auto-login off, then turn it on before logging out.
        app_config.OAUTH2_AUTO_LOGIN = False
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
                extra_form_data=dict(oauth2_button=PROVIDER['OAUTH2_NAME'])
            )
        self.assertEqual(res.status_code, 200)
        with self.tester.session_transaction() as sess:
            self.assertEqual(
                sess.get('auth_source_manager', {}).get('current_source'),
                OAUTH2)

        app_config.OAUTH2_AUTO_LOGIN = True
        res = self.tester.get('/oauth2/logout', follow_redirects=False)
        self.assertEqual(res.status_code, 302)
        with self.tester.session_transaction() as sess:
            self.assertIn('_flashes', sess)

        # The login page is shown with the message, rather than sending the
        # user back to the provider.
        self._assert_login_page()

        # Once the message has been shown, auto-login applies again.
        self._test_redirects()

    def tearDown(self):
        self.tester.logout()
        with self.tester.session_transaction() as sess:
            sess.clear()

    @classmethod
    def tearDownClass(cls):
        """Log the test client back in now that the scenarios are done."""
        cls.tester.logout()
        for name in cls.SAVED_SETTINGS:
            if name in cls.saved_settings:
                setattr(app_config, name, cls.saved_settings[name])
            elif hasattr(app_config, name):
                delattr(app_config, name)
        app_config.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL
        app.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL
        utils.login_tester_account(cls.tester)
