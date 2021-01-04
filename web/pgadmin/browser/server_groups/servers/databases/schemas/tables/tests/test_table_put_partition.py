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
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class TableUpdateTestCase(BaseTestGenerator):
    """This class will add new collation under schema node."""
    url = '/browser/table/obj/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("table_put_partition",
                                         tables_utils.test_cases)

    def setUp(self):
        # Load test data
        self.data = self.test_data

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]

        # Check Server version
        if "server_min_version" in self.inventory_data:
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "partitioned table.")
            if server_con["data"]["version"] < \
                    self.inventory_data["server_min_version"]:
                self.skipTest(self.inventory_data["skip_msg"])

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

        # Create table
        self.table_name = "test_table_put_%s" % (str(uuid.uuid4())[1:8])
        self.is_partition = self.inventory_data.get("is_partition",)
        if self.is_partition:
            self.table_id = tables_utils.create_table_for_partition(
                self.server,
                self.db_name,
                self.schema_name,
                self.table_name,
                'partitioned',
                self.inventory_data["partition_type"])
        else:
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
        self.data["id"] = self.table_id

        if self.is_partition:
            tables_utils.set_partition_data(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.inventory_data["partition_type"], self.data,
                self.inventory_data["mode"])

        if self.is_positive_test:
            response = tables_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = tables_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
