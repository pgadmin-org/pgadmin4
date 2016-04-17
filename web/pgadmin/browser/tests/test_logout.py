# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

from pgadmin.browser.tests.test_login import LoginTestCase
from regression.config import config_data


class LogoutTest(LoginTestCase):
    """
    This class verifies the logout functionality; provided the user is already
    logged-in. Dictionary parameters define the scenario appended by test
    name.
    """

    priority = 3

    scenarios = [
        # This test case validate the logout page
        ('Logging Out', dict(respdata='Redirecting...'))
    ]

    def runTest(self):
        """This function checks the logout functionality."""

        response = self.tester.get('/logout')
        self.assertIn(self.respdata, response.data)

    def tearDown(self):
        """
        Defining tear down class, which will run after each test method execute.
        Re-logging in as further modules require login.
        """

        self.tester.post('/login', data=dict(
            email=(config_data['pgAdmin4_login_credentials']
                   ['test_login_username']),
            password=(config_data['pgAdmin4_login_credentials']
                      ['test_login_password'])), follow_redirects=True)
