##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data
from regression import test_utils as utils


class LoginTestCase(BaseTestGenerator):
    """
    This class checks login functionality by validating different scenarios.
    Login scenarios are defined in dictionary; where dict of parameters
    describe the scenario appended by test name.
    """

    scenarios = [
        # This test case validates the invalid/incorrect password
        ('TestCase for Checking Invalid_Password', dict(
            email=(config_data['pgAdmin4_login_credentials']
                   ['login_username']),
            password=str(uuid.uuid4())[4:8],
            respdata='Invalid password')),

        # This test case validates the empty password field
        ('Empty_Password', dict(
            email=(config_data['pgAdmin4_login_credentials']
                   ['login_username']), password='',
            respdata='Password not provided')),

        # This test case validates blank email field
        ('Empty_Email', dict(
            email='', password=(config_data['pgAdmin4_login_credentials']
                                ['login_password']),
            respdata='Email not provided')),

        # This test case validates empty email and password
        ('Empty_Credentials', dict(
            email='', password='',
            respdata='Email not provided')),

        # This test case validates the invalid/incorrect email id
        ('Invalid_Email', dict(
            email=str(uuid.uuid4())[1:6] + '@xyz.com',
            password=(config_data['pgAdmin4_login_credentials']
                      ['login_password']),
            respdata='Specified user does not exist')),

        # This test case validates invalid email and password
        ('Invalid_Credentials', dict(
            email=str(uuid.uuid4())[1:6] + '@xyz.com',
            password=str(uuid.uuid4())[4:8],
            respdata='Specified user does not exist')),

        # This test case validates the valid/correct credentials and allow user
        # to login pgAdmin 4
        ('Valid_Credentials', dict(
            email=(config_data['pgAdmin4_login_credentials']
                   ['login_username']),
            password=(config_data['pgAdmin4_login_credentials']
                      ['login_password']),
            respdata='Gravatar image for %s' %
                     config_data['pgAdmin4_login_credentials']
                     ['login_username']))
    ]

    @classmethod
    def setUpClass(cls):
        """
        We need to logout the test client as we are testing scenarios of
        logging in the client like invalid password, invalid emails,
        empty credentials etc.
        """
        utils.logout_tester_account(cls.tester)

    def runTest(self):
        """This function checks login functionality."""

        response = self.tester.post('/login', data=dict(
            email=self.email, password=self.password),
                                    follow_redirects=True)
        self.assertTrue(self.respdata in response.data.decode('utf8'))

    @classmethod
    def tearDownClass(cls):
        """
        We need to again login the test client as soon as test scenarios
        finishes.
        """
        utils.login_tester_account(cls.tester)
