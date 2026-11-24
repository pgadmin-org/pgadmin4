##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for a table whose parent only exists in the source
database (#10657).

Generating the SQL for a table that inherits from a parent it does not
inherit from in the target looks up the parent's columns and CHECK
constraints in the target database. A parent that only exists in the
source must not make that lookup fail, which would abort the whole
comparison.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_inherits_diff'

SOURCE_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.src_only_parent (
    id integer,
    name text
);

CREATE TABLE {0}.child_tbl (
    own_col text
) INHERITS ({0}.src_only_parent);
""".format(SCHEMA_NAME)

TARGET_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.child_tbl (
    id integer,
    name text,
    own_col text
);
""".format(SCHEMA_NAME)


class SchemaDiffInheritsTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff against a table whose parent only
    exists in the source database. """
    scenarios = [
        ('Schema diff comparison of a table with a source only parent',
         dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_inh_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_inh_diff_tar_%s" % str(uuid.uuid4())[1:8]

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
        """ This function will test Schema Diff for inherited tables. """
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

        # The parent only exists in the source, so the comparison must not
        # fail when it looks it up in the target.
        response_data = self.compare()

        parent = self.find_object(response_data, 'table', 'src_only_parent')
        self.assertEqual(parent['status'], 'Source Only')

        child = self.find_object(response_data, 'table', 'child_tbl')
        self.assertEqual(child['status'], 'Different')
        self.assertIn('INHERIT {0}.src_only_parent;'.format(SCHEMA_NAME),
                      child['diff_ddl'])

        # Once the parent is created, the table's SQL applies.
        self.execute_sql(self.tar_database, parent['diff_ddl'])
        self.execute_sql(self.tar_database, child['diff_ddl'])

        connection = utils.get_db_connection(self.tar_database,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        try:
            pg_cursor = connection.cursor()
            pg_cursor.execute(
                "SELECT inhparent::regclass::text FROM pg_catalog.pg_inherits "
                "WHERE inhrelid = '{0}.child_tbl'::regclass".format(
                    SCHEMA_NAME))
            self.assertEqual(pg_cursor.fetchall(),
                             [('{0}.src_only_parent'.format(SCHEMA_NAME),)])
        finally:
            connection.close()

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
