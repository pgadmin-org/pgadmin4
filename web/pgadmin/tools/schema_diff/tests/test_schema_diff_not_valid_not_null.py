##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for NOT VALID NOT NULL constraints (#10882).

On PostgreSQL 18 a NOT NULL constraint added as NOT VALID still sets
attnotnull, so it must not be turned into an inline NOT NULL, which would
validate it (failing outright on a column that holds NULLs). The SQL that
Schema Diff generates has to recreate the constraint as NOT VALID, and
applying it has to leave the two tables identical.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_nn_not_valid_diff'

# Each table is named after its state in the source, then in the target.
# The target tables that lack a validated NOT NULL hold a NULL, so a
# validated constraint cannot be added to them by mistake.
SOURCE_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.nv_identical (a integer);
ALTER TABLE {0}.nv_identical ADD CONSTRAINT nn_a NOT NULL a NOT VALID;

CREATE TABLE {0}.nv_source_only (a integer);
ALTER TABLE {0}.nv_source_only ADD CONSTRAINT nn_a NOT NULL a NOT VALID;

CREATE TABLE {0}.nv_to_none (a integer);
ALTER TABLE {0}.nv_to_none ADD CONSTRAINT nn_a NOT NULL a NOT VALID;

CREATE TABLE {0}.nv_to_valid (a integer);
ALTER TABLE {0}.nv_to_valid ADD CONSTRAINT nn_a NOT NULL a NOT VALID;

CREATE TABLE {0}.valid_to_nv (a integer NOT NULL);

CREATE TABLE {0}.nv_serial_source_only (a serial);
ALTER TABLE {0}.nv_serial_source_only ALTER COLUMN a DROP NOT NULL;
ALTER TABLE {0}.nv_serial_source_only
    ADD CONSTRAINT nn_a NOT NULL a NOT VALID;
"""

TARGET_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.nv_identical (a integer);
INSERT INTO {0}.nv_identical VALUES (NULL);
ALTER TABLE {0}.nv_identical ADD CONSTRAINT nn_a NOT NULL a NOT VALID;

CREATE TABLE {0}.nv_to_none (a integer);
INSERT INTO {0}.nv_to_none VALUES (NULL);

CREATE TABLE {0}.nv_to_valid (a integer);
ALTER TABLE {0}.nv_to_valid ADD CONSTRAINT nn_a NOT NULL a;

CREATE TABLE {0}.valid_to_nv (a integer);
ALTER TABLE {0}.valid_to_nv ADD CONSTRAINT nn_a NOT NULL a NOT VALID;
"""


class SchemaDiffNotValidNotNullTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff against NOT VALID NOT NULLs. """
    scenarios = [
        ('Schema diff comparison of NOT VALID NOT NULL constraints', dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()

        # NOT NULL constraints are only recorded in pg_constraint, and so
        # can only be NOT VALID, from PostgreSQL 18.
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
        if server_version < 180000:
            self.skipTest("NOT VALID NOT NULL not supported below PG 18")

        self.src_database = "db_nn_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_nn_diff_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        self.execute_sql(self.src_database, SOURCE_DDL.format(SCHEMA_NAME))
        self.execute_sql(self.tar_database, TARGET_DDL.format(SCHEMA_NAME))

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
        Pick a single compared table out of the comparison result.

        :param response_data: Result of compare()
        :param title: Table name
        :return: The compared object
        """
        for diff in response_data:
            if diff.get('type') == 'table' and diff.get('title') == title:
                return diff

        self.fail('table {0} was not compared'.format(title))

    def runTest(self):
        """ This function will test Schema Diff for NOT VALID NOT NULLs. """
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

        self.assertEqual(
            self.find_object(response_data, 'nv_identical')['status'],
            'Identical')

        # Each difference is applied to the target. A NOT VALID constraint
        # recreated as an inline or validated NOT NULL fails against the
        # NULL in the target, and one left out leaves a difference behind.
        expected = {
            'nv_source_only': ('Source Only',
                               'ADD CONSTRAINT nn_a NOT NULL a NOT VALID'),
            'nv_to_none': ('Different',
                           'ADD CONSTRAINT nn_a NOT NULL a NOT VALID'),
            'nv_to_valid': ('Different',
                            'ADD CONSTRAINT nn_a NOT NULL a NOT VALID'),
            'valid_to_nv': ('Different', 'SET NOT NULL'),
            # A SERIAL column is created NOT NULL, which has to be dropped
            # before the NOT VALID constraint can be added.
            'nv_serial_source_only': (
                'Source Only', 'ADD CONSTRAINT nn_a NOT NULL a NOT VALID'),
        }
        for title, (status, statement) in expected.items():
            compared = self.find_object(response_data, title)
            self.assertEqual(compared['status'], status, title)
            self.assertIn(statement, compared['diff_ddl'], title)
            self.execute_sql(self.tar_database, compared['diff_ddl'])

        response_data = self.compare()
        for title in expected:
            compared = self.find_object(response_data, title)
            self.assertEqual(compared['status'], 'Identical',
                             '{0}: {1}'.format(title,
                                               compared.get('diff_ddl')))

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
