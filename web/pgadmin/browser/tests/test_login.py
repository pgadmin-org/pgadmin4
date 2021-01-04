##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data


class LoginTestCase(BaseTestGenerator):
    """
    This class checks login functionality by validating different scenarios.
    Login scenarios are defined in dictionary; where dict of parameters
    describe the scenario appended by test name.
    """

    scenarios = [
        # This test case validates the invalid/incorrect password
        ('TestCase for Checking Invalid_Password', dict(
            email=(
                config_data['pgAdmin4_login_credentials']
                ['login_username']),
            password=str(uuid.uuid4())[4:8],
            is_gravtar_image_check=False,
            respdata='Invalid password')),

        # This test case validates the empty password field
        ('Empty_Password', dict(
            email=(
                config_data['pgAdmin4_login_credentials']
                ['login_username']), password='',
            is_gravtar_image_check=False,
            respdata='Password not provided')),

        # This test case validates blank email field
        ('Empty_Email', dict(
            email='', password=(
                config_data['pgAdmin4_login_credentials']
                ['login_password']),
            is_gravtar_image_check=False,
            respdata='Email not provided')),

        # This test case validates empty email and password
        ('Empty_Credentials', dict(
            email='', password='',
            is_gravtar_image_check=False,
            respdata='Email not provided')),

        # This test case validates the invalid/incorrect email id
        ('Invalid_Email', dict(
            email=str(uuid.uuid4())[1:8] + '@xyz.com',
            password=(
                config_data['pgAdmin4_login_credentials']
                ['login_password']),
            is_gravtar_image_check=False,
            respdata='Specified user does not exist')),

        # This test case validates invalid email and password
        ('Invalid_Credentials', dict(
            email=str(uuid.uuid4())[1:8] + '@xyz.com',
            password=str(uuid.uuid4())[4:8],
            is_gravtar_image_check=False,
            respdata='Specified user does not exist')),

        # This test case validates the valid/correct credentials and allow user
        # to login pgAdmin 4
        ('Valid_Credentials', dict(
            email=(
                config_data['pgAdmin4_login_credentials']
                ['login_username']),
            password=(
                config_data['pgAdmin4_login_credentials']
                ['login_password']),
            is_gravtar_image_check=True,
            respdata_without_gravtar=config_data['pgAdmin4_login_credentials']
            ['login_username'],
            respdata='Gravatar image for %s' %
                     config_data['pgAdmin4_login_credentials']
                     ['login_username']),
         )
    ]

    @classmethod
    def setUpClass(cls):
        """
        We need to logout the test client as we are testing scenarios of
        logging in the client like invalid password, invalid emails,
        empty credentials etc.
        """
        cls.tester.logout()

    # No need to call base class setup function
    def setUp(self):
        pass

    def runTest(self):
        """This function checks login functionality."""
        res = self.tester.login(self.email, self.password, True)
        if self.is_gravtar_image_check:
            if app_config.SHOW_GRAVATAR_IMAGE:
                self.assertTrue(self.respdata in res.data.decode('utf8'))
            else:
                print(self.respdata_without_gravtar in res.data.decode('utf8'))
        else:
            self.assertTrue(self.respdata in res.data.decode('utf8'))

    @classmethod
    def tearDownClass(cls):
        """
        We need to again login the test client as soon as test scenarios
        finishes.
        """
        cls.tester.logout()
        utils.login_tester_account(cls.tester)
