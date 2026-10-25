##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that a login POST carrying a password does not fall back to
Webserver authentication.

A Webserver user's identity comes from the web server in front of pgAdmin,
and their login posts no password. Were Webserver authentication tried
after a wrong internal password, someone with a Webserver identity could
post another user's email with a guess: the right password would log them
in as that user, and a wrong one silently as themselves, nothing counted.
The Webserver identity is mocked.
"""

from unittest.mock import patch

import config
from flask_security.utils import hash_password

from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL, WEBSERVER
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.python_test_utils.user_utils import add_user

USERNAME = 'webserver-password-user@example.com'
PASSWORD = 'internal-password'
WEBSERVER_USERNAME = 'webserver-identity-user'
MAX_ATTEMPTS = 3


class WebserverPasswordLoginTestCase(BaseTestGenerator):
    """A password is checked by internal authentication only."""

    scenarios = [
        ('A wrong internal password does not log in the Webserver user',
         dict(email=USERNAME, typed_password='wrong-password',
              expect=None, attempts=1)),
        ('The right internal password logs in the internal user',
         dict(email=USERNAME, typed_password=PASSWORD,
              expect=INTERNAL, attempts=0)),
        # The Webserver login itself posts no password.
        ('A login without a password logs in the Webserver user',
         dict(email=None, typed_password=None,
              expect=WEBSERVER, attempts=0)),
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    _CONFIG = ('AUTHENTICATION_SOURCES', 'MAX_LOGIN_ATTEMPTS',
               'WEBSERVER_AUTO_CREATE_USER')

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest('Webserver authentication is server mode only.')

        for name in self._CONFIG:
            self.addCleanup(setattr, config, name, getattr(config, name))
        config.AUTHENTICATION_SOURCES = [INTERNAL, WEBSERVER]
        config.MAX_LOGIN_ATTEMPTS = MAX_ATTEMPTS
        config.WEBSERVER_AUTO_CREATE_USER = False

        with self.app.app_context():
            password = hash_password(PASSWORD)
        self.ids = {
            INTERNAL: add_user(self, USERNAME, INTERNAL, password=password),
            WEBSERVER: add_user(self, WEBSERVER_USERNAME, WEBSERVER,
                                email='webserver-identity@example.com'),
        }
        self.addCleanup(self.tester.logout)

    def _attempts(self):
        with self.app.app_context():
            return db.session.get(User, self.ids[INTERNAL]).login_attempts

    def _logged_in_id(self):
        with self.tester.session_transaction() as sess:
            uniquifier = sess.get('_user_id')
        if uniquifier is None:
            return None
        with self.app.app_context():
            return User.query.filter_by(fs_uniquifier=uniquifier).first().id

    def runTest(self):
        from pgadmin.authenticate.registry import AuthSourceRegistry

        # The web server in front of pgAdmin asserts WEBSERVER_USERNAME.
        with patch.object(AuthSourceRegistry._registry[WEBSERVER],
                          'get_user', return_value=WEBSERVER_USERNAME):
            self.tester.login(self.email, self.typed_password)
            logged_in = self._logged_in_id()

        self.assertEqual(logged_in, self.ids.get(self.expect))
        self.assertEqual(self._attempts(), self.attempts)

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        login_tester_account(cls.tester)
