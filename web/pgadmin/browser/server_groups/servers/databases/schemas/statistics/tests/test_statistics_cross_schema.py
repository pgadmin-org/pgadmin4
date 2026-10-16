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


class StatisticsCrossSchemaTestCase(BaseTestGenerator):
    """
    This class checks a statistics object defined in one schema on a table
    in another: its properties and reverse engineered SQL have to name the
    table's own schema, and the values ANALYZE collected have to be shown to
    the table's owner.
    """

    scenarios = [(
        'Statistics object on a table in another schema', {}
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
                            "statistics.")

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

        # The table lives in a schema of its own.
        self.table_schema = "test_stats_tbl_schema_%s" % \
                            (str(uuid.uuid4())[1:8])
        schema_utils.create_schema(
            utils.get_db_connection(
                self.db_name, self.server['username'],
                self.server['db_password'], self.server['host'],
                self.server['port'], self.server['sslmode']),
            self.table_schema)
        self.table_name = "test_table_stats_%s" % (str(uuid.uuid4())[1:8])
        statistics_utils.create_table_for_statistics(
            self.server, self.db_name, self.table_schema, self.table_name
        )

        self.statistics_name = "test_stats_xschema_%s" % \
                               (str(uuid.uuid4())[1:8])
        statistics_utils.execute_statement(
            self.server, self.db_name,
            'CREATE STATISTICS "%s"."%s" (ndistinct) ON col1, col2 '
            'FROM "%s"."%s"' % (self.schema_name, self.statistics_name,
                                self.table_schema, self.table_name))
        statistics_utils.execute_statement(
            self.server, self.db_name,
            'ANALYZE "%s"."%s"' % (self.table_schema, self.table_name))
        self.statistics_id = statistics_utils.get_statistics_id(
            self.server, self.db_name, self.statistics_name
        )

    def runTest(self):
        url_ids = "{0}/{1}/{2}/{3}/{4}".format(
            utils.SERVER_GROUP, self.server_id, self.db_id,
            self.schema_id, self.statistics_id
        )

        response = self.tester.get(
            "/browser/statistics/obj/" + url_ids, follow_redirects=True
        )
        self.assertEqual(response.status_code, 200)
        properties = json.loads(response.data.decode('utf-8'))
        self.assertEqual(properties['schema'], self.schema_name)
        self.assertEqual(properties['table_schema'], self.table_schema)

        # The test role owns the table, so it may see what ANALYZE found.
        self.assertTrue(properties['has_ext_data_access'])
        self.assertIsNotNone(properties['ndistinct_values'])

        response = self.tester.get(
            "/browser/statistics/sql/" + url_ids, follow_redirects=True
        )
        self.assertEqual(response.status_code, 200)
        sql = json.loads(response.data.decode('utf-8'))
        self.assertIn(
            'FROM {0}.{1}'.format(self.table_schema, self.table_name),
            sql.replace('"', ''))

        # The definition has to be valid SQL, so drop the object and let the
        # server rebuild it from what we generated.
        statistics_utils.delete_statistics(
            self.server, self.db_name, self.schema_name, self.statistics_name
        )
        statistics_utils.execute_statement(self.server, self.db_name, sql)
        self.assertIsNotNone(
            statistics_utils.verify_statistics(
                self.server, self.db_name, self.statistics_name
            ),
            "The generated SQL did not recreate the statistics object."
        )

        # The modified SQL for a new object refuses an unknown statistics
        # kind rather than writing it into the SQL.
        response = self.tester.get(
            "/browser/statistics/msql/{0}/{1}/{2}/{3}/?{4}".format(
                utils.SERVER_GROUP, self.server_id, self.db_id,
                self.schema_id,
                urlencode({
                    'name': json.dumps('test_stats_msql'),
                    'schema': json.dumps(self.schema_name),
                    'table': json.dumps(self.table_name),
                    'columns': json.dumps(['col1', 'col2']),
                    'stat_types': json.dumps(['ndistinct; SELECT 1']),
                })
            ),
            follow_redirects=True
        )
        self.assertEqual(response.status_code, 400)

    def tearDown(self):
        statistics_utils.execute_statement(
            self.server, self.db_name,
            'DROP SCHEMA "%s" CASCADE' % self.table_schema)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
