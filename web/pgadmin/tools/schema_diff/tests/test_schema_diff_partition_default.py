##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for partitioned table rebuilds (#10301).

When Schema Diff has to rebuild a partitioned table (e.g. because a
partition's bounds changed) it creates a temporary partitioned table, adds
a scaffolding DEFAULT partition to it so the row-copy INSERT does not fail
on rows that match none of the real partitions, copies the rows across and
then renames everything into place. Two things must hold once that is
done:

* If the source table has no default partition of its own, the scaffolding
  one must be dropped again, otherwise the rebuilt target ends up with an
  extra default partition the source never had.
* If the source table genuinely has a default partition, only one DEFAULT
  partition may exist on the temporary table (Postgres allows a single
  one), and it must be the real one, not the scaffolding one.
* If the target table already holds rows that fall outside every one of
  the rebuilt partitions' bounds (so they land in the scaffolding DEFAULT
  partition during the copy), those rows must not be silently discarded
  when the scaffolding partition would otherwise be dropped.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_partition_default_diff'

DDL_SOURCE = """
CREATE SCHEMA {0};

CREATE TABLE {0}.part_no_default (
    col1 integer NOT NULL
) PARTITION BY RANGE (col1);

CREATE TABLE {0}.part_no_default_p1 PARTITION OF {0}.part_no_default
    FOR VALUES FROM (1) TO (10);
CREATE TABLE {0}.part_no_default_p2 PARTITION OF {0}.part_no_default
    FOR VALUES FROM (10) TO (20);

CREATE TABLE {0}.part_with_default (
    col1 integer NOT NULL
) PARTITION BY RANGE (col1);

CREATE TABLE {0}.part_with_default_p1 PARTITION OF {0}.part_with_default
    FOR VALUES FROM (1) TO (10);
CREATE TABLE {0}.part_with_default_def PARTITION OF {0}.part_with_default
    DEFAULT;

CREATE TABLE {0}.part_stray_rows (
    col1 integer NOT NULL
) PARTITION BY RANGE (col1);

CREATE TABLE {0}.part_stray_rows_p1 PARTITION OF {0}.part_stray_rows
    FOR VALUES FROM (1) TO (10);
"""

# The target starts out with different partition bounds so that Schema Diff
# has to rebuild both tables; the default-partition shape of each table
# matches its source counterpart's *before* the fix, i.e. still wrong,
# forcing Schema Diff's generated DDL to correct it.
DDL_TARGET = """
CREATE SCHEMA {0};

CREATE TABLE {0}.part_no_default (
    col1 integer NOT NULL
) PARTITION BY RANGE (col1);

CREATE TABLE {0}.part_no_default_p1 PARTITION OF {0}.part_no_default
    FOR VALUES FROM (1) TO (5);

INSERT INTO {0}.part_no_default_p1 VALUES (2), (3);

CREATE TABLE {0}.part_with_default (
    col1 integer NOT NULL
) PARTITION BY RANGE (col1);

CREATE TABLE {0}.part_with_default_p1 PARTITION OF {0}.part_with_default
    FOR VALUES FROM (1) TO (5);
CREATE TABLE {0}.part_with_default_def PARTITION OF {0}.part_with_default
    DEFAULT;

-- col1=2 fits the regular partition both before and after the rebuild;
-- col1=50 fits neither the old nor the new bounds of the regular
-- partition, so it must land (and stay) in the genuine DEFAULT partition
-- across the rebuild.
INSERT INTO {0}.part_with_default VALUES (2), (50);

CREATE TABLE {0}.part_stray_rows (
    col1 integer NOT NULL
) PARTITION BY RANGE (col1);

CREATE TABLE {0}.part_stray_rows_p1 PARTITION OF {0}.part_stray_rows
    FOR VALUES FROM (1) TO (5);
CREATE TABLE {0}.part_stray_rows_def PARTITION OF {0}.part_stray_rows
    DEFAULT;

-- col1=2 fits the rebuilt regular partition's new bounds; col1=500 fits
-- neither the old nor the new bounds of any regular partition, so it is
-- only reachable via a DEFAULT partition. The source table has no
-- DEFAULT partition of its own, so this row can only survive the
-- rebuild if the scaffolding DEFAULT partition is kept instead of being
-- unconditionally dropped once it holds data.
INSERT INTO {0}.part_stray_rows VALUES (2), (500);
"""


class SchemaDiffPartitionDefaultTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff against partitioned table
    rebuilds involving default partitions. """
    scenarios = [
        ('Schema diff comparison of partition rebuild default partitions',
         dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_part_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_part_diff_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        self.execute_sql(self.src_database, DDL_SOURCE.format(SCHEMA_NAME))
        self.execute_sql(self.tar_database, DDL_TARGET.format(SCHEMA_NAME))

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

    def fetch_scalar(self, db_name, sql):
        """
        Run a query against one of the test databases and return the
        first column of the first row.

        :param db_name: Database to run against
        :param sql: SQL to execute
        """
        connection = utils.get_db_connection(db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        pg_cursor = connection.cursor()
        pg_cursor.execute(sql)
        result = pg_cursor.fetchone()[0]
        connection.close()
        return int(result)

    def count_default_partitions(self, db_name, table_name):
        """
        Count how many DEFAULT partitions the given partitioned table has
        in the given database.
        """
        return self.fetch_scalar(
            db_name,
            "SELECT count(*) FROM pg_inherits i "
            "JOIN pg_class c ON c.oid = i.inhrelid "
            "JOIN pg_class p ON p.oid = i.inhparent "
            "WHERE p.relname = '{0}' "
            "AND p.relnamespace = '{1}'::regnamespace "
            "AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'".format(
                table_name, SCHEMA_NAME))

    def count_rows(self, db_name, table_name):
        """
        Count how many rows the given table holds in the given database.
        """
        return self.fetch_scalar(
            db_name,
            "SELECT count(*) FROM {0}.{1}".format(SCHEMA_NAME, table_name))

    def count_partitions(self, db_name, table_name):
        """
        Count how many partitions the given partitioned table has in the
        given database.
        """
        return self.fetch_scalar(
            db_name,
            "SELECT count(*) FROM pg_inherits i "
            "JOIN pg_class p ON p.oid = i.inhparent "
            "WHERE p.relname = '{0}' "
            "AND p.relnamespace = '{1}'::regnamespace".format(
                table_name, SCHEMA_NAME))

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

    def find_object(self, response_data, node_type, title):
        """
        Pick a single compared object out of the comparison result.

        :param response_data: Result of compare()
        :param node_type: Node type, e.g. 'table'
        :param title: Object name
        :return: The compared object
        """
        for diff in response_data:
            if diff.get('type') == node_type and diff.get('title') == title:
                return diff

        self.fail('{0} {1} was not compared'.format(node_type, title))

    def runTest(self):
        """ This function will test Schema Diff for partition rebuilds
        that involve default partitions. """
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

        # --- Source has no default partition of its own. ---
        no_default = self.find_object(response_data, 'table',
                                      'part_no_default')
        self.assertEqual(no_default['status'], 'Different')
        diff_ddl = no_default['diff_ddl']

        # Applying the diff must succeed and leave no default partition
        # behind, since the source table doesn't have one.
        self.execute_sql(self.tar_database, diff_ddl)
        self.assertEqual(
            self.count_default_partitions(self.tar_database,
                                          'part_no_default'), 0,
            'Schema Diff left a scaffolding default partition behind on '
            'a table whose source has no default partition: '
            '{0}'.format(diff_ddl))
        self.assertEqual(
            self.count_partitions(self.tar_database, 'part_no_default'), 2)
        # The rows that were copied via the scaffolding default partition
        # must still be there once it is dropped.
        self.assertEqual(
            self.count_rows(self.tar_database, 'part_no_default'), 2,
            'Schema Diff lost rows while rebuilding a table whose source '
            'has no default partition: {0}'.format(diff_ddl))

        # --- Source has a genuine default partition. ---
        with_default = self.find_object(response_data, 'table',
                                        'part_with_default')
        self.assertEqual(with_default['status'], 'Different')
        diff_ddl = with_default['diff_ddl']

        # Applying the diff must succeed (it must not try to create two
        # DEFAULT partitions on the temporary table) and the real default
        # partition must survive.
        self.execute_sql(self.tar_database, diff_ddl)
        self.assertEqual(
            self.count_default_partitions(self.tar_database,
                                          'part_with_default'), 1,
            'Schema Diff did not preserve the source table\'s genuine '
            'default partition: {0}'.format(diff_ddl))
        self.assertEqual(
            self.count_partitions(self.tar_database, 'part_with_default'),
            2)
        # The row that fits the regular partition and the row that only
        # ever fit the DEFAULT partition must both survive the rebuild.
        self.assertEqual(
            self.count_rows(self.tar_database, 'part_with_default'), 2,
            'Schema Diff lost rows while rebuilding a table whose source '
            'has a genuine default partition: {0}'.format(diff_ddl))

        # --- Target has rows outside every rebuilt partition's bounds. ---
        # The source table has no default partition of its own, so a
        # scaffolding one is created purely to let the row-copy INSERT
        # succeed. col1=500 in the target doesn't fit any real partition
        # in the rebuilt scheme, so it can only be copied via that
        # scaffolding partition; it must not be lost when the scaffolding
        # partition is cleaned up.
        stray_rows = self.find_object(response_data, 'table',
                                      'part_stray_rows')
        self.assertEqual(stray_rows['status'], 'Different')
        diff_ddl = stray_rows['diff_ddl']

        self.execute_sql(self.tar_database, diff_ddl)
        self.assertEqual(
            self.count_rows(self.tar_database, 'part_stray_rows'), 2,
            'Schema Diff silently dropped a row that fell outside every '
            'rebuilt partition\'s bounds: {0}'.format(diff_ddl))
        self.assertEqual(
            self.fetch_scalar(
                self.tar_database,
                "SELECT count(*) FROM {0}.part_stray_rows "
                "WHERE col1 = 500".format(SCHEMA_NAME)), 1,
            'Schema Diff dropped the out-of-bounds row instead of routing '
            'it to a durable partition: {0}'.format(diff_ddl))
        self.assertEqual(
            self.count_default_partitions(self.tar_database,
                                          'part_stray_rows'), 1,
            'Schema Diff dropped the scaffolding default partition even '
            'though it still held an out-of-bounds row: {0}'.format(
                diff_ddl))
        self.assertEqual(
            self.count_partitions(self.tar_database, 'part_stray_rows'), 2)

        # Re-comparing must now report both bounds-only tables as
        # identical.
        response_data = self.compare()
        self.assertEqual(
            self.find_object(response_data, 'table',
                             'part_no_default')['status'], 'Identical')
        self.assertEqual(
            self.find_object(response_data, 'table',
                             'part_with_default')['status'], 'Identical')
        # part_stray_rows legitimately still differs from its source: the
        # target kept a default partition (holding the recovered
        # out-of-bounds row) that the source doesn't have. Preserving the
        # data takes priority over reporting a false "Identical".
        self.assertEqual(
            self.find_object(response_data, 'table',
                             'part_stray_rows')['status'], 'Different')

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
            utils.drop_database(connection, db_name)
