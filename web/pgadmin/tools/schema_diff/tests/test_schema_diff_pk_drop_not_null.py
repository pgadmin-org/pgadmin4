##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for dropping a primary key column's NOT NULL (#10891).

PostgreSQL refuses to drop the NOT NULL of a column that is in a primary
key, so when the target's primary key is dropped or moved and the column
is nullable in the source, the SQL that Schema Diff generates has to drop
the NOT NULL after the primary key. Applying it has to leave the two
tables identical.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_pk_drop_nn_diff'

# Each table is named after the change Schema Diff has to make to the
# target.
SOURCE_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.pk_dropped (a integer);

CREATE TABLE {0}.pk_moved (a integer, b integer,
    CONSTRAINT pk_moved_pkey PRIMARY KEY (b));

CREATE TABLE {0}.pk_narrowed (a integer, b integer,
    CONSTRAINT pk_narrowed_pkey PRIMARY KEY (a));

CREATE TABLE {0}.pk_kept (a integer PRIMARY KEY, b integer);
"""

TARGET_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.pk_dropped (a integer PRIMARY KEY);

CREATE TABLE {0}.pk_moved (a integer, b integer,
    CONSTRAINT pk_moved_pkey PRIMARY KEY (a));

CREATE TABLE {0}.pk_narrowed (a integer, b integer,
    CONSTRAINT pk_narrowed_pkey PRIMARY KEY (a, b));

CREATE TABLE {0}.pk_kept (a integer PRIMARY KEY, b integer NOT NULL);
"""


class SchemaDiffPrimaryKeyDropNotNullTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff on primary key NOT NULLs. """
    scenarios = [
        ('Schema diff dropping the NOT NULL of a primary key column',
         dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()

        self.src_database = "db_pk_nn_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_pk_nn_diff_tar_%s" % str(uuid.uuid4())[1:8]

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
        """ This function will test Schema Diff on primary key NOT NULLs. """
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

        # Each difference is applied to the target, which fails if a
        # column's NOT NULL is dropped whilst it is still in the primary
        # key, and leaves a difference behind if anything is left out.
        expected = {
            'pk_dropped': 'ALTER COLUMN a DROP NOT NULL',
            'pk_moved': 'ALTER COLUMN a DROP NOT NULL',
            'pk_narrowed': 'ALTER COLUMN b DROP NOT NULL',
            # The column is not in the primary key, so its NOT NULL is
            # dropped along with the other column changes, as before.
            'pk_kept': 'ALTER COLUMN b DROP NOT NULL',
        }
        for title, statement in expected.items():
            compared = self.find_object(response_data, title)
            self.assertEqual(compared['status'], 'Different', title)
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
