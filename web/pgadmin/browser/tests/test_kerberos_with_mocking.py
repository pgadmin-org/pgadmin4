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
from werkzeug.datastructures import Headers
from pgadmin.utils.constants import LDAP, INTERNAL, KERBEROS


class KerberosLoginMockTestCase(BaseTestGenerator):
    """
    This class checks Spnego/Kerberos login functionality by mocking
    HTTP negotiate authentication.
    """

    scenarios = [
        ('Spnego/Kerberos Authentication: Test Unauthorized', dict(
            auth_source=[KERBEROS],
            auto_create_user=True,
            flag=1
        )),
        ('Spnego/Kerberos Authentication: Test Authorized', dict(
            auth_source=[KERBEROS],
            auto_create_user=True,
            flag=2
        )),
        ('Spnego/Kerberos Update Ticket', dict(
            auth_source=[KERBEROS],
            auto_create_user=True,
            flag=3
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
        try:
            import gssapi
        except ModuleNotFoundError as e:
            self.skipTest("Import Error: GSSAPI module couldn't be loaded. " +
                          str(e))
        except ImportError as e:
            self.skipTest("Import Error: GSSAPI module couldn't be loaded. " +
                          str(e))
        except OSError:
            self.skipTest("OS Error: GSSAPI module couldn't be loaded. " +
                          str(e))

        app_config.AUTHENTICATION_SOURCES = self.auth_source
        self.app.PGADMIN_EXTERNAL_AUTH_SOURCE = KERBEROS

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
        elif self.flag == 3:
            if app_config.SERVER_MODE is False:
                self.skipTest(
                    "Can not run Kerberos Authentication in the Desktop mode."
                )
            self.test_update_ticket()

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

        del_crads = self.mock_negotiate_start()
        res = self.tester.login(None,
                                None,
                                True,
                                headers={'Authorization': 'Negotiate CTOKEN'}
                                )
        self.assertEqual(res.status_code, 200)
        respdata = 'Gravatar image for %s' % del_crads.initiator_name
        self.assertTrue(respdata in res.data.decode('utf8'))

    def mock_negotiate_start(self):
        class delCrads:
            def __init__(self):
                self.initiator_name = 'user@PGADMIN.ORG'

        del_crads = delCrads()
        AuthSourceRegistry._registry[KERBEROS].negotiate_start = MagicMock(
            return_value=[True, del_crads])
        return del_crads

    def test_update_ticket(self):
        # Response header should include the Negotiate header in the first call
        response = self.tester.get('/kerberos/update_ticket')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers.get('www-authenticate'), 'Negotiate')

        # When we send the Kerberos Ticket, it should return  success
        del_crads = self.mock_negotiate_start()

        krb_token = Headers({})
        krb_token['Authorization'] = 'Negotiate CTOKEN'

        response = self.tester.get('/kerberos/update_ticket',
                                   headers=krb_token)
        self.assertEqual(response.status_code, 200)
        self.tester.logout()

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
