# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import json

from regression import test_utils as utils
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from . import utils as synonym_utils


class SynonymGetTestCase(BaseTestGenerator):
    """ This class will fetch new synonym under schema node. """

    scenarios = [
        # Fetching default URL for synonym node.
        ('Fetch synonym Node URL', dict(url='/browser/synonym/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function perform the three tasks
         1. Add the test server
         2. Connect to server
         3. Add the databases
         4. Add the schemas
         5. Add the synonyms

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
        # Add synonyms
        synonym_utils.add_synonym(cls.tester, cls.server_connect_response,
                                      cls.server_ids)

    def runTest(self):
        """ This function will fetch synonym under schema node. """

        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        db_ids_dict = all_id["did"][0]
        schema_ids_dict = all_id["scid"][0]
        synonym_ids_dict = all_id["syid"][0]

        for server_id in server_ids:
            db_id = db_ids_dict[int(server_id)]
            db_con = database_utils.verify_database(self.tester,
                                                    utils.SERVER_GROUP,
                                                    server_id, db_id)
            if db_con['data']["connected"]:
                schema_info = schema_ids_dict[int(server_id)]
                schema_response = schema_utils.verify_schemas(
                    self.tester, server_id, db_id, schema_info[0])
                schema_response = json.loads(
                    schema_response.data.decode('utf-8'))
                if len(schema_response) != 0:
                    synonym_id = synonym_ids_dict[int(server_id)]
                    get_response = synonym_utils.verify_synonym(
                        self.tester, server_id, db_id, schema_info[0],
                        synonym_id)
                    self.assertEquals(get_response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added synonyms, schemas, database,
        server and the 'parent_id.pkl' file which is created in setup()
        function.

        :return: None
        """

        synonym_utils.delete_synonym(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()

