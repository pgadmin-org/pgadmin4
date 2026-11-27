##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for foreign-key dependency ordering.

When Schema Diff generates a script for new tables where a child table
references a parent table via a foreign key (for example a_child -> z_parent,
where alphabetical order puts the child first), the generated script must
order the parent table before the child table.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_fk_order_diff'

SOURCE_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.z_parent (
    id integer PRIMARY KEY
);

CREATE TABLE {0}.a_child (
    id integer PRIMARY KEY,
    parent_id integer NOT NULL,
    CONSTRAINT a_child_parent_fk FOREIGN KEY (parent_id)
        REFERENCES {0}.z_parent (id)
);

CREATE TABLE {0}.b_grandchild (
    child_id integer NOT NULL,
    CONSTRAINT b_grandchild_child_fk FOREIGN KEY (child_id)
        REFERENCES {0}.a_child (id)
);

CREATE TABLE {0}.s_self (
    id integer PRIMARY KEY,
    parent_id integer,
    CONSTRAINT s_self_parent_fk FOREIGN KEY (parent_id)
        REFERENCES {0}.s_self (id)
);
""".format(SCHEMA_NAME)

TARGET_DDL = """
CREATE SCHEMA {0};
""".format(SCHEMA_NAME)


class SchemaDiffForeignKeyOrderTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff dependency ordering for tables
    linked by foreign keys. """
    scenarios = [
        ('Schema diff orders tables by foreign key dependencies', dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_fk_order_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_fk_order_tar_%s" % str(uuid.uuid4())[1:8]

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

    @staticmethod
    def generate_full_script(response_data):
        """
        Build the script Schema Diff's "Generate Script" produces for every
        differing object, following computeDependLevels() and
        generateFinalScript() in static/js/components/SchemaDiffCompare.jsx.

        :param response_data: Result of compare()
        :return: The script, wrapped in a single transaction
        """
        rows = [diff for diff in response_data
                if diff.get('status') != 'Identical']
        by_oid = {diff['oid']: idx for idx, diff in enumerate(rows)
                  if diff.get('status') != 'Target Only' and
                  diff.get('oid') is not None}
        dependents = {}
        for idx, diff in enumerate(rows):
            for dep in diff.get('dependencies') or []:
                if dep.get('oid') in by_oid:
                    dependents.setdefault(by_oid[dep['oid']], []).append(idx)

        levels = {}

        def level_of(idx, resolving=frozenset()):
            if idx in levels:
                return levels[idx]
            if idx in resolving:
                return 1
            level = 1
            for dependent in dependents.get(idx, []):
                level = max(level,
                            level_of(dependent, resolving | {idx}) + 1)
            levels[idx] = level
            return level

        buckets = {}
        for idx, diff in enumerate(rows):
            buckets.setdefault(level_of(idx), []).append(diff['diff_ddl'])

        return 'BEGIN;\n' + ''.join(
            '\n'.join(buckets[level]) + '\n\n'
            for level in sorted(buckets, reverse=True)) + 'END;'

    def runTest(self):
        """ This function will test Schema Diff ordering for foreign keys. """
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

        z_parent = self.find_object(response_data, 'table', 'z_parent')
        a_child = self.find_object(response_data, 'table', 'a_child')
        b_grandchild = self.find_object(
            response_data, 'table', 'b_grandchild')
        s_self = self.find_object(response_data, 'table', 's_self')

        self.assertIn(
            {'type': 'table',
             'name': '{0}.z_parent'.format(SCHEMA_NAME),
             'oid': z_parent['oid']},
            a_child['dependencies'])
        self.assertIn(
            {'type': 'table',
             'name': '{0}.a_child'.format(SCHEMA_NAME),
             'oid': a_child['oid']},
            b_grandchild['dependencies'])
        self.assertFalse(any(
            dep.get('oid') == s_self['oid']
            for dep in s_self['dependencies']))

        # Force the worst-case order (children before parent) to verify that
        # dependency levels alone put z_parent -> a_child -> b_grandchild.
        ordered_response = [a_child, b_grandchild, s_self, z_parent]
        script = self.generate_full_script(ordered_response)

        self.assertLess(
            script.index('CREATE TABLE IF NOT EXISTS {0}.z_parent'.format(
                SCHEMA_NAME)),
            script.index('CREATE TABLE IF NOT EXISTS {0}.a_child'.format(
                SCHEMA_NAME)))
        self.assertLess(
            script.index('CREATE TABLE IF NOT EXISTS {0}.a_child'.format(
                SCHEMA_NAME)),
            script.index('CREATE TABLE IF NOT EXISTS {0}.b_grandchild'.format(
                SCHEMA_NAME)))

        self.execute_sql(self.tar_database, script)

        response_data = self.compare()
        for title in ('z_parent', 'a_child', 'b_grandchild', 's_self'):
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
