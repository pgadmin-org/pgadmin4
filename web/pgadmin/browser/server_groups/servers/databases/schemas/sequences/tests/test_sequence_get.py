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
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from . import utils as sequence_utils


class SequenceGetTestCase(BaseTestGenerator):
    """ This class will fetch added sequence under schema node. """

    scenarios = [
        # Fetching default URL for sequence node.
        ('Fetch sequence Node URL', dict(url='/browser/sequence/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function perform the three tasks
         1. Add the test server(s)
         2. Connect to server(s)
         3. Add database(s)
         4. Add schema(s)
         5. Add sequence(s)

        :return: None
        """

        # First, add the server
        server_utils.add_server(cls.tester)

        # Connect to server
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)
        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the database!!!")

        # Add database(s)
        database_utils.add_database(cls.tester, cls.server_connect_response,
                                    cls.server_ids)
        # Add schema(s)
        schema_utils.add_schemas(cls.tester)

        # Add sequence(s)
        sequence_utils.add_sequences(cls.tester)

    def runTest(self):
        """ This function will fetch added sequence under schema node. """

        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        db_ids_dict = all_id["did"][0]
        schema_ids_dict = all_id["scid"][0]
        sequence_ids_dict = all_id["seid"][0]

        for server_id in server_ids:
            db_id = db_ids_dict[int(server_id)]
            schema_info = schema_ids_dict[int(server_id)]
            schema_id = schema_info[0]
            sequence_id = sequence_ids_dict[server_id]
            get_response = sequence_utils.verify_sequence(self.tester,
                                                          utils.SERVER_GROUP,
                                                          server_id,
                                                          db_id,
                                                          schema_id,
                                                          sequence_id)
            self.assertEquals(get_response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """This function delete the added sequence, schema, database, server
        and parent id file

        :return: None
        """

        sequence_utils.delete_sequence(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
