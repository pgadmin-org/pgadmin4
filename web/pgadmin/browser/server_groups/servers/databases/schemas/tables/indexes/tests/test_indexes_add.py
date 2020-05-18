##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
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
from . import utils as indexes_utils


class IndexesAddTestCase(BaseTestGenerator):
    """This class will add new index to existing table column"""
    url = "/browser/index/obj/"
    scenarios = utils.generate_scenarios("index_create",
                                         indexes_utils.test_cases)

    def setUp(self):
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
        self.table_name = "table_for_column_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def runTest(self):
        """This function will add index to existing table column."""
        self.data = self.test_data
        if "name" in self.data:
            self.index_name = self.data["name"] + (str(uuid.uuid4())[1:8])
            self.data["name"] = self.index_name

        if self.is_positive_test:
            response = indexes_utils.api_create_index(self)
            indexes_utils.assert_status_code(self, response)
            index_response = indexes_utils.verify_index(self.server,
                                                        self.db_name,
                                                        self.index_name)
            self.assertIsNot(index_response, "Could not find the newly "
                                             "created index.")

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = indexes_utils.api_create_index(self)
            else:
                response = indexes_utils.api_create_index(self)

            indexes_utils.assert_status_code(self, response)
            if self.expected_data["error_msg"] == "table_id":
                indexes_utils.assert_error_message(self, response,
                                                   self.table_id)
            else:
                indexes_utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
