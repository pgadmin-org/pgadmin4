##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for functions whose OUT arguments or return type
differ between source and target (#6652).

PostgreSQL identifies a function by its name and its input (IN, INOUT and
VARIADIC) argument types only, so two functions that differ solely in their
OUT arguments or return type are the same function. Schema Diff must
therefore compare them as one "Different" object, rather than as an
unrelated "Source Only" and "Target Only" pair, and because CREATE OR
REPLACE cannot change a function's return type, the generated script must
drop the target function before recreating it.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_func_sig_diff'

# Each function has the same input signature in source and target, but a
# different set of OUT arguments and/or a different return type.
SOURCE_DDL = """
CREATE SCHEMA {0};

CREATE FUNCTION {0}.out_removed(iid bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $$BEGIN END;$$;

CREATE FUNCTION {0}.out_added(iid bigint, OUT result integer)
    LANGUAGE plpgsql
    AS $$BEGIN result := 0; END;$$;

CREATE FUNCTION {0}.out_changed(iid bigint, INOUT state text,
                                OUT result integer, OUT descerr text)
    LANGUAGE plpgsql
    AS $$BEGIN result := 0; END;$$;

CREATE FUNCTION {0}.rettype_changed(a bigint, b bigint)
    RETURNS bigint
    LANGUAGE sql
    AS $$SELECT a + b$$;
"""

TARGET_DDL = """
CREATE SCHEMA {0};

CREATE FUNCTION {0}.out_removed(iid bigint, OUT result integer)
    LANGUAGE plpgsql
    AS $$BEGIN result := 0; END;$$;

CREATE FUNCTION {0}.out_added(iid bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $$BEGIN END;$$;

CREATE FUNCTION {0}.out_changed(iid bigint, INOUT state text,
                                OUT result integer)
    LANGUAGE plpgsql
    AS $$BEGIN result := 0; END;$$;

CREATE FUNCTION {0}.rettype_changed(a bigint, b bigint)
    RETURNS double precision
    LANGUAGE sql
    AS $$SELECT a + b$$;
"""

FUNCTIONS = ['out_removed', 'out_added', 'out_changed', 'rettype_changed']


class SchemaDiffFunctionSignatureTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff for function OUT arguments. """
    scenarios = [
        ('Schema diff comparison of function OUT arguments and return type',
         dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_func_sig_diff_src_%s" % str(
            uuid.uuid4())[1:8]
        self.tar_database = "db_func_sig_diff_tar_%s" % str(
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

    def find_objects(self, response_data, name):
        """
        Pick every compared function with the given name out of the
        comparison result.

        :param response_data: Result of compare()
        :param name: Function name (without argument list)
        :return: List of compared objects
        """
        return [diff for diff in response_data
                if diff.get('type') == 'function' and
                diff.get('title', '').startswith(name + '(')]

    def runTest(self):
        """ Test Schema Diff for function OUT arguments/return type. """
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

        # Each function must be matched across source and target as a
        # single "Different" object, keyed on its input signature.
        diff_ddls = []
        for name in FUNCTIONS:
            diffs = self.find_objects(response_data, name)
            self.assertEqual(
                [d['status'] for d in diffs], ['Different'],
                'function {0} was not compared as a single Different '
                'object: {1}'.format(
                    name, [(d['title'], d['status']) for d in diffs]))
            diff_ddl = diffs[0]['diff_ddl']
            self.assertIn('DROP FUNCTION', diff_ddl, diff_ddl)
            self.assertIn('CREATE', diff_ddl, diff_ddl)
            self.assertLess(diff_ddl.index('DROP FUNCTION'),
                            diff_ddl.index('CREATE'), diff_ddl)
            diff_ddls.append(diff_ddl)

        # The generated script must apply cleanly to the target, after
        # which every function compares as identical.
        self.execute_sql(self.tar_database, '\n'.join(diff_ddls))

        response_data = self.compare()
        for name in FUNCTIONS:
            diffs = self.find_objects(response_data, name)
            self.assertEqual(
                [d['status'] for d in diffs], ['Identical'],
                'function {0} does not compare as identical after applying '
                'the generated script: {1}'.format(
                    name, [(d['title'], d['status'], d.get('diff_ddl'))
                           for d in diffs]))

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
