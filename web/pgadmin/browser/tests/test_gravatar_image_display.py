##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data as tconfig


class TestLoginUserImage(BaseTestGenerator):
    """
    This class checks for user image after successful login.
    - If SHOW_GRAVATAR_IMAGE config option is set to True then we will show
    Gravatar on the Page.
    - If SHOW_GRAVATAR_IMAGE config option is set to False then we will show
    Static image on the Page.
    """

    scenarios = [
        (
            'Verify gravatar image on the page', dict(
                email=(
                    tconfig['pgAdmin4_login_credentials']['login_username']
                ),
                password=(
                    tconfig['pgAdmin4_login_credentials']['login_password']
                ),
                respdata='Gravatar image for %s' %
                         tconfig['pgAdmin4_login_credentials']
                         ['login_username'],
            )
        )
    ]

    @classmethod
    def setUpClass(cls):
        "Logout first if already logged in"
        cls.tester.logout()

    # No need to call baseclass setup function
    def setUp(self):
        pass

    def runTest(self):
        # Login and check type of image in response
        response = self.tester.login(self.email, self.password, True)

        # Should have gravatar image
        if config.SHOW_GRAVATAR_IMAGE:
            self.assertIn(self.respdata, response.data.decode('utf8'))
        # Should not have gravatar image
        else:
            self.assertNotIn(self.respdata, response.data.decode('utf8'))

    @classmethod
    def tearDownClass(cls):
        """
        We need to again login the test client as soon as test scenarios
        finishes.
        """
        # Make sure - we're already logged out
        cls.tester.logout()
        utils.login_tester_account(cls.tester)
