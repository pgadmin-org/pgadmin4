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
from . import utils as columns_utils


class ColumnGetStatisticsTestCase(BaseTestGenerator):
    """This class will get column statistics under table node."""
    url = '/browser/column/stats/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("column_get_statistics",
                                         columns_utils.test_cases)

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
        self.column_name = "test_column_delete_%s" % (str(uuid.uuid4())[1:8])
        self.column_id = columns_utils.create_column(self.server,
                                                     self.db_name,
                                                     self.schema_name,
                                                     self.table_name,
                                                     self.column_name)

        # Create column
        self.column_name_1 = "test_column_delete_%s" % (str(uuid.uuid4())[1:8])
        self.column_id_1 = columns_utils.create_column(self.server,
                                                       self.db_name,
                                                       self.schema_name,
                                                       self.table_name,
                                                       self.column_name_1)

    def runTest(self):
        """This function will fetch the column statistics under table node."""
        if self.is_positive_test:
            response = columns_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = columns_utils.api_get(self)
            elif 'column_id' in self.data:
                self.column_id = self.data['column_id']
                response = columns_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
