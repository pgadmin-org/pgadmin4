##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

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


class IndexConstraintGetTestCase(BaseTestGenerator):
    """This class will fetch the index constraint(primary key or unique key) of
    table column"""

    # Generates scenarios from cast_test_data.json file
    scenarios = utils.generate_scenarios("index_constraint_get",
                                         index_constraint_utils.test_cases)

    def setUp(self):
        super().setUp()
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

        # Create constraint
        self.constraint_name = self.data["constraint_name"] + \
            (str(uuid.uuid4())[1:8])
        self.type = self.data["type"]
        self.index_constraint_id = index_constraint_utils. \
            create_index_constraint(self.server, self.db_name,
                                    self.schema_name, self.table_name,
                                    self.constraint_name, self.type)

    def runTest(self):
        """This function will fetch the index constraint(primary key or
        unique key) of table column."""
        if self.is_positive_test:
            if self.is_list:
                self.data['ids'] = [self.index_constraint_id]
                response = index_constraint_utils.api_get(self, '')
            else:
                response = index_constraint_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = index_constraint_utils.api_get(self)
            elif "index_constraint_id" in self.data:
                self.index_constraint_id = self.data["index_constraint_id"]
                response = index_constraint_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
