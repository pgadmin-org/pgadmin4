# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

import json
from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from . import utils as server_utils


class ServerUpdateTestCase(BaseTestGenerator):
    """ This class will update server's comment field. """

    scenarios = [
        # Fetching the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """This function add the server to test the PUT API"""
        server_utils.add_server(cls.server)

    def runTest(self):
        """This function update the server details"""
        all_id = utils.get_node_info_dict()
        servers_info = all_id["sid"]

        if len(servers_info) == 0:
            raise Exception("No server to update.")

        server_id = list(servers_info[0].keys())[0]
        data = {
            "comment":
                server_utils.config_data['server_update_data'][0][
                    'comment'],
            "id": server_id
        }
        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(server_id), data=json.dumps(data),
            content_type='html/json')
        self.assertEquals(put_response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """
        This function delete the server from SQLite & clears the node_info_dict
        """
        server_id = server_utils.get_server_id()
        utils.delete_server(server_id)
        utils.clear_node_info_dict()
