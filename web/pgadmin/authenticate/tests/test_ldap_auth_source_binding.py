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
from pgadmin.model import db, Role, User
from pgadmin.utils.constants import INTERNAL, LDAP
from pgadmin.utils.route import BaseTestGenerator

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
        self._app_ctx = self.app.app_context()
        self._app_ctx.push()
        self._orig_case_sensitive = config.LDAP_DN_CASE_SENSITIVE
        self.users = {}
        self._add_user(INTERNAL, 'Administrator')
        if self.create_ldap:
            self._add_user(LDAP, 'User')
        db.session.commit()

    def _add_user(self, auth_source, role_name):
        user = User(username=COLLIDING_USERNAME,
                    email=COLLIDING_USERNAME,
                    auth_source=auth_source,
                    active=True,
                    roles=[Role.query.filter_by(name=role_name).first()])
        db.session.add(user)
        self.users[auth_source] = user

    def tearDown(self):
        config.LDAP_DN_CASE_SENSITIVE = self._orig_case_sensitive
        for user in self.users.values():
            db.session.delete(user)
        db.session.commit()
        self._app_ctx.pop()

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
