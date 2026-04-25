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
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as statistics_utils


class StatisticsDeleteTestCase(BaseTestGenerator):
    """This class will delete the statistics object under schema node."""

    # Generates scenarios
    scenarios = utils.generate_scenarios("statistics_delete",
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
            raise Exception("Could not connect to database to delete "
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
            raise Exception("Could not find the schema to delete statistics")

        # Create test table for statistics
        self.table_name = "test_table_stats_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = statistics_utils.create_table_for_statistics(
            self.server,
            self.db_name,
            self.schema_name,
            self.table_name
        )

        # Create statistics object
        self.statistics_name = "test_stats_delete_%s" % \
                               (str(uuid.uuid4())[1:8])

        self.statistics_id = statistics_utils.create_statistics(
            self.server,
            self.db_name,
            self.schema_name,
            self.table_name,
            self.statistics_name,
            ["col1", "col2"],
            ["ndistinct", "dependencies"]
        )

        statistics_response = statistics_utils.verify_statistics(
            self.server, self.db_name, self.statistics_name
        )
        if not statistics_response:
            raise Exception("Could not find the statistics to delete.")

        # For multiple delete test
        if self.is_list:
            self.statistics_name_2 = "test_stats_delete_%s" % \
                                     (str(uuid.uuid4())[1:8])

            self.statistics_id_2 = statistics_utils.create_statistics(
                self.server,
                self.db_name,
                self.schema_name,
                self.table_name,
                self.statistics_name_2,
                ["col1", "col2"],
                ["ndistinct"]
            )

            statistics_response = statistics_utils.verify_statistics(
                self.server, self.db_name, self.statistics_name_2
            )
            if not statistics_response:
                raise Exception("Could not find the second statistics "
                                "to delete.")

            # List to delete multiple statistics
            self.data['ids'] = [self.statistics_id, self.statistics_id_2]

    def runTest(self):
        """This function will delete the statistics under schema node."""

        if self.is_positive_test:
            if self.is_list:
                response = statistics_utils.api_delete(self, '')
            else:
                response = statistics_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            statistics_response = statistics_utils.verify_statistics(
                self.server, self.db_name, self.statistics_name
            )
            self.assertIsNone(statistics_response,
                              "Deleted statistics still present")
        else:
            if self.mocking_required:
                with patch(
                    self.mock_data["function_name"],
                    side_effect=[eval(self.mock_data["return_value"])]
                ):
                    response = statistics_utils.api_delete(self)
            elif 'statistics_id' in self.data:
                self.statistics_id = self.data["statistics_id"]
                response = statistics_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
