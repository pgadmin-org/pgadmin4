##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
import json


class ServersGetTestCase(BaseTestGenerator):
    """
    This class will fetch added servers under default server group
    by response code.
    """

    scenarios = utils.generate_scenarios('get_server',
                                         servers_utils.test_cases)

    def setUp(self):
        """This function add the server to test the GET API"""
        if hasattr(self, 'shared'):

            self.server['shared'] = True
            url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)
            response = self.tester.post(
                url,
                data=json.dumps(self.server),
                content_type='html/json'
            )
            response_data = json.loads(response.data.decode('utf-8'))
            self.server_id = response_data['node']['_id']
        else:
            self.server_id = utils.create_server(self.server)
        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def get_server(self, server_id):
        return self.tester.get(self.url + str(utils.SERVER_GROUP) + '/' +
                               str(server_id),
                               follow_redirects=True)

    def runTest(self):
        """ This function will fetch the added servers to object browser. """
        server_id = parent_node_dict["server"][-1]["server_id"]
        if not server_id:
            raise Exception("Server not found to test GET API")
        response = None
        if self.is_positive_test:
            if hasattr(self, "incorrect_server_id"):
                server_id = 9999
            if hasattr(self, "server_list"):
                server_id = ''
            if hasattr(self, "server_node"):
                server_id = ''
            if hasattr(self, 'shared'):
                server_id = self.server_id
            response = self.get_server(server_id)
        self.assertEquals(response.status_code,
                          self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
