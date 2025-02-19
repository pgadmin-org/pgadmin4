##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as columns_utils
from pgadmin.utils import server_utils


class ColumnPutTestCase(BaseTestGenerator):
    """This class will update the column under table node."""
    url = '/browser/column/obj/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("column_put",
                                         columns_utils.test_cases)

    def setUp(self):
        super().setUp()
        # Load test data
        self.data = self.test_data

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]

        # Check DB version
        if "server_min_version" in self.inventory_data:
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "a table.")
            if server_con["data"]["version"] < \
                    self.inventory_data["server_min_version"]:
                self.skipTest(self.inventory_data["skip_msg"])

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        # Create table
        self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

        # Create column
        self.column_name = "test_column_put_%s" % (str(uuid.uuid4())[1:8])

        if "create_identity_column" in self.inventory_data:
            self.column_id = columns_utils.create_identity_column(
                self.server, self.db_name, self.schema_name,
                self.table_name, self.column_name,
                self.inventory_data["data_type"])
        else:
            self.column_id = columns_utils.create_column(
                self.server, self.db_name, self.schema_name,
                self.table_name, self.column_name,
                self.inventory_data["data_type"])

        # Verify column creation
        col_response = columns_utils.verify_column(self.server, self.db_name,
                                                   self.column_name)
        if not col_response:
            raise Exception("Could not find the column to update.")

    def runTest(self):
        """This function will update the column under table node."""
        self.data.update({
            'attnum': self.column_id,
            'name': self.column_name,
        })
        if self.is_positive_test:
            response = columns_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = columns_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
