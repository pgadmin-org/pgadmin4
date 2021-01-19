##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from pgadmin.authenticate.registry import AuthSourceRegistry
from unittest.mock import patch, MagicMock


class KerberosLoginMockTestCase(BaseTestGenerator):
    """
    This class checks Spnego/Kerberos login functionality by mocking
    HTTP negotiate authentication.
    """

    scenarios = [
        ('Spnego/Kerberos Authentication: Test Unauthorized', dict(
            auth_source=['kerberos'],
            auto_create_user=True,
            flag=1
        )),
        ('Spnego/Kerberos Authentication: Test Authorized', dict(
            auth_source=['kerberos'],
            auto_create_user=True,
            flag=2
        ))
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
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = 'kerberos'

    def runTest(self):
        """This function checks spnego/kerberos login functionality."""
        if self.flag == 1:
            self.test_unauthorized()
        elif self.flag == 2:
            if app_config.SERVER_MODE is False:
                self.skipTest(
                    "Can not run Kerberos Authentication in the Desktop mode."
                )

            self.test_authorized()

    def test_unauthorized(self):
        """
        Ensure that when client sends the first request,
        the Negotiate request is sent.
        """
        res = self.tester.login(None, None, True)
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.headers.get('www-authenticate'), 'Negotiate')

    def test_authorized(self):
        """
        Ensure that when the client sends an correct authorization token,
        they receive a 200 OK response and the user principal is extracted and
        passed on to the routed method.
        """

        class delCrads:
            def __init__(self):
                self.initiator_name = 'user@PGADMIN.ORG'
        del_crads = delCrads()

        AuthSourceRegistry.registry['kerberos'].negotiate_start = MagicMock(
            return_value=[True, del_crads])
        res = self.tester.login(None,
                                None,
                                True,
                                headers={'Authorization': 'Negotiate CTOKEN'}
                                )
        self.assertEqual(res.status_code, 200)
        respdata = 'Gravatar image for %s' % del_crads.initiator_name
        self.assertTrue(respdata in res.data.decode('utf8'))

    def tearDown(self):
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = 'ldap'

    @classmethod
    def tearDownClass(cls):
        """
        We need to again login the test client as soon as test scenarios
        finishes.
        """
        app_config.AUTHENTICATION_SOURCES = ['internal']
        utils.login_tester_account(cls.tester)
