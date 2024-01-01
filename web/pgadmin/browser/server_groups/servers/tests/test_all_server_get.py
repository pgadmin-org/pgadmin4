##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import secrets

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
import json


class AllServersGetTestCase(BaseTestGenerator):
    """
    This class will fetch added servers under default server group
    by response code.
    """

    scenarios = utils.generate_scenarios('get_all_server',
                                         servers_utils.test_cases)

    def setUp(self):
        """This function add the server to test the GET API"""

        server_details = servers_utils.get_server_data(self.server)
        server_details['password'] = self.server['db_password']
        server_details['save_password'] = 1
        server_details['connect_now'] = 1
        server_details['connection_params'] = [
            {'name': 'sslmode', 'value': 'prefer', 'keyword': 'sslmode'},
            {'name': 'connect_timeout', 'value': 10,
             'keyword': 'connect_timeout'}
        ]
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)

        response = self.tester.post(
            url,
            data=json.dumps(server_details),
            content_type='html/json'
        )
        response_data = json.loads(response.data.decode('utf-8'))
        self.server_id = response_data['node']['_id']

        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def get_server(self):
        return self.tester.get(self.url, follow_redirects=True)

    def connect_to_server(self, url):
        return self.tester.post(
            url,
            data=self.server,
            content_type='html/json'
        )

    def runTest(self):
        """ This function will fetch the added servers to object browser. """
        server_id = parent_node_dict["server"][-1]["server_id"]
        if not server_id:
            raise Exception("Server not found to test GET API")
        response = None
        if self.is_positive_test:
            if hasattr(self, 'invalid_server_group'):
                self.url = self.url + '{0}/{1}?_={1}'.format(
                    utils.SERVER_GROUP, secrets.choice(range(1, 9999999)))
            elif hasattr(self, 'children'):

                self.url = self.url + '{0}/{1}'.format(
                    utils.SERVER_GROUP, self.server_id)
            elif hasattr(self, 'server_list'):
                if hasattr(self, 'servers'):
                    server_id = ''
                self.url = self.url + '{0}/{1}'.format(
                    utils.SERVER_GROUP, server_id)
            else:
                if hasattr(self, "connected"):
                    url = '/browser/server/connect/' + '{0}/{1}'.format(
                        utils.SERVER_GROUP,
                        self.server_id)
                    self.server['password'] = self.server['db_password']

                    self.connect_to_server(url)
                self.url = self.url + '{0}/{1}?_={2}'.format(
                    utils.SERVER_GROUP, server_id,
                    secrets.choice(range(1, 9999999)))
            response = self.get_server()
        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
