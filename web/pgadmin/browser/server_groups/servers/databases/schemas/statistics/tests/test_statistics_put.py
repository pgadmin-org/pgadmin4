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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as statistics_utils


class StatisticsUpdateTestCase(BaseTestGenerator):
    """This class will update the statistics under schema node."""

    # Generates scenarios
    scenarios = utils.generate_scenarios("statistics_put",
                                         statistics_utils.test_cases)

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
            raise Exception("Could not connect to database to update "
                            "statistics.")

        # Check server version (Statistics require PG 14+)
        server_con = server_utils.connect_server(self, self.server_id)
        if server_con["info"] != "Server connected.":
            raise Exception("Could not connect to server to check version")
        if server_con["data"]["version"] < 140000:
            self.skipTest("Statistics not supported below PG 14")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update statistics")

        # Create test table for statistics
        self.table_name = "test_table_stats_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = statistics_utils.create_table_for_statistics(
            self.server,
            self.db_name,
            self.schema_name,
            self.table_name
        )

        # Create statistics object
        self.statistics_name = "test_stats_update_%s" % \
                               (str(uuid.uuid4())[1:8])

        self.statistics_id = statistics_utils.get_statistics_id(
            self.server, self.db_name, self.statistics_name
        )
        if self.statistics_id is None:
            self.statistics_id = statistics_utils.create_statistics(
                self.server,
                self.db_name,
                self.schema_name,
                self.table_name,
                self.statistics_name,
                ["col1", "col2"],
                ["ndistinct", "dependencies"]
            )

    def runTest(self):
        """This function will update the statistics under schema node."""
        statistics_response = statistics_utils.verify_statistics(
            self.server, self.db_name, self.statistics_name
        )
        if not statistics_response:
            raise Exception("Could not find the statistics to update.")

        self.data["oid"] = self.statistics_id

        if self.is_positive_test:
            response = statistics_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify the update in the response
            response_data = json.loads(response.data.decode('utf-8'))
            self.assertIn('node', response_data)
        else:
            if self.mocking_required:
                with patch(
                    self.mock_data["function_name"],
                    side_effect=[eval(self.mock_data["return_value"])]
                ):
                    response = statistics_utils.api_put(self)
            else:
                response = statistics_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
