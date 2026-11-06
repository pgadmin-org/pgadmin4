##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that Flask-Security's own views cannot log a user in or change a
password.

pgAdmin logs users in at /authenticate/login, which counts failed logins
and refuses locked accounts, and changes and resets passwords with views
of its own. Flask-Security still registers its views: they must not be
another way in that skips those checks. GET /login renders pgAdmin's login
page and must keep working.
"""

import logging

import config
from flask_security.recoverable import generate_reset_password_token
from flask_security.utils import hash_password, verify_password

from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.python_test_utils.user_utils import add_user

USERNAME = 'fs-views-user@example.com'
PASSWORD = 'internal-password'
NEW_PASSWORD = 'new-internal-password'
MAX_ATTEMPTS = 3


class FlaskSecurityViewsTestCase(BaseTestGenerator):
    """Flask-Security's views refuse what pgAdmin's own views do."""

    scenarios = [
        ('POST /login with the right password does not log in',
         dict(case='native_login_right')),
        ('POST /login with wrong passwords neither counts nor locks',
         dict(case='native_login_wrong')),
        ('GET /login still renders the login page',
         dict(case='login_page')),
        ('Login through /authenticate/login still works',
         dict(case='pgadmin_login')),
        ('POST /change does not change the password',
         dict(case='native_change')),
        ('POST /verify does not check the password',
         dict(case='native_verify')),
        ('POST /reset does not send reset instructions',
         dict(case='native_forgot')),
        ('POST /reset/<token> does not reset the password',
         dict(case='native_reset')),
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    def setUp(self):
        for name in ('AUTHENTICATION_SOURCES', 'MAX_LOGIN_ATTEMPTS'):
            self.addCleanup(setattr, config, name, getattr(config, name))
        config.AUTHENTICATION_SOURCES = [INTERNAL]
        config.MAX_LOGIN_ATTEMPTS = MAX_ATTEMPTS

        with self.app.app_context():
            password = hash_password(PASSWORD)
        self.uid = add_user(self, USERNAME, INTERNAL, password=password)
        self.addCleanup(self.tester.logout)

    def _user(self):
        with self.app.app_context():
            user = db.session.get(User, self.uid)
            db.session.expunge(user)
            return user

    def _password_is(self, password):
        with self.app.app_context():
            return verify_password(
                password, db.session.get(User, self.uid).password)

    def _logged_in_id(self):
        with self.tester.session_transaction() as sess:
            uniquifier = sess.get('_user_id')
        if uniquifier is None:
            return None
        with self.app.app_context():
            return User.query.filter_by(fs_uniquifier=uniquifier).first().id

    def _login_csrf_token(self):
        res = self.tester.get('/login')
        self.assertEqual(res.status_code, 200)
        token = self.tester.fetch_csrf(res)
        self.assertIsNotNone(token)
        return token

    def _native_login(self, password):
        return self.tester.post('/login', data=dict(
            email=USERNAME, password=password,
            csrf_token=self._login_csrf_token()))

    def runTest(self):
        # A refused request is not an error of pgAdmin's: anyone can send
        # one, so it must not log an error with a traceback.
        errors = []
        handler = logging.Handler(logging.ERROR)
        handler.emit = errors.append
        self.app.logger.addHandler(handler)
        try:
            getattr(self, '_' + self.case)()
        finally:
            self.app.logger.removeHandler(handler)
        self.assertEqual([r.getMessage() for r in errors], [])

    def _assert_refused(self, res):
        self.assertEqual(res.status_code, 405)
        self.assertEqual(
            sorted(m.strip() for m in res.headers['Allow'].split(',')),
            ['GET', 'HEAD', 'OPTIONS'])

    def _native_login_right(self):
        res = self._native_login(PASSWORD)
        self.assertIsNone(self._logged_in_id())
        self._assert_refused(res)

    def _native_login_wrong(self):
        for _ in range(MAX_ATTEMPTS + 1):
            res = self._native_login('wrong-password')
            self.assertIsNone(self._logged_in_id())
            self._assert_refused(res)
        user = self._user()
        self.assertEqual((user.login_attempts, user.locked), (0, False))

    def _login_page(self):
        self._login_csrf_token()

    def _pgadmin_login(self):
        self.tester.login(USERNAME, PASSWORD)
        self.assertEqual(self._logged_in_id(), self.uid)

    def _native_change(self):
        self.tester.login(USERNAME, PASSWORD)
        self.assertEqual(self._logged_in_id(), self.uid)
        res = self.tester.post('/change', data=dict(
            password=PASSWORD, new_password=NEW_PASSWORD,
            new_password_confirm=NEW_PASSWORD,
            csrf_token=self.tester.csrf_token))
        self.assertTrue(self._password_is(PASSWORD))
        self._assert_refused(res)

    def _native_verify(self):
        self.tester.login(USERNAME, PASSWORD)
        self.assertEqual(self._logged_in_id(), self.uid)
        res = self.tester.post('/verify', data=dict(
            password=PASSWORD, csrf_token=self.tester.csrf_token))
        self._assert_refused(res)

    def _native_forgot(self):
        res = self.tester.post('/reset', data=dict(
            email=USERNAME, csrf_token=self._login_csrf_token()))
        self._assert_refused(res)

    def _native_reset(self):
        with self.app.test_request_context():
            token = generate_reset_password_token(
                db.session.get(User, self.uid))
        res = self.tester.post('/reset/' + token, data=dict(
            password=NEW_PASSWORD, password_confirm=NEW_PASSWORD,
            csrf_token=self._login_csrf_token()))
        self.assertTrue(self._password_is(PASSWORD))
        self.assertIsNone(self._logged_in_id())
        self._assert_refused(res)

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        login_tester_account(cls.tester)
