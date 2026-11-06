##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that login finds the right internal account when two of them
differ only in the case of their name.

The account is looked up ignoring case, so the exact-case match must win
over the other one, and the oldest account when neither matches exactly.
"""

from unittest.mock import patch

import config
import flask
from flask_security.utils import hash_password

from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.python_test_utils.user_utils import add_user

LOWER = 'case-variant@example.com'
UPPER = 'Case-Variant@example.com'
PASSWORDS = {LOWER: 'lower-password', UPPER: 'upper-password'}
MAX_ATTEMPTS = 3


class CaseVariantAccountsTestCase(BaseTestGenerator):
    """Each of two case variant accounts logs in, and has failed logins
    counted, as itself."""

    scenarios = [
        ('Log in as the older of two case variant accounts',
         dict(created=(LOWER, UPPER), typed=LOWER, expect='login')),
        ('Log in as the newer of two case variant accounts',
         dict(created=(LOWER, UPPER), typed=UPPER, expect='login')),
        ('Log in as the older account, created with upper case',
         dict(created=(UPPER, LOWER), typed=UPPER, expect='login')),
        ('Log in as the newer account, created with lower case',
         dict(created=(UPPER, LOWER), typed=LOWER, expect='login')),
        # Neither matches exactly: the oldest account is the one used.
        ('Log in as the oldest account when neither case matches',
         dict(created=(UPPER, LOWER), typed=LOWER.upper(), owner=UPPER,
              expect='login')),
        ('A wrong password counts against the exact-case account',
         dict(created=(LOWER, UPPER), typed=UPPER, expect='counted')),
        ('A wrong password counts against the exact-case account, older',
         dict(created=(UPPER, LOWER), typed=LOWER, expect='counted')),
    ]

    owner = None

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    def setUp(self):
        for name in ('AUTHENTICATION_SOURCES', 'MAX_LOGIN_ATTEMPTS'):
            self.addCleanup(setattr, config, name, getattr(config, name))
        config.AUTHENTICATION_SOURCES = [INTERNAL]
        config.MAX_LOGIN_ATTEMPTS = MAX_ATTEMPTS

        self.ids = {}
        for username in self.created:
            with self.app.app_context():
                password = hash_password(PASSWORDS[username])
            self.ids[username] = add_user(self, username, INTERNAL,
                                          password=password)
        if self.owner is None:
            self.owner = self.typed
        self.addCleanup(self.tester.logout)

    def _attempts(self, username):
        with self.app.app_context():
            return db.session.get(User, self.ids[username]).login_attempts

    def _logged_in_id(self):
        with self.tester.session_transaction() as sess:
            uniquifier = sess.get('_user_id')
        if uniquifier is None:
            return None
        with self.app.app_context():
            return User.query.filter_by(fs_uniquifier=uniquifier).first().id

    def runTest(self):
        if self.expect == 'login':
            with patch('pgadmin.authenticate.flash',
                       wraps=flask.flash) as flash_mock:
                self.tester.login(self.typed, PASSWORDS[self.owner])
            self.assertEqual(self._logged_in_id(), self.ids[self.owner],
                             flash_mock.call_args_list)
            return

        self.tester.login(self.typed, 'wrong-password')
        self.assertIsNone(self._logged_in_id())
        other = UPPER if self.typed == LOWER else LOWER
        self.assertEqual((self._attempts(self.typed), self._attempts(other)),
                         (1, 0))

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        login_tester_account(cls.tester)
