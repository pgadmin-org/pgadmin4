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


class ServerUpdateTestCase(BaseTestGenerator):
    """ This class will update server's comment field. """

    scenarios = [
        # Fetching the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def setUp(self):
        """This function add the server to test the PUT API"""
        self.server_id = utils.create_server(self.server)
        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def runTest(self):
        """This function update the server details"""
        if not self.server_id:
            raise Exception("No server to update.")
        data = {"comment": self.server['comment'], "id": self.server_id}
        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id), data=json.dumps(data),
            content_type='html/json')
        self.assertEquals(put_response.status_code, 200)

    def tearDown(self):
        """This function delete the server from SQLite"""
        utils.delete_server_with_api(self.tester, self.server_id)
