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
from regression.config import config_data


class ResetPasswordTestCase(BaseTestGenerator):
    """
    This class validates the reset password functionality by defining
    scenarios; Each dict parameter describe a scenario appended by
    test name.
    """
    priority = 1

    scenarios = [
        # This test case validates the empty email field
        ('TestCase for Validating Empty Email', dict(
            email='', respdata='Email not provided')),

        # This test case validates the invalid/incorrect email field
        ('TestCase for Validating Invalid_Email', dict(
            email=str(uuid.uuid4())[1:6] + '@xyz.com',
            respdata='Specified user does not exist')),

        # This test case validates the valid email id
        ('TestCase for Validating Valid_Email', dict(
            email=config_data['pgAdmin4_login_credentials']
            ['test_login_username'], respdata='pgAdmin 4'))
    ]

    def runTest(self):
        """This function checks reset password functionality."""

        response = self.tester.get('/reset')
        self.assertIn('Recover pgAdmin 4 Password', response.data)
        response = self.tester.post(
            '/reset', data=dict(email=self.email),
            follow_redirects=True)
        self.assertIn(self.respdata, response.data)
