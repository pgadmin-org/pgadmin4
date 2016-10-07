# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################
import uuid
import json

from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data
from regression import test_utils
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
            password=(config_data['pgAdmin4_login_credentials']
                      ['login_password']),
            new_password=(config_data['pgAdmin4_login_credentials']
                          ['new_password']),
            new_password_confirm=str(uuid.uuid4())[4:8],
            respdata='Passwords do not match')),

        # This testcase validates if confirmation password is less than
        # minimum length
        ('TestCase for Validating New_Password_Less_Than_Min_Length',
         dict(password=(config_data['pgAdmin4_login_credentials']
                        ['login_password']),
              new_password=str(uuid.uuid4())[4:8],
              new_password_confirm=str(uuid.uuid4())[4:8],
              respdata='Password must be at least 6 characters')),

        # This testcase validates if both password fields are left blank
        ('TestCase for Validating Empty_New_Password', dict(
            password=(config_data['pgAdmin4_login_credentials']
                      ['login_password']),
            new_password='', new_password_confirm='',
            respdata='Password not provided')),

        # This testcase validates if current entered password is incorrect
        ('TestCase for Validating Incorrect_Current_Password', dict(
            password=str(uuid.uuid4())[4:8],
            new_password=(config_data['pgAdmin4_login_credentials']
                          ['new_password']),
            new_password_confirm=(
                config_data['pgAdmin4_login_credentials']
                ['new_password']),
            respdata='Invalid password')),

        # This test case checks for valid password
        ('TestCase for Changing Valid_Password', dict(
            valid_password='reassigning_password',
            username=(config_data['pgAdmin4_test_user_credentials']
                      ['login_username']),
            password=(config_data['pgAdmin4_test_user_credentials']
                      ['login_password']),
            new_password=(config_data['pgAdmin4_test_user_credentials']
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
            response = self.tester.post('/user_management/user/', data=dict(
                email=self.username, newPassword=self.password,
                confirmPassword=self.password, active=1, role="2"),
                                        follow_redirects=True)
            user_id = json.loads(response.data.decode('utf-8'))['id']
            # Logout the Administrator before login normal user
            test_utils.logout_tester_account(self.tester)
            response = self.tester.post('/login', data=dict(
                email=self.username, password=self.password),
                                        follow_redirects=True)
            self.assertEquals(response.status_code, 200)
            # test the 'change password' test case
            utils.change_password(self)
            # Delete the normal user after changing it's password
            test_utils.logout_tester_account(self.tester)
            # Login the Administrator before deleting normal user
            test_utils.login_tester_account(self.tester)
            response = self.tester.delete(
                '/user_management/user/' + str(user_id),
                follow_redirects=True)
            self.assertEquals(response.status_code, 200)
        else:
            utils.change_password(self)

    @classmethod
    def tearDownClass(cls):
        test_utils.login_tester_account(cls.tester)
