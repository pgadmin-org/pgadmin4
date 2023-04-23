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
from . import utils as index_constraint_utils
from pgadmin.utils import server_utils


class IndexConstraintAddTestCase(BaseTestGenerator):
    """This class will add index constraint(primary key or unique key) to
    table column"""
    # Generates scenarios
    scenarios = utils.generate_scenarios("index_constraint_create",
                                         index_constraint_utils.test_cases)

    def setUp(self):
        super().setUp()
        # Load test data
        self.data = self.test_data

        # Check server version
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]

        if "server_min_version" in self.inventory_data:
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "partitioned table.")
            if server_con["data"]["version"] < \
                    self.inventory_data["server_min_version"]:
                self.skipTest(self.inventory_data["skip_msg"])

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a "
                            "index constraint(primary key or unique key).")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a index "
                            "constraint(primary key or unique key).")

        # Create table
        self.table_name = "table_indexconstraint_%s" % \
                          (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server,
                                                  self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def runTest(self):
        """This function will add index constraint(primary key or unique key)
        to table column."""
        # Create using index
        if "index" in self.data:
            index_name = self.data["index"] + (str(uuid.uuid4())[1:8])
            self.data["index"] = index_name

            self.index_id = index_constraint_utils.create_unique_index(
                self.server, self.db_name, self.schema_name, self.table_name,
                index_name, "name")

        # Constraint name
        if "constraint_name" in self.data:
            constraint_name = self.data["constraint_name"] + (
                str(uuid.uuid4())[1:8])
            self.data["name"] = constraint_name
        else:
            if "index" in self.data:
                if "primary_key" in self.url:
                    constraint_name = index_name
                else:
                    constraint_name = self.table_name + '_id_key'
            else:
                if "primary_key" in self.url:
                    constraint_name = self.table_name + '_pkey'
                elif "columns" in self.data:
                    constraint_name = self.table_name + '_' + \
                        self.data["columns"][0]["column"] + '_key'

        if self.is_positive_test:
            response = index_constraint_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            self.assertIsNotNone(index_constraint_utils.
                                 verify_index_constraint(self.server,
                                                         self.db_name,
                                                         constraint_name),
                                 "Could not find constraint created.")
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = index_constraint_utils.api_create(self)
            else:
                response = index_constraint_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
