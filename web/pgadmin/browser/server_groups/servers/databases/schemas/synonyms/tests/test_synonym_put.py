##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as functions_utils
from pgadmin.browser.server_groups.servers.databases.schemas.sequences.tests \
    import utils as sequence_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as synonym_utils


class SynonymPutTestCase(BaseTestGenerator):
    """This class will update added synonym under test schema."""
    skip_on_database = ['gpdb']

    scenarios = [
        # Fetching default URL for synonym node.
        ('Fetch synonym Node URL', dict(url='/browser/synonym/obj/'))
    ]

    def setUp(self):
        super(SynonymPutTestCase, self).setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        server_con = server_utils.connect_server(self, self.server_id)
        self.server_version = 0
        if server_con:
            if "type" in server_con["data"]:
                if server_con["data"]["type"] == "pg":
                    message = "Synonyms are not supported by PG."
                    self.skipTest(message)
                else:
                    if server_con["data"]["version"] >= 90200:
                        self.server_version = server_con["data"]["version"]
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
                             str(uuid.uuid4())[1:8]
        self.sequence_id = sequence_utils.create_sequences(
            self.server, self.db_name, self.schema_name, self.sequence_name)
        self.synonym_name = "test_synonym_put_%s" % str(uuid.uuid4())[1:8]
        self.syn_oid = synonym_utils.create_synonym(self.server,
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
        func_name = "test_function_synonym_%s" % str(uuid.uuid4())[1:8]
        self.table_id = functions_utils.create_trigger_function(
            self.server, self.db_name, self.schema_name, func_name,
            self.server_version)

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
            str(self.syn_oid),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """ Disconnect the database. """

        database_utils.disconnect_database(self, self.server_id, self.db_id)
