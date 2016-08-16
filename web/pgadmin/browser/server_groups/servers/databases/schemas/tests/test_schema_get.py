# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from regression import test_utils as utils
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from . import utils as schema_utils


class SchemaGetTestCase(BaseTestGenerator):
    """ This class will add new schema under database node. """

    scenarios = [
        # Fetching default URL for extension node.
        ('Check Schema Node URL', dict(url='/browser/schema/obj/'))
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
        # Add schemas
        schema_utils.add_schemas(cls.tester)

    def runTest(self):
        """ This function will delete schema under database node. """

        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        db_ids_dict = all_id["did"][0]
        schema_ids_dict = all_id["scid"][0]

        for server_id in server_ids:
            db_id = db_ids_dict[int(server_id)]
            db_con = database_utils.verify_database(self.tester,
                                                    utils.SERVER_GROUP,
                                                    server_id, db_id)
            if db_con['data']["connected"]:
                schema_id = schema_ids_dict[int(server_id)][0]
                schema_response = schema_utils.verify_schemas(self.tester,
                                                              server_id, db_id,
                                                              schema_id)
                self.assertTrue(schema_response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added schemas, database, server
        and the 'parent_id.pkl' file which is created in setup() function.

        :return: None
        """

        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
