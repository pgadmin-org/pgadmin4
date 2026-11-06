##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that failed logins are counted against the internal account, and
lock it, whatever other auth sources are configured.

With LDAP listed, the login form passes LDAP's validation whatever the
internal password, so the failure is only known once no source has
authenticated the user. LDAP is mocked.
"""

import re
from contextlib import ExitStack
from unittest.mock import patch

import config
import flask
from flask import Response
from flask_security.utils import hash_password

from pgadmin.authenticate.registry import AuthSourceRegistry
from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL, KERBEROS, LDAP
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.python_test_utils.user_utils import add_user

USERNAME = 'login-attempts-user@example.com'
PASSWORD = 'internal-password'
MAX_ATTEMPTS = 3
LOCKED_MSG = ('Your account is locked. Please contact the '
              'Administrator.')


class InternalLoginAttemptsTestCase(BaseTestGenerator):
    """Failed logins lock the internal account; a login through another
    source does not count as one.
    """

    scenarios = [
        ('Wrong internal passwords lock the account',
         dict(auth_sources=[INTERNAL], expect='lock')),
        ('Wrong internal passwords lock the account, LDAP also listed',
         dict(auth_sources=[INTERNAL, LDAP], expect='lock')),
        ('Wrong internal passwords lock the account, LDAP listed first',
         dict(auth_sources=[LDAP, INTERNAL], expect='lock')),
        # Kerberos answers a login without a ticket with a negotiate
        # challenge, which must not stop the failed login being counted.
        ('Wrong internal passwords lock the account, Kerberos also listed',
         dict(auth_sources=[INTERNAL, KERBEROS], expect='lock')),
        # A Kerberos login posts no password: Kerberos is still tried.
        ('A login without a password still tries Kerberos',
         dict(auth_sources=[INTERNAL, KERBEROS], typed_password='',
              expect='kerberos_tried')),
        # Flask-Security matches the typed name ignoring case, and so must
        # the lookup of the account whose failed logins are counted.
        ('Wrong internal passwords typed in another case lock the account',
         dict(auth_sources=[INTERNAL], typed_username=USERNAME.upper(),
              expect='lock')),
        ('A login through LDAP is not counted as a failed login',
         dict(auth_sources=[INTERNAL, LDAP], accounts=(INTERNAL, LDAP),
              ldap_accepts=True, expect='ldap_login')),
        # The internal password is not tried, so the login says nothing
        # about it.
        ('A failed login without internal authentication is not counted',
         dict(auth_sources=[LDAP], expect='not_counted')),
        # Nor when the form fails validation, as with no password.
        ('An empty password without internal authentication is not counted',
         dict(auth_sources=[LDAP], typed_password='',
              expect='not_counted')),
        # Only an internal account has failed logins counted.
        ('A failed login of an LDAP account is not counted',
         dict(auth_sources=[INTERNAL, LDAP], accounts=(LDAP,),
              expect='not_counted')),
    ]

    accounts = (INTERNAL,)
    ldap_accepts = False
    typed_username = USERNAME
    typed_password = 'wrong-password'

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
        self.ids = {}
        for auth_source in self.accounts:
            self.ids[auth_source] = add_user(
                self, USERNAME, auth_source,
                password=password if auth_source == INTERNAL else None)
        self.addCleanup(self.tester.logout)

    def _attempts(self, auth_source=INTERNAL):
        with self.app.app_context():
            user = db.session.get(User, self.ids[auth_source])
            return user.login_attempts, user.locked

    def _logged_in_id(self):
        with self.tester.session_transaction() as sess:
            uniquifier = sess.get('_user_id')
        if uniquifier is None:
            return None
        with self.app.app_context():
            return User.query.filter_by(fs_uniquifier=uniquifier).first().id

    def runTest(self):
        # The auth sources are registered in server mode only, so they are
        # looked up here rather than when the module is imported.
        ldap = AuthSourceRegistry._registry[LDAP]
        kerberos = AuthSourceRegistry._registry[KERBEROS]
        with ExitStack() as stack:
            stack.enter_context(patch.object(
                ldap, 'search_ldap_user', return_value=[True, '']))
            connect_mock = stack.enter_context(patch.object(
                ldap, 'connect'))
            connect_mock.return_value = [True, 'Done'] \
                if self.ldap_accepts else [False, 'Invalid credentials']
            # No ticket: Kerberos challenges the browser to negotiate.
            self.kerberos_mock = stack.enter_context(patch.object(
                kerberos, 'authenticate', return_value=(False, Response(
                    'Unauthorised', 401,
                    {'WWW-Authenticate': 'Negotiate'}))))
            self._run()

    def _run(self):
        if self.expect == 'kerberos_tried':
            res = self.tester.login(self.typed_username, self.typed_password)
            self.assertEqual(res.status_code, 401)
            self.assertTrue(self.kerberos_mock.called)
            self.assertIsNone(self._logged_in_id())
            self.assertEqual(self._attempts(), (0, False))
            return

        if self.expect == 'ldap_login':
            self.tester.login(self.typed_username, 'ldap-password')
            self.assertEqual(self._logged_in_id(), self.ids[LDAP])
            self.assertEqual(self._attempts(), (0, False))
            return

        if self.expect == 'not_counted':
            self.tester.login(self.typed_username, self.typed_password)
            self.assertIsNone(self._logged_in_id())
            for auth_source in self.accounts:
                self.assertEqual(self._attempts(auth_source), (0, False))
            return

        for attempt in range(1, MAX_ATTEMPTS + 1):
            with patch('pgadmin.authenticate.flash',
                       wraps=flask.flash) as flash_mock:
                self.tester.login(self.typed_username, 'wrong-password')
            self.assertIsNone(self._logged_in_id())
            # The last attempt locks the account at once, not at the next
            # login: User.is_active depends on it.
            self.assertEqual(self._attempts(),
                             (attempt, attempt >= MAX_ATTEMPTS))
            # The warning is either the whole message or follows the
            # error, separated by a space. The attempt that locks the
            # account says so rather than "0 more attempt remaining."
            flashed = [str(c.args[0]) for c in flash_mock.call_args_list]
            if attempt < MAX_ATTEMPTS:
                warning = re.compile(r'(^| ){0} more attempts? remaining\.$'
                                     .format(MAX_ATTEMPTS - attempt))
            else:
                warning = re.compile(r'(^| ){0}$'.format(re.escape(
                    LOCKED_MSG)))
                self.assertFalse(
                    any('remaining' in m for m in flashed), flashed)
            self.assertTrue(
                any(warning.search(m) for m in flashed), flashed)

        # The account is now locked: its password no longer logs it in.
        self.tester.login(USERNAME, PASSWORD)
        self.assertIsNone(self._logged_in_id())
        self.assertEqual(self._attempts(), (MAX_ATTEMPTS, True))

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        login_tester_account(cls.tester)
