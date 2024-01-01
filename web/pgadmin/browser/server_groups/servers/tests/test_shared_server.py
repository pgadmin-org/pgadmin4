##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
import json
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client
import config

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']


class SharedServersGetTestCase(BaseTestGenerator):
    """
    This class will fetch added servers under default server group
    by response code.
    """

    scenarios = utils.generate_scenarios('get_shared_server',
                                         servers_utils.test_cases)

    def setUp(self):
        """This function add the server to test the GET API"""

        if config.SERVER_MODE is False:
            self.skipTest(
                "Can not run shared servers test cases in the Desktop mode."
            )
        self.server['shared'] = True
        url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        response_data = json.loads(response.data.decode('utf-8'))
        self.server_id = response_data['node']['_id']

        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def get_server(self, server_id):
        return self.tester.get(self.url + str(utils.SERVER_GROUP) + '/' +
                               str(server_id),
                               follow_redirects=True)

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """ This function will fetch the added servers to object browser. """
        if not self.server_id:
            raise Exception("Server not found to test GET API")
        response = None
        if self.is_positive_test:
            if hasattr(self, 'no_server_id'):
                if hasattr(self, 'server_list'):
                    self.url = '/browser/server/nodes/'
                server_id = ''
                response = self.get_server(server_id)
            else:
                response = self.get_server(self.server_id)
        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)


class SharedServerUpdateTestCase(BaseTestGenerator):
    """ This class will update server's comment field. """

    scenarios = utils.generate_scenarios('update_shared_server',
                                         servers_utils.test_cases)

    def setUp(self):
        """This function add the server to test the PUT API"""
        if config.SERVER_MODE is False:
            self.skipTest(
                "Can not run shared servers test cases in the Desktop mode."
            )
        self.server['shared'] = True
        if hasattr(self, 'clear_save_password'):
            self.server['save_password'] = 1
        create_server_url = "/browser/server/obj/{0}/".format(
            utils.SERVER_GROUP)

        self.server_id = \
            servers_utils.create_server_with_api(self, create_server_url)
        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def update_server(self):
        return self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id), data=json.dumps(self.test_data),
            content_type='html/json')

    def connect_to_server(self, url):
        return self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )

    def runTest(self):
        """This function update the server details"""
        if not self.server_id:
            raise Exception("No server to update.")
        if 'comment' in self.test_data:
            self.test_data["comment"] = self.server['comment']
        self.test_data["id"] = self.server_id
        if self.is_positive_test:
            put_response = self.update_server()
        else:
            if hasattr(self, 'wrong_server_id'):
                self.server_id = 9999
            put_response = self.update_server()
        self.assertEqual(put_response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the server from SQLite"""
        utils.delete_server_with_api(self.tester, self.server_id)
