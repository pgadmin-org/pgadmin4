##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for extended statistics objects (#2018).

The values ANALYZE collects for a statistics object, and the attribute
numbers behind its column list, are not part of its definition: two
databases holding the same definition must compare as identical whatever
ANALYZE happened to record. Where the definitions really do differ, the
generated SQL has to be valid, which means the whole definition, columns
and expressions alike, and the drop behaviour in the place PostgreSQL
expects it.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_statistics_diff'

DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.table_for_statistics (
    col1 integer NOT NULL,
    col2 integer,
    col3 text
);

INSERT INTO {0}.table_for_statistics
    SELECT i % 10, i % 5, 'val' || i FROM generate_series(1, 100) i;

CREATE STATISTICS {0}.statistics_identical (ndistinct, dependencies)
    ON col1, col2 FROM {0}.table_for_statistics;

CREATE STATISTICS {0}.statistics_mixed (ndistinct)
    ON col1, (lower(col3)) FROM {0}.table_for_statistics;

CREATE STATISTICS {0}.statistics_changed (ndistinct)
    ON col1, col2 FROM {0}.table_for_statistics;

COMMENT ON STATISTICS {0}.statistics_changed IS '{1} side';

ANALYZE {0}.table_for_statistics;
"""

# Only the source has this one, so the diff has to create it in the target.
SOURCE_ONLY_DDL = """
CREATE STATISTICS {0}.statistics_source_only (mcv)
    ON col2, (col1 + col2) FROM {0}.table_for_statistics;
"""

# Only the target has this one, so the diff has to drop it.
TARGET_ONLY_DDL = """
CREATE STATISTICS {0}.statistics_target_only (ndistinct)
    ON col1, col3 FROM {0}.table_for_statistics;
