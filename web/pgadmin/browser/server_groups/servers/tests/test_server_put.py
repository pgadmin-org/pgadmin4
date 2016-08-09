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
        """
        This function perform the four tasks
         1. Add the test server
         2. Get the server
         3. Connect to server

        :return: None
        """

        # Firstly, add the server
        server_utils.add_server(cls.tester)

        # Get the server
        server_utils.get_server(cls.tester)

        # Connect to server
        cls.server_connect, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect) == 0:
            raise Exception("No Server(s) connected to update!!!")

    def runTest(self):
        """ This function will update the server's comment field. """

        for server_id in self.server_ids:
            data = {
                "comment":
                    server_utils.config_data['server_update_data'][0][
                        'comment'],
                "id": server_id
            }
            put_response = self.tester.put(
                self.url + str(self.server_group) + '/' +
                str(server_id), data=json.dumps(data),
                content_type='html/json')
            self.assertEquals(put_response.status_code, 200)

            response_data = json.loads(put_response.data.decode())
            self.assertTrue(response_data['success'], 1)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added server and the 'parent_id.pkl' file
        which is created in setup() function.

        :return: None
        """

        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
