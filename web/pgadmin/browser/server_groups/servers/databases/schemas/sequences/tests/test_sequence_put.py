##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as sequence_utils


class SequencePutTestCase(BaseTestGenerator):
    """This class will update added sequence under schema node."""
    scenarios = [
        # Fetching default URL for sequence node.
        ('Alter positive sequence comment, increment, max and min value',
         dict(
             url='/browser/sequence/obj/',
             data={
                 "comment": "This is sequence update comment",
                 "increment": "5",
                 "maximum": "1000",
                 "minimum": "10",
             },
             positive_seq=True
         )),
        ('Alter negative sequence comment, increment, max and min value',
         dict(
             url='/browser/sequence/obj/',
             data={
                 "comment": "This is sequence update comment",
                 "increment": "-7",
                 "maximum": "-15",
                 "minimum": "-35",
             },
             positive_seq=False
         ))
    ]

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add sequence.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add sequence.")
        self.sequence_name = "test_sequence_delete_%s" % str(uuid.uuid4())[1:8]
        self.sequence_id = sequence_utils.create_sequences(
            self.server, self.db_name, self.schema_name, self.sequence_name,
            self.positive_seq
        )

    def runTest(self):
        """This function will update added sequence under schema node."""
        sequence_response = sequence_utils.verify_sequence(self.server,
                                                           self.db_name,
                                                           self.sequence_name)
        if not sequence_response:
            raise Exception("Could not find the sequence to delete.")

        # Add sequence id.
        self.data["id"] = self.sequence_id

        response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.sequence_id),
            data=json.dumps(self.data),
            follow_redirects=True)
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
