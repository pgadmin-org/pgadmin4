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


class ServersAddTestCase(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = [
        # Fetch the default url for server object
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        pass

    def runTest(self):
        """ This function will add the server under default server group."""
        url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)
        response = self.tester.post(url, data=json.dumps(self.server),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        server_id = response_data['node']['_id']
        utils.write_node_info(int(server_id), "sid", self.server)

    @classmethod
    def tearDownClass(cls):
        """
        This function delete the server from SQLite & clears the node_info_dict
        """
        server_id = server_utils.get_server_id()
        utils.delete_server(server_id)
        utils.clear_node_info_dict()
