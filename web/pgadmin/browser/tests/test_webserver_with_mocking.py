##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.authenticate.registry import AuthSourceRegistry
from unittest.mock import patch, MagicMock
from pgadmin.authenticate import AuthSourceManager
from pgadmin.utils.constants import OAUTH2, LDAP, INTERNAL, WEBSERVER
from flask import request


class WebserverLoginMockTestCase(BaseTestGenerator):
    """
    This class checks oauth2  login functionality by mocking
    Webserver Authentication.
    """

    scenarios = [
        ('Webserver Authentication', dict(
            auth_source=[WEBSERVER],
            username='test_mock_webserver_user'
        )),
    ]

    @classmethod
    def setUpClass(cls):
        """
        We need to logout the test client as we are testing
        spnego/kerberos login scenarios.
        """
        cls.tester.logout()

    def setUp(self):
        app_config.AUTHENTICATION_SOURCES = self.auth_source
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = WEBSERVER

    def runTest(self):
        """This function checks webserver login functionality."""
        if app_config.SERVER_MODE is False:
            self.skipTest(
                "Can not run Webserver Authentication in the Desktop mode."
            )

        self.test_webserver_authentication()

    def test_webserver_authentication(self):
        """
        Ensure that when the client sends an correct authorization token,
        they receive a 200 OK response and the user principal is extracted and
        passed on to the routed method.
        """

        # Mock Oauth2 Authenticate
        AuthSourceRegistry._registry[WEBSERVER].get_user = MagicMock(
            return_value=self.username)

        res = self.tester.login(None,
                                None,
                                True,
                                None
                                )
        self.assertEqual(res.status_code, 200)
        respdata = 'Gravatar image for %s' % self.username
        self.assertTrue(respdata in res.data.decode('utf8'))

    def tearDown(self):
        pass

    @classmethod
    def tearDownClass(cls):
        """
        We need to again login the test client as soon as test scenarios
        finishes.
        """
        cls.tester.logout()
        app_config.AUTHENTICATION_SOURCES = [INTERNAL]
        app_config.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL
        utils.login_tester_account(cls.tester)
