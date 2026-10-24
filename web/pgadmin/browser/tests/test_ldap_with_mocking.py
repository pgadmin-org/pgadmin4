##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config as app_config
from pgAdmin4 import app
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.python_test_utils.user_utils import add_user
from regression.test_setup import config_data
from pgadmin.authenticate.registry import AuthSourceRegistry
from unittest.mock import patch
from pgadmin.utils.constants import LDAP, INTERNAL
from pgadmin.model import db, User


class LDAPLoginMockTestCase(BaseTestGenerator):
    """
    This class checks ldap login functionality by mocking
    ldap connection and ldap search functionality.
    """

    scenarios = [
        ('LDAP Authentication with Auto Create User', dict(
            auth_source=[LDAP],
            auto_create_user=True,
            username='ldap_user',
            password='ldap_pass')),
        ('LDAP Authentication without Auto Create User', dict(
            auth_source=[LDAP],
            auto_create_user=False,
            ldap_account=True,
            username='ldap_user',
            password='ldap_pass')),
        # LDAP refuses the internal account's credentials, so the user is
        # logged in by internal authentication.
        ('LDAP + Internal Authentication', dict(
            auth_source=[LDAP, INTERNAL],
            auto_create_user=False,
            ldap_bind=False,
            username=config_data[
                'pgAdmin4_login_credentials']['login_username'],
            password=config_data[
                'pgAdmin4_login_credentials']['login_password']
        )),
        # LDAP accepts a user whose username is that of an internal account
        # and who has no LDAP account. They must not be logged in as the
        # internal account, whichever source is tried first. With internal
        # first, Flask-Security's validation sets form.user to the internal
        # account although its password does not match.
        ('LDAP accepts an internal username, LDAP first', dict(
            auth_source=[LDAP, INTERNAL],
            auto_create_user=False,
            username=config_data[
                'pgAdmin4_login_credentials']['login_username'],
            password='ldap-only-password',
            expect_login=False
        )),
        ('LDAP accepts an internal username, internal first', dict(
            auth_source=[INTERNAL, LDAP],
            auto_create_user=False,
            username=config_data[
                'pgAdmin4_login_credentials']['login_username'],
            password='ldap-only-password',
            expect_login=False
        )),
        # A successful login through another source must not reset the
        # failed login attempts of the internal account with that username,
        # or such logins could be used to keep guessing its password.
        ('LDAP login keeps the internal account\'s failed attempts', dict(
            auth_source=[LDAP, INTERNAL],
            auto_create_user=True,
            username=config_data[
                'pgAdmin4_login_credentials']['login_username'],
            password='ldap-only-password',
            internal_attempts=1
        )),
    ]

    ldap_bind = True
    # Whether the test adds the LDAP account the login needs.
    ldap_account = False
    expect_login = True
    internal_attempts = None

    @classmethod
    def setUpClass(cls):
        """
        We need to logout the test client as we are testing
        ldap login scenarios.
        """
        cls.tester.logout()

    _CONFIG = ('AUTHENTICATION_SOURCES', 'LDAP_AUTO_CREATE_USER',
               'LDAP_ANONYMOUS_BIND', 'LDAP_BIND_USER', 'LDAP_BIND_PASSWORD')

    def setUp(self):
        # Restored when the test ends, even if setUp() fails part way, so
        # that later tests see the usual config.
        for name in self._CONFIG:
            self.addCleanup(setattr, app_config, name,
                            getattr(app_config, name))
        app_config.AUTHENTICATION_SOURCES = self.auth_source
        app_config.LDAP_AUTO_CREATE_USER = self.auto_create_user
        app_config.LDAP_ANONYMOUS_BIND = False
        app_config.LDAP_BIND_USER = None
        app_config.LDAP_BIND_PASSWORD = None
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = LDAP
        if self.ldap_account:
            add_user(self, self.username, LDAP)
        elif self.auto_create_user:
            self.addCleanup(self._delete_ldap_account)
        if self.internal_attempts is not None:
            self.addCleanup(self._set_internal_attempts, 0)
            self._set_internal_attempts(self.internal_attempts)

    def _delete_ldap_account(self):
        # The login created the LDAP account and rows of its own, such as a
        # server group; delete_user() removes them all, so that a user
        # created later with the same id does not inherit them.
        from pgadmin.tools.user_management import delete_user
        with self.app.app_context():
            for user in User.query.filter_by(username=self.username,
                                             auth_source=LDAP).all():
                status, msg = delete_user(user.id)
                self.assertTrue(status, msg)

    def _internal_user(self):
        return User.query.filter_by(username=self.username,
                                    auth_source=INTERNAL).first()

    def _set_internal_attempts(self, attempts):
        with self.app.app_context():
            self._internal_user().login_attempts = attempts
            db.session.commit()

    @patch.object(AuthSourceRegistry._registry[LDAP], 'connect',
                  return_value=[True, "Done"])
    @patch.object(AuthSourceRegistry._registry[LDAP], 'search_ldap_user',
                  return_value=[True, ''])
    def runTest(self, search_mock_obj, conn_mock_obj):
        """This function checks ldap login functionality."""
        if not self.ldap_bind:
            conn_mock_obj.return_value = [False, "Invalid credentials"]
        AuthSourceRegistry._registry[LDAP].dedicated_user = False
        res = self.tester.login(self.username, self.password, True)
        # The "Gravatar image for X" HTML is no longer server-rendered
        # in the React SPA. Verify successful login via session state.
        self.assertEqual(res.status_code, 200)
        with self.tester.session_transaction() as sess:
            if self.expect_login:
                self.assertIsNotNone(
                    sess.get('_user_id'),
                    'Post-login session should contain _user_id')
            else:
                self.assertIsNone(
                    sess.get('_user_id'),
                    'An LDAP login must not log in an internal account')
        if self.internal_attempts is not None:
            with self.app.app_context():
                self.assertEqual(self._internal_user().login_attempts,
                                 self.internal_attempts)

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
        app.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL
        utils.login_tester_account(cls.tester)
