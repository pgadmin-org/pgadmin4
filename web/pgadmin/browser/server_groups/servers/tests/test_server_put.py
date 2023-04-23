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
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils


class ServerUpdateTestCase(BaseTestGenerator):
    """ This class will update server's comment field. """

    scenarios = utils.generate_scenarios('update_server',
                                         servers_utils.test_cases)

    def setUp(self):
        """This function add the server to test the PUT API"""
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
            if hasattr(self, 'server_connected'):
                url = '/browser/server/connect/{0}/{1}'.format(
                    utils.SERVER_GROUP,
                    self.server_id)
                self.server['password'] = self.server['db_password']
                self.connect_to_server(url)
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
