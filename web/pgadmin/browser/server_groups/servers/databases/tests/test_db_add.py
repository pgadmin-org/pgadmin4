# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils


class DatabaseAddTestCase(BaseTestGenerator):
    """
    This class will check server group node present on the object browser's
    tree node by response code.
    """

    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node URL', dict(url='/browser/database/obj/'))
    ]

    def setUp(self):
        """
        This function used to add the sever

        :return: None
        """

        # Add the server
        utils.add_server(self.tester)

    def runTest(self):
        """ This function will add database under 1st server of tree node. """

        server_connect_response, server_group, server_ids = \
            utils.connect_server(self.tester)

        for server_connect, server_id in zip(server_connect_response,
                                             server_ids):
            if server_connect['data']['connected']:
                data = utils.get_db_data(server_connect)
                db_response = self.tester.post(self.url + str(server_group) +
                                               "/" + server_id + "/",
                                               data=json.dumps(data),
                                               content_type='html/json')
                self.assertTrue(db_response.status_code, 200)
                response_data = json.loads(db_response.data.decode('utf-8'))
                utils.write_db_parent_id(response_data)

    def tearDown(self):
        """
        This function deletes the added database, added server and the
        'parent_id.pkl' file which is created in setup()

        :return: None
        """

        utils.delete_database(self.tester)
        utils.delete_server(self.tester)
        utils.delete_parent_id_file()
