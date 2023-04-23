##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as cast_utils
from regression.test_setup import config_data
import json
import config
from unittest.mock import patch
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']


class ServerGroupsChildren(BaseTestGenerator):
    """
    This class will fetch all children of server group by response code.
    """

    scenarios = utils.generate_scenarios('get_server_group_children',
                                         cast_utils.test_cases)

    def get_server(self, server_id):
        return self.tester.get(self.url + str(utils.SERVER_GROUP) + '/' +
                               str(server_id),
                               follow_redirects=True)

    def setUp(self):

        if config.SERVER_MODE is True:
            self.server['shared'] = True
            url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
            response = self.tester.post(
                url,
                data=json.dumps(self.server),
                content_type='html/json'
            )
            response_data = json.loads(response.data.decode('utf-8'))
            self.server_id = response_data['node']['_id']

            server_dict = {"server_id": response_data['node']['_id']}
            utils.write_node_info("sid", server_dict)

    def runTest(self):

        if config.SERVER_MODE is True:
            self.testServerGroupsForServerMode()
        else:
            self.testServerGroupsForDesktopMode()

    @patch('pgadmin.browser.server_groups.servers.current_user')
    @create_user_wise_test_client(test_user_details)
    def testServerGroupsForServerMode(self, current_user_mock):

        current_user_mock.id = 103040
        self.server_group_id = config_data['server_group']

        response = self.tester.get(self.url + str(self.server_group_id),
                                   content_type='html/json')
        self.assertTrue(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf8'))
        self.assertTrue(response_data['success'], 1)

    @patch('pgadmin.browser.server_groups.servers.current_user')
    def testServerGroupsForDesktopMode(self, current_user_mock):

        current_user_mock.id = 1
        self.server_group_id = config_data['server_group']

        response = self.tester.get(self.url + str(self.server_group_id),
                                   content_type='html/json')
        self.assertTrue(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf8'))
        self.assertTrue(response_data['success'], 1)
