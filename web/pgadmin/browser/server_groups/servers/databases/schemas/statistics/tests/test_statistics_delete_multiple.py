##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as statistics_utils


class StatisticsDeleteMultipleTestCase(BaseTestGenerator):
    """This class will delete multiple statistics objects under schema node"""

    scenarios = [
        # Fetching default URL for statistics node.
        ('Fetch statistics Node URL', dict(url='/browser/statistics/obj/'))
    ]

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add statistics")

        # Check server version (Statistics require PG 14+)
        server_con = server_utils.connect_server(self, self.server_id)
        if server_con["info"] != "Server connected.":
            raise Exception("Could not connect to server to check version")
        if server_con["data"]["version"] < 140000:
            self.skipTest("Statistics not supported below PG 14")

        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add statistics.")

        # Create test table for statistics
        self.table_name = "test_table_stats_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = statistics_utils.create_table_for_statistics(
            self.server,
            self.db_name,
            self.schema_name,
            self.table_name
        )

        # Create multiple statistics objects
        self.statistics_name = "test_stats_delete_%s" % str(uuid.uuid4())[1:8]
        self.statistics_name_1 = "test_stats_delete_%s" % \
                                 str(uuid.uuid4())[1:8]

        self.statistics_ids = [
            statistics_utils.create_statistics(
                self.server,
                self.db_name,
                self.schema_name,
                self.table_name,
                self.statistics_name,
                ["col1", "col2"],
                ["ndistinct", "dependencies"]
            ),
            statistics_utils.create_statistics(
                self.server,
                self.db_name,
                self.schema_name,
                self.table_name,
                self.statistics_name_1,
                ["col1", "col2"],
                ["mcv"]
            )
        ]

    def runTest(self):
        """This function will delete multiple statistics under schema node"""
        statistics_response = statistics_utils.verify_statistics(
            self.server,
            self.db_name,
            self.statistics_name
        )
        if not statistics_response:
            raise Exception("Could not find the statistics to delete.")

        statistics_response = statistics_utils.verify_statistics(
            self.server,
            self.db_name,
            self.statistics_name_1
        )
        if not statistics_response:
            raise Exception("Could not find the statistics to delete.")

        data = json.dumps({'ids': self.statistics_ids})
        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/',
            follow_redirects=True,
            data=data,
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
