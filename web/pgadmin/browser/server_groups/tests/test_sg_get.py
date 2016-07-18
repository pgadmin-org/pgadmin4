###########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
###########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression.test_setup import config_data


class SgNodeTestCase(BaseTestGenerator):
    """
     This class will check available server groups in pgAdmin.
    """

    scenarios = [
        # Fetching the default url for server group node
        ('Check Server Group Node', dict(url='/browser/server-group/obj/'))
    ]

    def setUp(self):
        """
        This function login the test account before running the logout
        test case
        """

        utils.login_tester_account(self.tester)

    def runTest(self):
        """This function will check available server groups."""

        server_group_id = config_data['test_server_group']
        response = self.tester.get(self.url + str(server_group_id),
                                   content_type='html/json')
        self.assertTrue(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf8'))
        self.assertTrue(response_data['id'], server_group_id)

    def tearDown(self):
        """This function logout the test account """

        utils.logout_tester_account(self.tester)
