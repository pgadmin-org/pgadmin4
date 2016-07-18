# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################


from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils


class LogoutTest(BaseTestGenerator):
    """
    This class verifies the logout functionality; provided the user is already
    logged-in. Dictionary parameters define the scenario appended by test
    name.
    """

    scenarios = [
        # This test case validate the logout page
        ('Logging Out', dict(respdata='Redirecting...'))
    ]

    def setUp(self):
        """
        This function login the test account before running the logout
        test case
        """

        utils.login_tester_account(self.tester)

    def runTest(self):
        """This function checks the logout functionality."""

        response = self.tester.get('/logout')
        self.assertIn(self.respdata, response.data.decode('utf8'))
