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
from regression.test_setup import config_data


class ServerUpdateTestCase(BaseTestGenerator):
    """ This class will update server's comment field. """

    scenarios = [
        # Fetching the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def setUp(self):
        """
        This function perform the four tasks
         1. Add the test server
         2. Get the server
         3. Connect to server

        :return: None
        """

        # Firstly, add the server
        utils.add_server(self.tester)
        # Get the server
        utils.get_server(self.tester)
        # Connect to server
        self.server_connect, self.server_group, self.server_ids = \
            utils.connect_server(self.tester)
        if len(self.server_connect) == 0:
            raise Exception("No Server(s) connected to update!!!")

    def runTest(self):
        """ This function will update the server's comment field. """

        for server_id in self.server_ids:
            data = {
                "comment":
                    config_data['test_server_update_data'][0]['test_comment'],
                "id": server_id
            }
            put_response = self.tester.put(
                self.url + str(self.server_group) + '/' +
                str(server_id), data=json.dumps(data),
                content_type='html/json')
            self.assertEquals(put_response.status_code, 200)

            response_data = json.loads(put_response.data.decode())
            self.assertTrue(response_data['success'], 1)

    def tearDown(self):
        """
        This function deletes the added server and the 'parent_id.pkl' file
        which is created in setup() function.

        :return: None
        """

        utils.delete_server(self.tester)
        utils.delete_parent_id_file()