"""


class SchemaDiffStatisticsTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff against statistics objects. """
    scenarios = [
        ('Schema diff comparison of statistics objects', dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()

        # Extended statistics objects with expressions arrived in PG 14, and
        # the node does not claim to support anything older.
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute("SHOW server_version_num")
        server_version = int(pg_cursor.fetchone()[0])
        connection.close()
        if server_version < 140000:
            self.skipTest("Statistics not supported below PG 14")

        self.src_database = "db_stats_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_stats_diff_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        self.execute_sql(self.src_database, DDL.format(SCHEMA_NAME, 'source'))
        self.execute_sql(self.src_database,
                         SOURCE_ONLY_DDL.format(SCHEMA_NAME))
        self.execute_sql(self.tar_database, DDL.format(SCHEMA_NAME, 'target'))
        self.execute_sql(self.tar_database,
                         TARGET_ONLY_DDL.format(SCHEMA_NAME))

    def execute_sql(self, db_name, sql):
        """
        Run a statement batch against one of the test databases.

        :param db_name: Database to run against
        :param sql: SQL to execute
        """
        connection = utils.get_db_connection(db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(sql)
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()

    def compare(self):
        """
        Compare the two test databases and return the result.

        :return: List of compared objects
        """
        data = {
            'trans_id': self.trans_id,
            'source_sid': self.server_id,
            'source_did': self.src_db_id,
            'target_sid': self.server_id,
            'target_did': self.tar_db_id,
            'ignore_owner': 0,
            'ignore_whitespaces': 0,
            'ignore_tablespace': 0,
            'ignore_grants': 0
        }
        self.socket_client.emit('compare_database', data,
                                namespace=self.SOCKET_NAMESPACE)
        received = self.socket_client.get_received(self.SOCKET_NAMESPACE)
        response_data = received[-1]['args'][0]
        self.assertEqual(received[-1]['name'], "compare_database_success",
                         response_data)
        return response_data

    def find_object(self, response_data, title):
        """
        Pick a single compared statistics object out of the result.

        :param response_data: Result of compare()
        :param title: Object name
        :return: The compared object
        """
        for diff in response_data:
            if diff.get('type') == 'statistics' and \
                    diff.get('title') == title:
                return diff

        self.fail('statistics {0} was not compared'.format(title))

    def runTest(self):
        """ This function will test Schema Diff for statistics objects. """
        self.trans_id = str(secrets.choice(range(1, 99999)))
        response = self.tester.get(
            'schema_diff/initialize/{}'.format(self.trans_id))
        self.assertEqual(response.status_code, 200)

        received = self.socket_client.get_received(self.SOCKET_NAMESPACE)
        self.assertEqual(received[0]['name'], 'connected')

        self.tester.post(
            'schema_diff/server/connect/{}'.format(self.server_id),
            data=json.dumps({'password': self.server['db_password']}),
            content_type='html/json')
        self.tester.post('schema_diff/database/connect/{0}/{1}'.format(
            self.server_id, self.src_db_id))
        self.tester.post('schema_diff/database/connect/{0}/{1}'.format(
            self.server_id, self.tar_db_id))

        response_data = self.compare()

        # What ANALYZE recorded, and the attribute numbers behind the column
        # list, say nothing about the definition.
        identical = self.find_object(response_data, 'statistics_identical')
        self.assertEqual(identical['status'], 'Identical',
                         'Identical statistics objects were reported as {0}: '
                         '{1}'.format(identical['status'],
                                      identical.get('diff_ddl')))

        # Neither does either of them for a definition mixing a column and an
        # expression.
        mixed = self.find_object(response_data, 'statistics_mixed')
        self.assertEqual(mixed['status'], 'Identical',
                         'Identical statistics objects over a column and an '
                         'expression were reported as {0}: {1}'.format(
                             mixed['status'], mixed.get('diff_ddl')))

        # An object the source alone has must be created in the target, with
        # its column and its expression intact.
        source_only = self.find_object(response_data,
                                       'statistics_source_only')
        self.assertEqual(source_only['status'], 'Source Only')
        self.assertIn('CREATE STATISTICS', source_only['diff_ddl'])
        self.assertIn('col2', source_only['diff_ddl'])
        self.assertIn('col1 + col2', source_only['diff_ddl'])

        # An object the target alone has must be dropped, and DROP STATISTICS
        # takes its drop behaviour after the object name.
        target_only = self.find_object(response_data,
                                       'statistics_target_only')
        self.assertEqual(target_only['status'], 'Target Only')
        self.assertIn('DROP STATISTICS', target_only['diff_ddl'])
        self.assertNotIn('DROP STATISTICS CASCADE',
                         target_only['diff_ddl'])

        # A genuine difference is still reported.
        changed = self.find_object(response_data, 'statistics_changed')
        self.assertEqual(changed['status'], 'Different')
        self.assertIn('COMMENT ON STATISTICS', changed['diff_ddl'])

        # Applying the whole script must succeed, and must settle every
        # difference.
        for diff in (source_only, target_only, changed):
            self.execute_sql(self.tar_database, diff['diff_ddl'])

        response_data = self.compare()
        for title in ('statistics_identical', 'statistics_mixed',
                      'statistics_source_only', 'statistics_changed'):
            self.assertEqual(
                self.find_object(response_data, title)['status'], 'Identical',
                '{0} was not settled by the generated SQL'.format(title))

        for diff in response_data:
            if diff.get('type') == 'statistics':
                self.assertNotEqual(diff.get('title'),
                                    'statistics_target_only',
                                    'The generated SQL did not drop the '
                                    'object that only the target had.')

    def tearDown(self):
        """This function drops the added databases"""
        super().tearDown()
        for db_name in (self.src_database, self.tar_database):
            connection = utils.get_db_connection(self.server['db'],
                                                 self.server['username'],
                                                 self.server['db_password'],
                                                 self.server['host'],
                                                 self.server['port'],
                                                 self.server['sslmode'])
            try:
                utils.drop_database(connection, db_name)
            finally:
                connection.close()
