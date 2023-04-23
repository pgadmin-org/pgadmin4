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
from regression.test_setup import config_data
from pgadmin.authenticate.registry import AuthSourceRegistry
from unittest.mock import patch
from pgadmin.utils.constants import LDAP, INTERNAL


class LDAPLoginMockTestCase(BaseTestGenerator):
    """
    This class checks ldap login functionality by mocking
    ldap connection and ldap search functionality.
    """

    scenarios = [
        ('LDAP Authentication with Auto Create User', dict(
            auth_source=[LDAP],
            auto_create_user=True,
            username='ldap_user',
            password='ldap_pass')),
        ('LDAP Authentication without Auto Create User', dict(
            auth_source=[LDAP],
            auto_create_user=False,
            username='ldap_user',
            password='ldap_pass')),
        ('LDAP + Internal Authentication', dict(
            auth_source=[LDAP, INTERNAL],
            auto_create_user=False,
            username=config_data[
                'pgAdmin4_login_credentials']['login_username'],
            password=config_data[
                'pgAdmin4_login_credentials']['login_password']
        ))
    ]

    @classmethod
    def setUpClass(cls):
        """
        We need to logout the test client as we are testing
        ldap login scenarios.
        """
        cls.tester.logout()

    def setUp(self):
        app_config.AUTHENTICATION_SOURCES = self.auth_source
        app_config.LDAP_AUTO_CREATE_USER = self.auto_create_user
        app_config.LDAP_ANONYMOUS_BIND = False
        app_config.LDAP_BIND_USER = None
        app_config.LDAP_BIND_PASSWORD = None
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = LDAP

    @patch.object(AuthSourceRegistry._registry[LDAP], 'connect',
                  return_value=[True, "Done"])
    @patch.object(AuthSourceRegistry._registry[LDAP], 'search_ldap_user',
                  return_value=[True, ''])
    def runTest(self, conn_mock_obj, search_mock_obj):
        """This function checks ldap login functionality."""
        AuthSourceRegistry._registry[LDAP].dedicated_user = False
        res = self.tester.login(self.username, self.password, True)
        respdata = 'Gravatar image for %s' % self.username
        self.assertTrue(respdata in res.data.decode('utf8'))

    def tearDown(self):
        self.tester.logout()

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
