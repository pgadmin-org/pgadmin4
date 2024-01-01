##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
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
            email='', respdata='Email not provided')),

        # This test case validates the invalid/incorrect email field
        ('TestCase for Validating Invalid_Email', dict(
            email=str(uuid.uuid4())[1:8] + '@xyz.com',
            respdata='Incorrect username or password')),

        # This test case validates the valid email id
        ('TestCase for Validating Valid_Email', dict(
            email=config_data['pgAdmin4_login_credentials']
            ['login_username'], respdata='pgAdmin 4'))
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    # No need to call baseclass setup function
    def setUp(self):
        pass

    def runTest(self):
        """This function checks reset password functionality."""

        response = self.tester.get('/browser/reset_password')
        self.assertTrue(
            'Recover Password' in response.data.decode('utf-8')
        )
        self.assertTrue(
            'Enter the email address for the user account you wish to '
            'recover the password for' in response.data.decode('utf-8')
        )
        response = self.tester.post(
            '/browser/reset_password', data=dict(email=self.email),
            follow_redirects=True)
        self.assertTrue(self.respdata in response.data.decode('utf-8'))

    @classmethod
    def tearDownClass(cls):
        login_tester_account(cls.tester)
