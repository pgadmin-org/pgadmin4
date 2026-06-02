##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import login_tester_account
from regression.test_setup import config_data


class ResetPasswordTestCase(BaseTestGenerator):
    """
    This class validates the reset password functionality by defining
    scenarios; Each dict parameter describe a scenario appended by
    test name.
    """

    scenarios = [
        # This test case validates the empty email field
        ('TestCase for Validating Empty Email', dict(
            email='', respdata='Email not provided',
            expect_status=400)),

        # This test case validates the invalid/incorrect email field
        ('TestCase for Validating Invalid_Email', dict(
            email=str(uuid.uuid4())[1:8] + '@xyz.com',
            respdata='Incorrect username or password',
            expect_status=400)),

        # This test case validates the valid email id
        ('TestCase for Validating Valid_Email', dict(
            email=config_data['pgAdmin4_login_credentials']
            ['login_username'],
            respdata='Password reset instructions sent',
            expect_status=200))
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    # No need to call baseclass setup function
    def setUp(self):
        pass

    def runTest(self):
        """This function checks reset password functionality.

        The /browser/reset_password endpoint is now a JSON API; the
        legacy 'Recover Password' HTML form is rendered client-side by
        the React SPA and not visible to the test client.
        """
        import json as _json

        # Get a CSRF token from the SPA shell.
        get_res = self.tester.get('/browser/reset_password')
        csrf_token = self.tester.fetch_csrf(get_res)

        response = self.tester.post(
            '/browser/reset_password',
            data=_json.dumps(dict(
                email=self.email, csrf_token=csrf_token)),
            content_type='application/json',
            follow_redirects=True)
        self.assertEqual(
            response.status_code, self.expect_status,
            'Expected status %d, got %d (body: %s)' % (
                self.expect_status, response.status_code,
                response.data.decode('utf-8')[:200]))
        self.assertIn(self.respdata, response.data.decode('utf-8'))

    @classmethod
    def tearDownClass(cls):
        login_tester_account(cls.tester)
