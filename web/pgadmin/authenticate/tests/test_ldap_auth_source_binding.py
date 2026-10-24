##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that LDAPAuthentication.login() only ever logs in the
LDAP-sourced account, even when an account from another auth source
(e.g. the internal default admin) shares the same username.

These tests use real User rows in the pgAdmin SQLite database, but need
no Postgres server, so setUp() skips BaseTestGenerator.setUp()'s
connect_server(). login_user is patched to capture which account would
have been logged in, without touching the session.

LDAPAuthentication is imported inside runTest() rather than at module
level for the same reason given in test_webserver_remote_user_trust.py:
test_auth_gating.py evicts the authenticate modules from sys.modules, so
a module-level import would bind a class that patch() no longer reaches.
"""

from unittest.mock import patch

import config
from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL, LDAP
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.user_utils import add_user, \
    push_app_context

COLLIDING_USERNAME = 'ldap-collision@example.com'


class _FakeForm:
    def __init__(self, user=None):
        if user is not None:
            self.user = user


class LDAPLoginAuthSourceBindingTestCase(BaseTestGenerator):
    """login() must resolve the LDAP-sourced account, never an account
    from another source that happens to share the username.
    """

    scenarios = [
        ('form.user is the colliding internal admin',
         dict(form_user=INTERNAL, case_sensitive=True,
              login_name=COLLIDING_USERNAME, create_ldap=True,
              expected=LDAP)),

        ('form.user is the colliding internal admin, case-insensitive',
         dict(form_user=INTERNAL, case_sensitive=False,
              login_name=COLLIDING_USERNAME.upper(), create_ldap=True,
              expected=LDAP)),

        ('no form.user, case-sensitive lookup',
         dict(form_user=None, case_sensitive=True,
              login_name=COLLIDING_USERNAME, create_ldap=True,
              expected=LDAP)),

        ('no form.user, case-insensitive lookup',
         dict(form_user=None, case_sensitive=False,
              login_name=COLLIDING_USERNAME.upper(), create_ldap=True,
              expected=LDAP)),

        ('form.user is already the LDAP account',
         dict(form_user=LDAP, case_sensitive=True,
              login_name=COLLIDING_USERNAME, create_ldap=True,
              expected=LDAP)),

        ('only an internal account exists: case-sensitive lookup fails',
         dict(form_user=INTERNAL, case_sensitive=True,
              login_name=COLLIDING_USERNAME, create_ldap=False,
              expected=None)),

        ('only an internal account exists: case-insensitive lookup fails',
         dict(form_user=None, case_sensitive=False,
              login_name=COLLIDING_USERNAME, create_ldap=False,
              expected=None)),
    ]

    # No Postgres server interaction needed.
    def setUp(self):
        # Don't rely on the runner's app context surviving earlier tests.
        push_app_context(self)
        self.addCleanup(setattr, config, 'LDAP_DN_CASE_SENSITIVE',
                        config.LDAP_DN_CASE_SENSITIVE)
        self.users = {}
        self._add_user(INTERNAL, 'Administrator')
        if self.create_ldap:
            self._add_user(LDAP, 'User')

    def _add_user(self, auth_source, role_name):
        uid = add_user(self, COLLIDING_USERNAME, auth_source, role_name)
        self.users[auth_source] = db.session.get(User, uid)

    def runTest(self):
        from pgadmin.authenticate.ldap import LDAPAuthentication

        config.LDAP_DN_CASE_SENSITIVE = self.case_sensitive

        auth = LDAPAuthentication()
        auth.username = self.login_name
        form = _FakeForm(self.users.get(self.form_user))

        with self.app.test_request_context('/'), \
                patch('pgadmin.authenticate.ldap.login_user',
                      return_value=True) as mock_login_user:
            status, message = auth.login(form)

        if self.expected is None:
            self.assertFalse(
                status,
                "login() must not fall back to an account from another "
                "auth source when no LDAP account exists")
            mock_login_user.assert_not_called()
            return

        self.assertTrue(status, message)
        mock_login_user.assert_called_once()
        logged_in = mock_login_user.call_args[0][0]
        self.assertEqual(logged_in.id, self.users[LDAP].id)
        self.assertEqual(logged_in.auth_source, LDAP)
        self.assertFalse(logged_in.has_role('Administrator'))


class LDAPFormUserOtherAccountTestCase(BaseTestGenerator):
    """login() must log in the account of the user LDAP authenticated, not
    form.user, which Flask-Security sets to the account whose email matches
    the typed username and which may be another LDAP account.
    """

    AUTHENTICATED = 'ldap-authenticated'
    OTHER = 'ldap-other'

    def setUp(self):
        push_app_context(self)
        self.users = {}
        # The other account's email is the authenticated user's username.
        for username, email, role_name in (
                (self.AUTHENTICATED, 'authenticated@example.com', 'User'),
                (self.OTHER, self.AUTHENTICATED, 'Administrator')):
            uid = add_user(self, username, LDAP, role_name, email=email)
            self.users[username] = db.session.get(User, uid)

    def runTest(self):
        from pgadmin.authenticate.ldap import LDAPAuthentication

        auth = LDAPAuthentication()
        auth.username = self.AUTHENTICATED
        form = _FakeForm(self.users[self.OTHER])

        with self.app.test_request_context('/'), \
                patch('pgadmin.authenticate.ldap.login_user',
                      return_value=True) as mock_login_user:
            status, message = auth.login(form)

        self.assertTrue(status, message)
        mock_login_user.assert_called_once()
        self.assertEqual(mock_login_user.call_args[0][0].id,
                         self.users[self.AUTHENTICATED].id)
