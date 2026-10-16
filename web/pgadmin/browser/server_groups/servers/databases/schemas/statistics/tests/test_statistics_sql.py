##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
from urllib.parse import urlencode

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as statistics_utils


class StatisticsSQLTestCase(BaseTestGenerator):
    """
    This class checks the reverse engineered SQL for a statistics object
    defined on a mixture of columns and expressions, which has to describe
    both, and has to be valid SQL.
    """

    scenarios = [(
        'Reverse engineered SQL for a mixed statistics object', {}
    )]

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to fetch the "
                            "statistics SQL.")

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

        self.table_name = "test_table_stats_%s" % (str(uuid.uuid4())[1:8])
        statistics_utils.create_table_for_statistics(
            self.server, self.db_name, self.schema_name, self.table_name
        )

        # A statistics object over one column and one expression: neither
        # part may be lost when the definition is read back.
        self.statistics_name = "test_stats_sql_%s" % (str(uuid.uuid4())[1:8])
        self.statistics_id = statistics_utils.create_statistics_with_columns(
            self.server, self.db_name, self.schema_name, self.table_name,
            self.statistics_name, ["col1"], ["(col2 + 1)"], ["ndistinct"]
        )

    def runTest(self):
        response = self.tester.get(
            "/browser/statistics/sql/{0}/{1}/{2}/{3}/{4}".format(
                utils.SERVER_GROUP, self.server_id, self.db_id,
                self.schema_id, self.statistics_id
            ),
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200)

        sql = json.loads(response.data.decode('utf-8'))

        self.assertIn(
            'col1', sql,
            "The column is missing from the reverse engineered SQL."
        )
        self.assertIn(
            'col2 + 1', sql,
            "The expression is missing from the reverse engineered SQL."
        )

        # The modified SQL for a rename and a comment has to describe both
        # changes, and nothing else.
        response = self.tester.get(
            "/browser/statistics/msql/{0}/{1}/{2}/{3}/{4}?{5}".format(
                utils.SERVER_GROUP, self.server_id, self.db_id,
                self.schema_id, self.statistics_id,
                urlencode({
                    'name': json.dumps(self.statistics_name + '_renamed'),
                    'comment': 'A renamed statistics object',
                })
            ),
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 200)

        msql = json.loads(response.data.decode('utf-8'))['data']
        self.assertIn('ALTER STATISTICS', msql)
        self.assertIn('RENAME TO', msql)
        self.assertIn('COMMENT ON STATISTICS', msql)
        self.assertNotIn('CREATE STATISTICS', msql)

        # The definition has to be valid SQL, so drop the object and let the
        # server rebuild it from what we generated.
        statistics_utils.delete_statistics(
            self.server, self.db_name, self.schema_name, self.statistics_name
        )
        statistics_utils.execute_statement(
            self.server, self.db_name, sql
        )

        self.assertIsNotNone(
            statistics_utils.verify_statistics(
                self.server, self.db_name, self.statistics_name
            ),
            "The generated SQL did not recreate the statistics object."
        )

    def tearDown(self):
        statistics_utils.delete_statistics(
            self.server, self.db_name, self.schema_name, self.statistics_name
        )
        statistics_utils.drop_table_for_statistics(
            self.server, self.db_name, self.schema_name, self.table_name
        )
        database_utils.disconnect_database(self, self.server_id, self.db_id)
