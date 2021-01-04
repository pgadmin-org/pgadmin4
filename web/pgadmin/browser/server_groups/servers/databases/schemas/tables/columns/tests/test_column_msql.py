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


class ColumnMsqlTestCase(BaseTestGenerator):
    """This class will test msql route of column with various combinations."""
    url = '/browser/column/msql/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("column_msql",
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
        self.column_name = self.inventory_data["name"] + \
            (str(uuid.uuid4())[1:8])
        col_data_type = self.inventory_data["data_type"]
        self.column_id = columns_utils.create_column(self.server,
                                                     self.db_name,
                                                     self.schema_name,
                                                     self.table_name,
                                                     self.column_name,
                                                     col_data_type)

        col_response = columns_utils.verify_column(self.server, self.db_name,
                                                   self.column_name)
        if not col_response:
            raise Exception("Could not find the column to update.")

    def runTest(self):
        url_encode_data = {"attnum": self.column_id}
        expected_len = None
        expected_precision = None

        if "new_len" in self.data:
            expected_len = self.data["new_len"]
            url_encode_data["attlen"] = expected_len

        if "new_precision" in self.data:
            expected_precision = self.data["new_precision"]
            url_encode_data["attprecision"] = expected_precision

        response = columns_utils.api_get_msql(self, url_encode_data)

        # Assert response
        utils.assert_status_code(self, response)

        response_data = json.loads(response.data.decode('utf-8'))

        if not expected_len and ("old_len" in self.data):
            expected_len = self.data["old_len"]

        if not expected_precision and ("old_precision" in self.data):
            expected_precision = self.data["old_precision"]

        expected_sql = (eval(self.expected_data["test_result_data"]))
        self.assertEqual(response_data['data'], expected_sql)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
