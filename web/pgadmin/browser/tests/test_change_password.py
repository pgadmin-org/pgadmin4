# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

import uuid

from pgadmin.browser.tests.test_login import LoginTestCase
from regression.config import config_data


class ChangePasswordTestCase(LoginTestCase):
    """
    This class validates the change password functionality
    by defining change password scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    priority = 2

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

        # This testcase validates if current entered password
        # is incorrect
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

        response = self.tester.get('/change', follow_redirects=True)
        self.assertIn('pgAdmin 4 Password Change', response.data)
        response = self.tester.post('/change', data=dict(
            password=self.password,
            new_password=self.new_password,
            new_password_confirm=self.new_password_confirm),
                                    follow_redirects=True)
        self.assertIn(self.respdata, response.data)
