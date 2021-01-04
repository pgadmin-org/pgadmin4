##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils
from regression.test_setup import config_data
from . import utils


class ChangePasswordTestCase(BaseTestGenerator):
    """
    This class validates the change password functionality
    by defining change password scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    scenarios = [
        # This testcase validates invalid confirmation password
        ('TestCase for Validating Incorrect_New_Password', dict(
            password=(
                config_data['pgAdmin4_login_credentials']
                ['login_password']),
            new_password=(
                config_data['pgAdmin4_login_credentials']
                ['new_password']),
            new_password_confirm=str(uuid.uuid4())[4:8],
            respdata='Passwords do not match')),

        # This testcase validates if confirmation password is less than
        # minimum length
        ('TestCase for Validating New_Password_Less_Than_Min_Length',
         [dict(password=(
             config_data['pgAdmin4_login_credentials']['login_password']),
             new_password=new_password,
             new_password_confirm=new_password,
             respdata='Password must be at least 8 characters')
             for new_password in [str(uuid.uuid4())[4:8]]][0]),

        # This testcase validates if both password fields are left blank
        ('TestCase for Validating Empty_New_Password', dict(
            password=(
                config_data['pgAdmin4_login_credentials']
                ['login_password']),
            new_password='', new_password_confirm='',
            respdata='Password not provided')),

        # This testcase validates if current entered password is incorrect
        ('TestCase for Validating Incorrect_Current_Password', dict(
            password=str(uuid.uuid4())[4:8],
            new_password=(
                config_data['pgAdmin4_login_credentials']
                ['new_password']),
            new_password_confirm=(
                config_data['pgAdmin4_login_credentials']
                ['new_password']),
            respdata='Invalid password')),

        # This test case checks for valid password
        ('TestCase for Changing Valid_Password', dict(
            valid_password='reassigning_password',
            username=(
                config_data['pgAdmin4_test_user_credentials']
                ['login_username']),
            password=(
                config_data['pgAdmin4_test_user_credentials']
                ['login_password']),
            new_password=(
                config_data['pgAdmin4_test_user_credentials']
                ['new_password']),
            new_password_confirm=(
                config_data['pgAdmin4_test_user_credentials']
                ['new_password']),
            respdata='You successfully changed your password.'))
    ]

    @classmethod
    def setUpClass(cls):
        pass

    def runTest(self):
        """This function will check change password functionality."""

        # Check for 'valid_password' exists in self to test 'valid password'
        # test case
        if 'valid_password' in dir(self):
            response = self.tester.post(
                '/user_management/user/',
                data=json.dumps(dict(
                    username=self.username,
                    email=self.username,
                    newPassword=self.password,
                    confirmPassword=self.password,
                    active=True,
                    role="2"
                )),
                follow_redirects=True
            )
            user_id = json.loads(response.data.decode('utf-8'))['id']
            # Logout the Administrator before login normal user
            self.tester.logout()
            response = self.tester.login(self.username, self.password, True)
            self.assertEqual(response.status_code, 200)
            # test the 'change password' test case
            utils.change_password(self)
            # Delete the normal user after changing it's password
            self.tester.logout()
            # Login the Administrator before deleting normal user
            test_utils.login_tester_account(self.tester)
            response = self.tester.delete(
                '/user_management/user/' + str(user_id),
                follow_redirects=True
            )
            self.assertEqual(response.status_code, 200)
        else:
            utils.change_password(self)

    @classmethod
    def tearDownClass(cls):
        # Make sure - we're already logged out before running
        cls.tester.logout()
        test_utils.login_tester_account(cls.tester)
