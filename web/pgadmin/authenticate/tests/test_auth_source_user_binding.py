##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that the Kerberos, Internal and OAuth2 authentication sources only
log in, or create, the account from their own auth source, even when an
account from another source shares the username.

The colliding account is added first, so that it is the one an unfiltered
lookup by username would find. See test_ldap_auth_source_binding.py for
LDAP and for why the authenticate modules are imported inside runTest().
"""

import importlib
from unittest.mock import patch

import config
from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL, KERBEROS, LDAP, OAUTH2
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.user_utils import add_user, \
    push_app_context

COLLIDING_USERNAME = 'source-collision@example.com'


class _FakeForm:
    def __init__(self, username, user=None):
        self.data = {'email': username}
        if user is not None:
            self.user = user


def _auth_class(source):
    if source == KERBEROS:
        from pgadmin.authenticate.kerberos import KerberosAuthentication
        return KerberosAuthentication
    from pgadmin.authenticate.internal import InternalAuthentication
    return InternalAuthentication


class _CollidingUsersMixin:
    def setUp(self):
        push_app_context(self)
        self.users = {}
        for auth_source, role_name in self.accounts:
            uid = add_user(self, COLLIDING_USERNAME, auth_source, role_name)
            self.users[auth_source] = db.session.get(User, uid)


class AuthSourceLoginBindingTestCase(_CollidingUsersMixin,
                                     BaseTestGenerator):
    """login() must log in the account from the source that authenticated
    the user, never one from another source with the same username.
    """

    scenarios = [
        ('Kerberos: colliding internal admin, no form.user',
         dict(source=KERBEROS, form_user=None,
              accounts=[(INTERNAL, 'Administrator'), (KERBEROS, 'User')],
              expected=KERBEROS)),

        ('Kerberos: form.user is the colliding internal admin',
         dict(source=KERBEROS, form_user=INTERNAL,
              accounts=[(INTERNAL, 'Administrator'), (KERBEROS, 'User')],
              expected=KERBEROS)),

        ('Kerberos: only an internal account exists',
         dict(source=KERBEROS, form_user=None,
              accounts=[(INTERNAL, 'Administrator')],
              expected=None)),

        # Flask-Security verified the password against form.user, so
        # internal login must log in that account or nothing: never an
        # account it did not verify.
        ('Internal: form.user is the internal account',
         dict(source=INTERNAL, form_user=INTERNAL,
              accounts=[(LDAP, 'Administrator'), (INTERNAL, 'User')],
              expected=INTERNAL)),

        ('Internal: colliding LDAP account, no form.user',
         dict(source=INTERNAL, form_user=None,
              accounts=[(LDAP, 'Administrator'), (INTERNAL, 'User')],
              expected=None)),

        ('Internal: form.user is the colliding LDAP account',
         dict(source=INTERNAL, form_user=LDAP,
              accounts=[(LDAP, 'Administrator'), (INTERNAL, 'User')],
              expected=None)),
    ]

    def runTest(self):
        auth_class = _auth_class(self.source)
        # Patch login_user where the login() in use is defined.
        module = auth_class.login.__module__
        auth = auth_class()
        form = _FakeForm(COLLIDING_USERNAME, self.users.get(self.form_user))

        with self.app.test_request_context('/'), \
                patch(module + '.login_user',
                      return_value=True) as mock_login_user:
            status, message = auth.login(form)

        if self.expected is None:
            self.assertFalse(
                status,
                "login() must not fall back to an account from another "
                "auth source")
            mock_login_user.assert_not_called()
            return

        self.assertTrue(status, message)
        mock_login_user.assert_called_once()
        logged_in = mock_login_user.call_args[0][0]
        self.assertEqual(logged_in.id, self.users[self.expected].id)
        self.assertEqual(logged_in.auth_source, self.expected)
        self.assertFalse(logged_in.has_role('Administrator'))


class KerberosFormUserOtherAccountTestCase(BaseTestGenerator):
    """Kerberos login must log in the account of the authenticated
    principal, not form.user. Flask-Security's validation, run for internal
    authentication when it is listed first, sets form.user to the account
    whose email was typed in the form, which may be another Kerberos
    account.
    """

    AUTHENTICATED = 'krb-authenticated@EXAMPLE.COM'
    TYPED = 'krb-typed@EXAMPLE.COM'

    def setUp(self):
        push_app_context(self)
        self.users = {}
        for username, role_name in ((self.AUTHENTICATED, 'User'),
                                    (self.TYPED, 'Administrator')):
            uid = add_user(self, username, KERBEROS, role_name)
            self.users[username] = db.session.get(User, uid)

    def runTest(self):
        auth_class = _auth_class(KERBEROS)
        # AuthSourceManager.authenticate() puts the principal in the form.
        form = _FakeForm(self.AUTHENTICATED, self.users[self.TYPED])

        with self.app.test_request_context('/'), \
                patch(auth_class.login.__module__ + '.login_user',
                      return_value=True) as mock_login_user:
            status, message = auth_class().login(form)

        self.assertTrue(status, message)
        mock_login_user.assert_called_once()
        self.assertEqual(mock_login_user.call_args[0][0].id,
                         self.users[self.AUTHENTICATED].id)


class OAuth2LoginBindingTestCase(_CollidingUsersMixin, BaseTestGenerator):
    """OAuth2 login must log in, or create, the OAuth2 account, never an
    account from another source with the same username. The identity
    provider is stubbed out; only the account lookup is exercised.
    """

    scenarios = [
        ('colliding internal admin',
         dict(accounts=[(INTERNAL, 'Administrator'), (OAUTH2, 'User')],
              auto_create=False, expected=OAUTH2, expect_create=False)),

        ('only an internal account exists, no auto-creation',
         dict(accounts=[(INTERNAL, 'Administrator')],
              auto_create=False, expected=None, expect_create=False)),

        ('only an internal account exists: the OAuth2 one is created',
         dict(accounts=[(INTERNAL, 'Administrator')],
              auto_create=True, expected=None, expect_create=True)),
    ]

    def runTest(self):
        # See test_oauth2_userinfo_endpoint.py for why import_module.
        oauth2_module = importlib.import_module('pgadmin.authenticate.oauth2')
        auth_class = oauth2_module.OAuth2Authentication

        auth = auth_class.__new__(auth_class)
        auth.oauth2_current_client = 'test_provider'
        auth.oauth2_config = {
            'test_provider': {'OAUTH2_NAME': 'test_provider'}}
        profile = {'email': COLLIDING_USERNAME}

        with self.app.test_request_context('/'), \
                patch.object(config, 'OAUTH2_AUTO_CREATE_USER',
                             self.auto_create), \
                patch.object(auth, 'get_user_profile', return_value=profile), \
                patch.object(auth, 'get_profile_dict', return_value=profile), \
                patch.object(auth, '_get_id_token_claims', return_value={}), \
                patch.object(auth, '_is_oidc_provider', return_value=False), \
                patch.object(auth, '_resolve_username',
                             return_value=(COLLIDING_USERNAME,
                                           COLLIDING_USERNAME)), \
                patch.object(auth, '_extract_server_group_claims',
                             return_value=None), \
                patch.object(oauth2_module, 'create_user',
                             return_value=(True, None)) as mock_create_user, \
                patch.object(oauth2_module, 'login_user',
                             return_value=True) as mock_login_user:
            status, _ = auth.login(None)

        if self.expect_create:
            mock_create_user.assert_called_once()
            self.assertEqual(mock_create_user.call_args[0][0]['auth_source'],
                             OAUTH2)
        else:
            mock_create_user.assert_not_called()

        if self.expected is None:
            # Nothing is logged in as the internal account, whether or not
            # an OAuth2 one was (notionally) created.
            for call in mock_login_user.call_args_list:
                self.assertIsNone(call[0][0])
            if not self.expect_create:
                self.assertFalse(status)
            return

        mock_login_user.assert_called_once()
        logged_in = mock_login_user.call_args[0][0]
        self.assertEqual(logged_in.id, self.users[self.expected].id)
        self.assertFalse(logged_in.has_role('Administrator'))
