##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import base64
import os

from cryptography.fernet import Fernet

from pgadmin.settings import get_application_state_fernet
from pgadmin.utils.route import BaseTestGenerator


VALID_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()


class TestApplicationStateFernet(BaseTestGenerator):
    """Check that the application state can be encrypted whatever form the
    SECRET_KEY takes, including legacy keys that are not valid Fernet
    keys."""

    scenarios = [
        ('A valid Fernet key is used as-is',
         dict(secret_key=VALID_KEY, used_as_is=True)),
        ('A legacy plain-text key is accepted',
         dict(secret_key='my-old-secret-key', used_as_is=False)),
        ('A legacy key of 44 characters that is not base64 is accepted',
         dict(secret_key='!' * 44, used_as_is=False)),
        ('A legacy bytes key is accepted',
         dict(secret_key=b'my-old-secret-key', used_as_is=False)),
    ]

    def setUp(self):
        self.saved_secret_key = self.app.config.get('SECRET_KEY')
        self.app.config['SECRET_KEY'] = self.secret_key

    def tearDown(self):
        self.app.config['SECRET_KEY'] = self.saved_secret_key

    def runTest(self):
        with self.app.app_context():
            fernet = get_application_state_fernet()
            token = fernet.encrypt(b'{"sql": "SELECT 1"}')

            # A fresh instance must decrypt what an earlier one encrypted,
            # as state is saved and restored by separate requests.
            self.assertEqual(
                get_application_state_fernet().decrypt(token),
                b'{"sql": "SELECT 1"}')

            if self.used_as_is:
                # Existing installations must still be able to read the
                # state they have already stored.
                self.assertEqual(
                    Fernet(self.secret_key.encode()).decrypt(token),
                    b'{"sql": "SELECT 1"}')
