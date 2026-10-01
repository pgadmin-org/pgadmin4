##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for function/procedure body whitespace (#10302).

Schema Diff's own reverse-engineered CREATE OR REPLACE wraps a function or
procedure body in a leading and trailing newline around $BODY$...$BODY$ so
that it reads nicely in the SQL panel. That cosmetic reformatting must not
leak into the SQL that Schema Diff actually applies to the target: doing so
changes the stored prosrc (PostgreSQL keeps the body exactly as written
between the dollar quotes), so the target would forever compare as
different from the source by nothing but pgAdmin's own added whitespace,
even though "Ignore whitespace" is unticked.

This covers both ways a body ends up applied through Schema Diff: creating
an object that only exists in the source ("Source Only"), and replacing one
that exists in both but with a different body ("Different").
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_func_body_diff'

# proc_added/func_added exist only in the source (Source Only status).
# proc_changed/func_changed exist in both, with a different body
# (Different status), so applying the diff is a CREATE OR REPLACE.
SOURCE_DDL = """
CREATE SCHEMA {0};

CREATE PROCEDURE {0}.proc_added(arg1 bigint)
    LANGUAGE sql
    AS $$select 1;$$;

CREATE FUNCTION {0}.func_added(arg1 bigint)
    RETURNS bigint
    LANGUAGE sql
    AS $$select arg1;$$;

CREATE PROCEDURE {0}.proc_changed(arg1 bigint)
    LANGUAGE sql
    AS $$select 1;$$;

CREATE FUNCTION {0}.func_changed(arg1 bigint)
    RETURNS bigint
    LANGUAGE sql
    AS $$select arg1;$$;
"""

TARGET_DDL = """
CREATE SCHEMA {0};

CREATE PROCEDURE {0}.proc_changed(arg1 bigint)
    LANGUAGE sql
    AS $$select 2;$$;

CREATE FUNCTION {0}.func_changed(arg1 bigint)
    RETURNS bigint
    LANGUAGE sql
    AS $$select arg1 + 1;$$;
"""


class SchemaDiffFunctionBodyTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff for function/procedure bodies. """
    scenarios = [
        ('Schema diff comparison of function/procedure bodies', dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_func_body_diff_src_%s" % str(
            uuid.uuid4())[1:8]
        self.tar_database = "db_func_body_diff_tar_%s" % str(
            uuid.uuid4())[1:8]

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

    def find_object(self, response_data, node_type, title_prefix):
        """
        Pick a single compared object out of the comparison result.

        :param response_data: Result of compare()
        :param node_type: Node type, e.g. 'procedure'
        :param title_prefix: Object name (without argument list)
        :return: The compared object
        """
        for diff in response_data:
            if diff.get('type') == node_type and \
                    diff.get('title', '').startswith(title_prefix + '('):
                return diff

        self.fail('{0} {1} was not compared'.format(node_type, title_prefix))

    def assert_no_injected_whitespace(self, diff_ddl):
        """
        The applied SQL must reproduce the body exactly as stored: no
        leading/trailing newline injected around $BODY$ purely for
        readability in the SQL panel (#10302).
        """
        self.assertNotIn('$BODY$\n', diff_ddl,
                         'Schema Diff injected a leading newline into the '
                         'function/procedure body: {0}'.format(diff_ddl))
        self.assertNotIn('\n$BODY$;', diff_ddl,
                         'Schema Diff injected a trailing newline into the '
                         'function/procedure body: {0}'.format(diff_ddl))

    def runTest(self):
        """ Test Schema Diff for function/procedure body whitespace. """
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

        cases = [
            ('procedure', 'proc_added', 'Source Only'),
            ('function', 'func_added', 'Source Only'),
            ('procedure', 'proc_changed', 'Different'),
            ('function', 'func_changed', 'Different'),
        ]

        diff_ddls = {}
        for node_type, name, expected_status in cases:
            diff = self.find_object(response_data, node_type, name)
            self.assertEqual(diff['status'], expected_status,
                             '{0} {1} was reported as {2}, expected {3}'
                             .format(node_type, name, diff['status'],
                                     expected_status))
            self.assert_no_injected_whitespace(diff['diff_ddl'])
            diff_ddls[name] = diff['diff_ddl']

        # Apply every generated script to the target, then re-compare: all
        # four objects must now settle as identical, without needing
        # "Ignore whitespace" ticked.
        for name in diff_ddls:
            self.execute_sql(self.tar_database, diff_ddls[name])

        response_data = self.compare()
        for node_type, name, _ in cases:
            diff = self.find_object(response_data, node_type, name)
            self.assertEqual(diff['status'], 'Identical',
                             '{0} {1} still compares as {2} after applying '
                             'the generated script: {3}'
                             .format(node_type, name, diff['status'],
                                     diff.get('diff_ddl')))

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
