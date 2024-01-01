##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils


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

    @classmethod
    def setUpClass(cls):
        pass

    # No need to call base class setup function
    def setUp(self):
        pass

    def runTest(self):
        """This function checks the logout functionality."""

        response = self.tester.get('/logout')
        self.assertTrue(self.respdata in response.data.decode('utf8'))

    @classmethod
    def tearDownClass(cls):
        """
        We need to again login the test client as soon as test scenarios
        finishes.
        """
        utils.login_tester_account(cls.tester)
