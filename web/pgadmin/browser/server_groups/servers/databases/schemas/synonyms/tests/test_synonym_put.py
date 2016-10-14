# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid
import json

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.sequences.tests \
    import utils as sequence_utils
from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as functions_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from . import utils as synonym_utils


class SynonymPutTestCase(BaseTestGenerator):
    """This class will update added synonym under test schema."""

    scenarios = [
        # Fetching default URL for synonym node.
        ('Fetch synonym Node URL', dict(url='/browser/synonym/obj/'))
    ]

    def setUp(self):

        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        server_con = server_utils.connect_server(self, self.server_id)
        if server_con:
            if "server_type" in server_con["data"]:
                if server_con["data"]["server_type"] == "pg":
                    message = "Synonym not supported by PG."
                    self.skipTest(message)
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add synonym.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add the synonym.")
        self.sequence_name = "test_sequence_synonym_%s" % \
                             str(uuid.uuid4())[1:6]
        self.sequence_id = sequence_utils.create_sequences(
            self.server, self.db_name, self.schema_name, self.sequence_name)
        self.synonym_name = "test_synonym_put_%s" % str(uuid.uuid4())[1:6]
        synonym_utils.create_synonym(self.server,
                                     self.db_name,
                                     self.schema_name,
                                     self.synonym_name,
                                     self.sequence_name)

    def runTest(self):
        """This function will update synonym under schema node."""

        synonym_response = synonym_utils.verify_synonym(self.server,
                                                        self.db_name,
                                                        self.synonym_name)
        if not synonym_response:
            raise Exception("No synonym node to update.")
        func_name = "test_function_synonym_%s" % str(uuid.uuid4())[1:6]
        self.table_id = functions_utils.create_trigger_function(
            self.server, self.db_name, self.schema_name, func_name)

        data = {
            "name": self.synonym_name,
            "synobjname": func_name,
            "synobjschema": self.schema_name,
            "targettype": "Function"
        }
        response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.synonym_name),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """ Disconnect the database. """

        database_utils.disconnect_database(self, self.server_id, self.db_id)
