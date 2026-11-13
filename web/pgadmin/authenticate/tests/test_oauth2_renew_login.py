##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The "Sign in again" button of the connect dialogs renews the pgAdmin
login through the same OAuth2 provider the user logged in with."""

import unittest
from unittest.mock import MagicMock, patch

from flask import redirect

from pgadmin.model import User
from pgadmin.utils.route import BaseTestGenerator

IDP_URL = 'https://login.example.test/authorize?state=abc'


def _source(client=None):
    source = MagicMock()
    source.oauth2_clients = {'entra': client} if client else {}
    return source


class RenewLoginTestCase(BaseTestGenerator):

    scenarios = [
        ('Redirects to the provider of the login',
         dict(provider='entra', has_client=True, expected=302)),
        ('Refuses a login that did not use OAuth2',
         dict(provider=None, has_client=False, expected=400)),
        ('Refuses a provider that is no longer configured',
         dict(provider='entra', has_client=False, expected=400)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        client = MagicMock()
        client.authorize_redirect.side_effect = \
            lambda uri: redirect(IDP_URL)
        with self.tester.session_transaction() as sess:
            sess.pop('oauth2_current_client', None)
            if self.provider:
                sess['oauth2_provider'] = self.provider
            else:
                sess.pop('oauth2_provider', None)

        with patch('pgadmin.authenticate.get_auth_sources',
                   return_value=_source(
                       client if self.has_client else None)):
            response = self.tester.get('/oauth2/renew')

        self.assertEqual(response.status_code, self.expected)
        with self.tester.session_transaction() as sess:
            if self.expected == 302:
                self.assertEqual(response.headers['Location'], IDP_URL)
                # The callback renews the login of this provider.
                self.assertEqual(sess['oauth2_current_client'], 'entra')
                client.authorize_redirect.assert_called_once()
                self.assertTrue(client.authorize_redirect.call_args.args[0]
                                .endswith('/oauth2/authorize'))
            else:
                self.assertNotIn('oauth2_current_client', sess)
                client.authorize_redirect.assert_not_called()


class RenewedLoginCallbackTestCase(BaseTestGenerator):
    """After the provider sends the user back, the pop-up lands on a page
    that says so; a login as another user is refused."""

    scenarios = [
        ('Same user',
         dict(other_user=False, location='/oauth2/renewed')),
        ('Another user',
         dict(other_user=True, location=None)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        user = User.query.first()
        with self.tester.session_transaction() as sess:
            sess['oauth2_current_client'] = 'entra'
            offset = 1 if self.other_user else 0
            sess['oauth2_renew_user'] = user.id + offset
            sess['pass_enc_key'] = 'key-of-the-first-login'

        def login():
            # A login derives the key that encrypts the passwords held by
            # the session's connections from its access token.
            from flask import session
            session['pass_enc_key'] = 'access-token-of-the-renewed-login'
            return True, ''

        manager = MagicMock()
        manager.login.side_effect = login
        manager.as_dict.return_value = {}
        with patch('pgadmin.authenticate.get_auth_sources',
                   return_value=_source()), \
                patch('pgadmin.authenticate.AuthSourceManager',
                      return_value=manager):
            response = self.tester.get('/oauth2/authorize')

        self.assertEqual(response.status_code, 302)
        if self.location:
            self.assertTrue(
                response.headers['Location'].endswith(self.location))
        else:
            self.assertFalse(
                response.headers['Location'].endswith('/oauth2/renewed'))
        with self.tester.session_transaction() as sess:
            self.assertNotIn('oauth2_renew_user', sess)
            self.assertNotIn('oauth2_current_client', sess)
            if self.location:
                # The connections the session already holds stay usable.
                self.assertEqual(sess['pass_enc_key'],
                                 'key-of-the-first-login')

        if self.location:
            page = self.tester.get('/oauth2/renewed')
            self.assertEqual(page.status_code, 200)
            self.assertIn(b'close this window', page.data)
