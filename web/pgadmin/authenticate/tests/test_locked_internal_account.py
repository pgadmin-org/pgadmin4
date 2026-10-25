##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that a locked internal account only stops internal authentication,
not the login of an account from another auth source with the same name.

Anyone can lock an internal account by typing wrong passwords for it, so
the lock must not deny the LDAP user of the same name. The typed password
is never checked against the locked account: when LDAP refuses, the login
looks the same whether it is the internal account's password or not. LDAP
is mocked.
"""

from unittest.mock import patch

import config
import flask
from flask_security.utils import hash_password

from pgadmin.authenticate.registry import AuthSourceRegistry
from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL, KERBEROS, LDAP, OAUTH2
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.python_test_utils.user_utils import add_user

USERNAME = 'locked-internal-user@example.com'
PASSWORD = 'internal-password'
MAX_ATTEMPTS = 3
LOCKED_MSG = 'Your account is locked.'
NEUTRAL_MSG = 'Incorrect username or password. If you sign in with a ' \
    'pgAdmin account, it may be locked; please contact the Administrator.'


class LockedInternalAccountTestCase(BaseTestGenerator):
    """A locked internal account skips internal authentication only."""

    scenarios = [
        ('Locked internal account, LDAP user logs in, LDAP first',
         dict(auth_sources=[LDAP, INTERNAL], ldap_accepts=True,
              expect='ldap_login')),
        ('Locked internal account, LDAP user logs in, internal first',
         dict(auth_sources=[INTERNAL, LDAP], ldap_accepts=True,
              expect='ldap_login')),
        # When LDAP refuses, the login must not tell whether the typed
        # password is the locked internal account's: the same neutral
        # message is shown for the right password and for a wrong one.
        ('Locked internal account, LDAP refuses, LDAP first',
         dict(auth_sources=[LDAP, INTERNAL], ldap_accepts=False,
              expect='neutral')),
        ('Locked internal account, LDAP refuses, internal first',
         dict(auth_sources=[INTERNAL, LDAP], ldap_accepts=False,
              expect='neutral')),
        # With no other source to try, the account is locked whatever the
        # password.
        ('Locked internal account, internal only',
         dict(auth_sources=[INTERNAL], ldap_accepts=False,
              expect='locked')),
        ('Locked internal account, wrong password, internal only',
         dict(auth_sources=[INTERNAL], ldap_accepts=False,
              typed_password='wrong-password', expect='locked')),
        # A POST with a password does not try Kerberos or OAuth2, so no
        # source is left either.
        ('Locked internal account, internal and Kerberos',
         dict(auth_sources=[INTERNAL, KERBEROS], ldap_accepts=False,
              typed_password='wrong-password', expect='locked')),
        ('Locked internal account, internal and OAuth2',
         dict(auth_sources=[INTERNAL, OAUTH2], ldap_accepts=False,
              typed_password='wrong-password', expect='locked')),
        # A login failing validation is not counted against the internal
        # account either, as internal authentication is not tried.
        ('Locked internal account, no password, LDAP first',
         dict(auth_sources=[LDAP, INTERNAL], ldap_accepts=False,
              typed_password='', expect='refused')),
    ]

    typed_password = PASSWORD

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    _CONFIG = ('AUTHENTICATION_SOURCES', 'MAX_LOGIN_ATTEMPTS',
               'LDAP_AUTO_CREATE_USER', 'LDAP_ANONYMOUS_BIND',
               'LDAP_BIND_USER', 'LDAP_BIND_PASSWORD')

    def setUp(self):
        for name in self._CONFIG:
            self.addCleanup(setattr, config, name, getattr(config, name))
        config.AUTHENTICATION_SOURCES = self.auth_sources
        config.MAX_LOGIN_ATTEMPTS = MAX_ATTEMPTS
        config.LDAP_AUTO_CREATE_USER = False
        config.LDAP_ANONYMOUS_BIND = False
        config.LDAP_BIND_USER = None
        config.LDAP_BIND_PASSWORD = None

        with self.app.app_context():
            password = hash_password(PASSWORD)
        self.ids = {
            INTERNAL: add_user(self, USERNAME, INTERNAL, password=password),
            LDAP: add_user(self, USERNAME, LDAP),
        }
        with self.app.app_context():
            user = db.session.get(User, self.ids[INTERNAL])
            user.login_attempts = MAX_ATTEMPTS
            user.locked = True
            db.session.commit()
        self.addCleanup(self.tester.logout)

    def _attempts(self):
        with self.app.app_context():
            user = db.session.get(User, self.ids[INTERNAL])
            return user.login_attempts, user.locked

    def _logged_in_id(self):
        with self.tester.session_transaction() as sess:
            uniquifier = sess.get('_user_id')
        if uniquifier is None:
            return None
        with self.app.app_context():
            return User.query.filter_by(fs_uniquifier=uniquifier).first().id

    def _login(self, password):
        """Log in as USERNAME, and return what the user is shown: the
        response status and redirect, and the flashed messages."""
        with patch('pgadmin.authenticate.flash',
                   wraps=flask.flash) as flash_mock, \
                self.assertLogs(self.app.logger, 'INFO') as logs:
            res = self.tester.login(USERNAME, password)
        flashed = [str(c.args[0]) for c in flash_mock.call_args_list]

        # The server logs, at INFO, that internal authentication was
        # skipped, and never logs the password.
        skipped = [r for r in logs.records
                   if r.getMessage() == 'Internal authentication skipped '
                   'for {0}: the account is locked.'.format(USERNAME)]
        self.assertEqual([r.levelname for r in skipped], ['INFO'],
                         logs.output)
        if password:
            self.assertFalse(any(password in m for m in logs.output),
                             logs.output)
        return (res.status_code, res.headers.get('Location')), flashed

    @patch.object(AuthSourceRegistry._registry[LDAP], 'search_ldap_user',
                  return_value=[True, ''])
    @patch.object(AuthSourceRegistry._registry[LDAP], 'connect')
    def runTest(self, connect_mock, search_mock):
        connect_mock.return_value = [True, 'Done'] if self.ldap_accepts \
            else [False, 'Invalid credentials']

        response, flashed = self._login(self.typed_password)

        if self.expect == 'ldap_login':
            self.assertEqual(self._logged_in_id(), self.ids[LDAP], flashed)
        else:
            self.assertIsNone(self._logged_in_id())
        if self.expect == 'locked':
            self.assertTrue(any(LOCKED_MSG in m for m in flashed), flashed)
        else:
            self.assertFalse(any(LOCKED_MSG in m for m in flashed), flashed)

        if self.expect == 'neutral':
            self.assertEqual(flashed, [NEUTRAL_MSG])
            # A wrong password is shown exactly the same.
            self.tester.logout()
            wrong_response, wrong_flashed = self._login('wrong-password')
            self.assertIsNone(self._logged_in_id())
            self.assertEqual((wrong_response, wrong_flashed),
                             (response, flashed))

        # The skipped internal authentication is not a failed login.
        self.assertEqual(self._attempts(), (MAX_ATTEMPTS, True))

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        login_tester_account(cls.tester)
