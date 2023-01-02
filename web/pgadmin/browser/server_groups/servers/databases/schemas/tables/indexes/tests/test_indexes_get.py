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

from pgadmin.browser.server_groups.servers.databases.schemas.tables.columns. \
    tests import utils as columns_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as indexes_utils


class IndexesGetTestCase(BaseTestGenerator):
    """This class will get information about existing index/indexes"""
    url = "/browser/index/obj/"
    # Get list of test cases
    scenarios = utils.generate_scenarios("index_get",
                                         indexes_utils.test_cases)

    def setUp(self):
        """Creating index/indexes """
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")
        self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.column_name = "test_column_delete_%s" % (str(uuid.uuid4())[1:8])
        self.column_id = columns_utils.create_column(self.server,
                                                     self.db_name,
                                                     self.schema_name,
                                                     self.table_name,
                                                     self.column_name)
        self.index_name = "test_index_delete_%s" % (str(uuid.uuid4())[1:8])
        self.index_id = indexes_utils.create_index(self.server, self.db_name,
                                                   self.schema_name,
                                                   self.table_name,
                                                   self.index_name,
                                                   self.column_name)

        if self.is_list:
            self.index_name_1 = "test_index_delete_%s" % \
                                (str(uuid.uuid4())[1:8])
            self.index_ids = [self.index_id, indexes_utils.create_index(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.index_name_1, self.column_name)]

    def runTest(self):
        """ Function will do get api call using index id or
        empty index id for list of indexes"""
        if self.is_positive_test:
            if self.is_list:
                response = indexes_utils.api_get_index(self, "")
            else:
                response = indexes_utils.api_get_index(self, self.index_id)

            indexes_utils.assert_status_code(self, response)

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    if self.is_list:
                        response = indexes_utils.api_get_index(self, "")
                    else:
                        response = indexes_utils.api_get_index(self,
                                                               self.index_id)
            else:
                # Non-existing index id
                self.index_id = 2341
                response = indexes_utils.api_get_index(self, self.index_id)

            indexes_utils.assert_status_code(self, response)
            indexes_utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
