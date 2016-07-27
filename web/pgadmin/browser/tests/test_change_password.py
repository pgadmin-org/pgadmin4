# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data


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
                      ['test_login_password']),
            new_password=(config_data['pgAdmin4_login_credentials']
                          ['test_new_password']),
            new_password_confirm=str(uuid.uuid4())[4:8],
            respdata='Passwords do not match')),

        # This testcase validates if confirmation password is less than
        # minimum length
        ('TestCase for Validating New_Password_Less_Than_Min_Length',
         dict(password=(config_data['pgAdmin4_login_credentials']
                        ['test_login_password']),
              new_password=str(uuid.uuid4())[4:8],
              new_password_confirm=str(uuid.uuid4())[4:8],
              respdata='Password must be at least 6 characters')),

        # This testcase validates if both password fields are left blank
        ('TestCase for Validating Empty_New_Password', dict(
            password=(config_data['pgAdmin4_login_credentials']
                      ['test_login_password']),
            new_password='', new_password_confirm='',
            respdata='Password not provided')),

        # This testcase validates if current entered password is incorrect
        ('TestCase for Validating Incorrect_Current_Password', dict(
            password=str(uuid.uuid4())[4:8],
            new_password=(config_data['pgAdmin4_login_credentials']
                          ['test_new_password']),
            new_password_confirm=(
                config_data['pgAdmin4_login_credentials']
                ['test_new_password']),
            respdata='Invalid password')),

        # This testcase checks for valid password
        ('TestCase for Changing Valid_Password', dict(
            password=(config_data['pgAdmin4_login_credentials']
                      ['test_login_password']),
            new_password=(config_data['pgAdmin4_login_credentials']
                          ['test_new_password']),
            new_password_confirm=(
                config_data['pgAdmin4_login_credentials']
                ['test_new_password']),
            respdata='You successfully changed your password.')),
        ('Reassigning_Password', dict(
            test_case='reassigning_password',
            password=(config_data['pgAdmin4_login_credentials']
                      ['test_new_password']),
            new_password=(config_data['pgAdmin4_login_credentials']
                          ['test_login_password']),
            new_password_confirm=(
                config_data['pgAdmin4_login_credentials']
                ['test_login_password']),
            respdata='You successfully changed your password.'))

    ]

    def runTest(self):
        """This function will check change password functionality."""

        # Check for 'test_case' exists in self For reassigning the password.
        # Password gets change in change password test case.
        if 'test_case' in dir(self):
            email = \
                config_data['pgAdmin4_login_credentials'][
                    'test_login_username']
            password = \
                config_data['pgAdmin4_login_credentials'][
                    'test_new_password']
            response = self.tester.post('/login', data=dict(
                email=email, password=password), follow_redirects=True)

        response = self.tester.get('/change', follow_redirects=True)
        self.assertIn('pgAdmin 4 Password Change', response.data.decode(
            'utf-8'))

        response = self.tester.post('/change', data=dict(
            password=self.password,
            new_password=self.new_password,
            new_password_confirm=self.new_password_confirm),
                                    follow_redirects=True)
        self.assertIn(self.respdata, response.data.decode('utf-8'))
