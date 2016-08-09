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
from regression.test_setup import advanced_config_data
from regression.test_utils import get_ids
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from . import utils as database_utils


class DatabasesUpdateTestCase(BaseTestGenerator):
    """
    This class will update the database under last added server.
    """

    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node', dict(url='/browser/database/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function perform the three tasks
         1. Add the test server
         2. Connect to server
         3. Add the databases

        :return: None
        """

        # Firstly, add the server
        server_utils.add_server(cls.tester)

        # Connect to server
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the database!!!")

        # Add database
        database_utils.add_database(cls.tester, cls.server_connect_response,
                                    cls.server_ids)

    def runTest(self):
        """ This function will update the comments field of database."""

        all_id = get_ids()
        server_ids = all_id["sid"]
        db_ids_dict = all_id["did"][0]

        for server_id in server_ids:
            db_id = db_ids_dict[int(server_id)]
            db_con = database_utils.verify_database(self.tester,
                                                    utils.SERVER_GROUP,
                                                    server_id,
                                                    db_id)
            if db_con["info"] == "Database connected.":
                data = {
                    "comments": advanced_config_data["db_update_data"][0]
                    ["comment"],
                    "id": db_id
                }
                put_response = self.tester.put(
                    self.url + str(utils.SERVER_GROUP) + '/' + str(
                        server_id) + '/' +
                    str(db_id), data=json.dumps(data), follow_redirects=True)
                self.assertEquals(put_response.status_code, 200)

    @classmethod
    def tearDownClass(self):
        """
        This function deletes the added server and 'parent_id.pkl' file
        which is created in setup() function.

        :return: None
        """

        database_utils.delete_database(self.tester)
        server_utils.delete_server(self.tester)
        utils.delete_parent_id_file()
