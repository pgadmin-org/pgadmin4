##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class TableGetPreTablecreationParametersTestCase(BaseTestGenerator):
    """This class will add new collation under schema node."""
    url = '/browser/table/'

    # Generates scenarios
    scenarios = utils.generate_scenarios(
        "table_get_pre_table_creation_parameters",
        tables_utils.test_cases)

    def setUp(self):
        super().setUp()
        # Load test data
        self.data = self.test_data

        # Update url
        self.url = self.url + self.add_to_url

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

        self.table_name = "test_table_put_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def runTest(self):
        """This function will delete added table under schema node."""
        url_encode_data = None
        if hasattr(self, "url_encoded_data"):
            if "tid" in self.data:
                self.data["tid"] = self.table_id
            elif "tname" in self.data:
                self.data["tname"] = self.table_name
            url_encode_data = self.data

        if self.is_positive_test:
            response = tables_utils.api_get_pre_table_creation_params(
                self, url_encode_data)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = tables_utils.api_get_pre_table_creation_params(
                        self, url_encode_data)
            else:
                if 'table_id' in self.data:
                    self.table_id = self.data['table_id']
                response = tables_utils.api_get_pre_table_creation_params(
                    self, url_encode_data)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
