##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that a password reset only ever acts on an internal account, even
when an account from another auth source has the same email address.

Flask-Security looks the account up by email alone, so with an LDAP
account created before the internal one it finds the LDAP account.
"""

import json

from flask_security.recoverable import generate_reset_password_token
from flask_security.signals import reset_password_instructions_sent
from flask_security.utils import hash_password

from pgadmin.model import User
from pgadmin.utils.constants import INTERNAL, LDAP
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.python_test_utils.user_utils import add_user

SHARED_EMAIL = 'reset-collision@example.com'


class ResetPasswordAuthSourceTestCase(BaseTestGenerator):
    """A reset is requested for, and applied to, the internal account."""

    scenarios = [
        ('Reset instructions are sent for the internal account',
         dict(step='request', typed_email=SHARED_EMAIL)),
        ('A reset token for the internal account is accepted',
         dict(step='reset', auth_source=INTERNAL)),
        ('A reset token for an LDAP account is refused',
         dict(step='reset', auth_source=LDAP)),
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    def setUp(self):
        # The LDAP account is created first, so that a lookup by email
        # alone finds it.
        add_user(self, 'reset-ldap-user', LDAP, email=SHARED_EMAIL)
        with self.app.app_context():
            password = hash_password('internal-password')
        add_user(self, SHARED_EMAIL, INTERNAL, password=password)

    def _user(self, auth_source):
        return User.query.filter_by(email=SHARED_EMAIL,
                                    auth_source=auth_source).first()

    def runTest(self):
        if self.step == 'request':
            self._request_reset()
        else:
            self._reset_with_token()

    def _request_reset(self):
        sent_to = []

        def record(sender, user, **kwargs):
            sent_to.append((user.id, user.auth_source))

        get_res = self.tester.get('/browser/reset_password')
        csrf_token = self.tester.fetch_csrf(get_res)
        with reset_password_instructions_sent.connected_to(record):
            response = self.tester.post(
                '/browser/reset_password',
                data=json.dumps(dict(email=self.typed_email,
                                     csrf_token=csrf_token)),
                content_type='application/json',
                follow_redirects=True)

        self.assertEqual(response.status_code, 200,
                         response.data.decode('utf-8')[:200])
        with self.app.app_context():
            internal_id = self._user(INTERNAL).id
        self.assertEqual(sent_to, [(internal_id, INTERNAL)])

    def _reset_with_token(self):
        with self.app.test_request_context():
            user = self._user(self.auth_source)
            old_password = user.password
            token = generate_reset_password_token(user)

        csrf_token = self.tester.fetch_csrf(
            self.tester.get('/browser/reset_password'))
        self.tester.post(
            '/browser/reset_password/' + token,
            data=dict(password='new-password-1',
                      password_confirm='new-password-1',
                      csrf_token=csrf_token),
            follow_redirects=False)

        with self.app.app_context():
            new_password = self._user(self.auth_source).password
        with self.tester.session_transaction() as sess:
            logged_in = sess.get('_user_id') is not None
        self.tester.logout()

        if self.auth_source == INTERNAL:
            self.assertNotEqual(new_password, old_password)
            self.assertTrue(logged_in)
        else:
            self.assertIsNone(new_password)
            self.assertFalse(logged_in)

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        login_tester_account(cls.tester)
