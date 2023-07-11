##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
import config
from pgadmin.utils.constants import INTERNAL


class MasterPasswordTestCase(BaseTestGenerator):
    """
    This class validates the change password functionality
    by defining change password scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    scenarios = [
        # This testcase validates invalid confirmation password
        ('TestCase for Create master password dialog', dict(
            password="",
            errmsg=None,
            is_error=False
        )),
        ('TestCase for Setting Master Password', dict(
            password="masterpasstest",
            check_if_set=True,
            errmsg=None,
            is_error=False
        )),
        ('TestCase for Resetting Master Password', dict(
            reset=True,
            password="",
            errmsg=None,
            is_error=False
        )),
    ]

    def setUp(self):
        config.MASTER_PASSWORD_REQUIRED = True
        config.AUTHENTICATION_SOURCES = [INTERNAL]

    def runTest(self):
        """This function will check change password functionality."""
        req_data = dict()

        if hasattr(self, 'password'):
            req_data['password'] = self.password

        if hasattr(self, 'restart'):
            req_data['restart'] = self.restart

        if hasattr(self, 'reset'):
            req_data['reset'] = self.reset

        if config.SERVER_MODE:
            response = self.tester.post(
                '/browser/master_password',
                data=json.dumps(req_data),
            )

            self.assertEqual(response.json['data']['present'], True)
        else:
            if 'reset' in req_data:
                response = self.tester.delete(
                    '/browser/master_password'
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json['data'], False)
            else:
                response = self.tester.post(
                    '/browser/master_password',
                    data=json.dumps(req_data),
                )
                self.assertEqual(response.status_code, 200)

                if not config.SERVER_MODE:
                    self.skipTest(
                        "This test is skipped on Desktop mode.")
                if hasattr(self, 'check_if_set'):
                    response = self.tester.get(
                        '/browser/master_password'
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json['data'], True)

    def tearDown(self):
        config.MASTER_PASSWORD_REQUIRED = False
