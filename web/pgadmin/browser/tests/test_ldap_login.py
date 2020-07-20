##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config as app_config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data


class LDAPLoginTestCase(BaseTestGenerator):
    """
    This class checks ldap login functionality
    by validating different scenarios.
    """

    scenarios = [
        ('LDAP Authentication', dict(
            config_key_param='ldap',
            is_gravtar_image_check=False)),
        ('LDAP With SSL Authentication', dict(
            config_key_param='ldap_with_ssl',
            is_gravtar_image_check=False)),
        ('LDAP With TLS Authentication', dict(
            config_key_param='ldap_with_tls',
            is_gravtar_image_check=False)),
        ('LDAP With Dedicated User Authentication', dict(
            config_key_param='ldap_with_dedicated_user',
            is_gravtar_image_check=False)),
        ('LDAP With Anonymous Binding', dict(
            config_key_param='ldap_with_anonymous_bind',
            is_gravtar_image_check=False)),
    ]

    @classmethod
    def setUpClass(cls):
        """
        We need to logout the test client
        as we are testing ldap login scenarios.
        """
        cls.tester.logout()

    def setUp(self):
        if 'ldap_config' in config_data and \
                type(config_data['ldap_config']) is list and\
                len(config_data['ldap_config']) > 0 and\
                self.config_key_param in config_data['ldap_config'][0]:
            ldap_config = config_data['ldap_config'][0][self.config_key_param]

            app_config.AUTHENTICATION_SOURCES = ['ldap']
            app_config.LDAP_AUTO_CREATE_USER = True
            app_config.LDAP_SERVER_URI = ldap_config['uri']
            app_config.LDAP_BASE_DN = ldap_config['base_dn']
            app_config.LDAP_USERNAME_ATTRIBUTE = ldap_config[
                'username_atr']
            app_config.LDAP_SEARCH_BASE_DN = ldap_config[
                'search_base_dn']
            app_config.LDAP_SEARCH_FILTER = ldap_config['search_filter']
            app_config.LDAP_USE_STARTTLS = ldap_config['use_starttls']
            app_config.LDAP_CA_CERT_FILE = ldap_config['ca_cert_file']
            app_config.LDAP_CERT_FILE = ldap_config['cert_file']
            app_config.LDAP_KEY_FILE = ldap_config['key_file']
            if ldap_config['bind_user'] != "" and\
                    ldap_config['bind_password'] != "":
                app_config.LDAP_BIND_USER = ldap_config['bind_user']
                app_config.LDAP_BIND_PASSWORD = ldap_config['bind_password']
            if ldap_config['anonymous_bind'] != "" and\
                    ldap_config['anonymous_bind']:
                app_config.LDAP_ANONYMOUS_BIND = True

        else:
            self.skipTest(
                "LDAP config not set."
            )

    def runTest(self):
        """This function checks login functionality."""
        username = config_data['pgAdmin4_ldap_credentials']['login_username']
        password = config_data['pgAdmin4_ldap_credentials']['login_password']

        res = self.tester.login(username, password, True)

        respdata = 'Gravatar image for %s' %\
                   config_data['pgAdmin4_ldap_credentials']['login_username']
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
        app_config.AUTHENTICATION_SOURCES = ['internal']
        utils.login_tester_account(cls.tester)
