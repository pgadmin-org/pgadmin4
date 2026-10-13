##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for foreign keys whose referenced table has a dropped
column in only one of the databases (#10446).

pg_constraint.confkey holds the attribute numbers of the referenced
columns, and a dropped column leaves a gap in those numbers, so the same
foreign key can carry a different confkey in each database. The referenced
columns are compared by name, so the raw numbers must not make an
otherwise identical table compare as different.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_fk_confkey_diff'

DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.parent_tbl (
    id integer NOT NULL,
    legacy integer,
    code text NOT NULL,
    alt_id integer NOT NULL,
    CONSTRAINT parent_tbl_pkey PRIMARY KEY (id, code),
    CONSTRAINT parent_tbl_alt_key UNIQUE (alt_id, code)
);

{1}

CREATE TABLE {0}.child_identical (
    parent_id integer NOT NULL,
    parent_code text NOT NULL,
    CONSTRAINT child_identical_fk FOREIGN KEY (parent_id, parent_code)
        REFERENCES {0}.parent_tbl (id, code)
);

CREATE TABLE {0}.child_changed (
    parent_id integer NOT NULL,
    parent_code text NOT NULL,
    CONSTRAINT child_changed_fk FOREIGN KEY (parent_id, parent_code)
        REFERENCES {0}.parent_tbl (id, code) ON DELETE {2}
);

CREATE TABLE {0}.child_refcols (
    parent_id integer NOT NULL,
    parent_code text NOT NULL,
    CONSTRAINT child_refcols_fk FOREIGN KEY (parent_id, parent_code)
        REFERENCES {0}.parent_tbl ({3}, code)
);
"""

# Only the source drops the column, leaving 'code' as attribute 3 there
# whilst the target recreates the table without it (attribute 2).
SOURCE_DDL = DDL.format(
    SCHEMA_NAME,
    'ALTER TABLE {0}.parent_tbl DROP COLUMN legacy;'.format(SCHEMA_NAME),
    'CASCADE', 'alt_id')
TARGET_DDL = DDL.replace('    legacy integer,\n', '').format(
    SCHEMA_NAME, '', 'NO ACTION', 'id')


class SchemaDiffForeignKeyConfkeyTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff against foreign keys whose
    referenced columns have different attribute numbers. """
    scenarios = [
        ('Schema diff comparison of foreign keys with differing confkey',
         dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_fk_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_fk_diff_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        self.execute_sql(self.src_database, SOURCE_DDL)
        self.execute_sql(self.tar_database, TARGET_DDL)

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
        """ This function will test Schema Diff for foreign keys. """
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

        for title in ('parent_tbl', 'child_identical'):
            identical = self.find_object(response_data, 'table', title)
            self.assertEqual(identical['status'], 'Identical',
                             '{0} was reported as {1}: {2}'.format(
                                 title, identical['status'],
                                 identical.get('diff_ddl')))

        # A genuine difference in the foreign key is still reported.
        changed = self.find_object(response_data, 'table', 'child_changed')
        self.assertEqual(changed['status'], 'Different')
        self.assertIn('ON DELETE CASCADE', changed['diff_ddl'])

        # Applying it must succeed, and must settle the difference.
        self.execute_sql(self.tar_database, changed['diff_ddl'])

        # A foreign key that references different columns cannot be
        # altered, so it must be dropped and recreated.
        refcols = self.find_object(response_data, 'table', 'child_refcols')
        self.assertEqual(refcols['status'], 'Different')
        self.assertIn('DROP CONSTRAINT', refcols['diff_ddl'])
        self.assertIn('(alt_id, code)', refcols['diff_ddl'])
        self.execute_sql(self.tar_database, refcols['diff_ddl'])

        response_data = self.compare()
        for title in ('child_changed', 'child_refcols'):
            self.assertEqual(
                self.find_object(response_data, 'table', title)['status'],
                'Identical', title)

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
