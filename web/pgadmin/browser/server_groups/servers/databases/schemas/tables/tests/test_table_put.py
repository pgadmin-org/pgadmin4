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
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class TablePutTestCase(BaseTestGenerator):
    """This class will add new collation under schema node."""
    url = '/browser/table/obj/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("table_put",
                                         tables_utils.test_cases)

    table_name = "test_table_parameters_%s" % (str(uuid.uuid4())[1:8])

    def setUp(self):
        # Load test data
        self.data = self.test_data

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        # Verify schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        # Get/Create table
        self.table_id = tables_utils.get_table_id(self.server, self.db_name,
                                                  self.table_name)
        if self.table_id is None:
            self.table_id = tables_utils.create_table(
                self.server, self.db_name,
                self.schema_name,
                self.table_name)

        # Verify table creation
        table_response = tables_utils.verify_table(self.server, self.db_name,
                                                   self.table_id)
        if not table_response:
            raise Exception("Could not find the table to update.")

    def runTest(self):
        """This function will fetch added table under schema node."""
        self.data['oid'] = self.table_id

        if "is_grant_tab" in self.inventory_data:
            grant_data = {"grantee": self.server["username"],
                          "grantor": self.server["username"]}
            self.data["columns"]["changed"][0]["attacl"]["added"][0].update(
                grant_data)

        if self.is_positive_test:
            response = tables_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
