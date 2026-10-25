##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that login and password recovery use the internal account when an
account from another auth source has the same email address.

Flask-Security looks the account up by email alone. The LDAP account is
created first, so that it is the one an unordered lookup finds.
"""

import json

from flask_security.signals import reset_password_instructions_sent
from flask_security.utils import hash_password

from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL, LDAP
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.python_test_utils.user_utils import add_user

SHARED_EMAIL = 'shared-email-lookup@example.com'
INTERNAL_PASSWORD = 'internal-password'


class SharedEmailLookupTestCase(BaseTestGenerator):
    """The internal account is found by login and password recovery."""

    scenarios = [
        ('Internal login with an LDAP account of the same email',
         dict(step='login', ldap_state={})),
        ('Password recovery with an inactive LDAP account of the same email',
         dict(step='recover', ldap_state={'active': False},
              typed_email=SHARED_EMAIL)),
        ('Password recovery with a locked LDAP account of the same email',
         dict(step='recover', ldap_state={'locked': True},
              typed_email=SHARED_EMAIL)),
        # Flask-Security matches the email case-insensitively, and so must
        # the view that picks the account to send the instructions for.
        ('Password recovery with the email typed in another case',
         dict(step='recover', ldap_state={},
              typed_email=SHARED_EMAIL.replace('shared', 'Shared'))),
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    def setUp(self):
        ldap_id = add_user(self, 'shared-email-ldap-user', LDAP,
                           email=SHARED_EMAIL)
        with self.app.app_context():
            ldap_user = db.session.get(User, ldap_id)
            for name, value in self.ldap_state.items():
                setattr(ldap_user, name, value)
            db.session.commit()
            password = hash_password(INTERNAL_PASSWORD)
        self.internal_id = add_user(self, SHARED_EMAIL, INTERNAL,
                                    password=password)
        self.addCleanup(self.tester.logout)

    def runTest(self):
        if self.step == 'login':
            self._login()
        else:
            self._recover()

    def _login(self):
        res = self.tester.login(SHARED_EMAIL, INTERNAL_PASSWORD, True)
        self.assertEqual(res.status_code, 200)
        with self.app.app_context():
            uniquifier = db.session.get(User, self.internal_id).fs_uniquifier
        with self.tester.session_transaction() as sess:
            self.assertEqual(sess.get('_user_id'), uniquifier,
                             'The internal account must be logged in')

    def _recover(self):
        sent_to = []

        def record(sender, user, **kwargs):
            sent_to.append(user.id)

        csrf_token = self.tester.fetch_csrf(
            self.tester.get('/browser/reset_password'))
        with reset_password_instructions_sent.connected_to(record):
            res = self.tester.post(
                '/browser/reset_password',
                data=json.dumps(dict(email=self.typed_email,
                                     csrf_token=csrf_token)),
                content_type='application/json',
                follow_redirects=True)

        self.assertEqual(res.status_code, 200,
                         res.data.decode('utf-8')[:300])
        self.assertEqual(sent_to, [self.internal_id])

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        login_tester_account(cls.tester)
