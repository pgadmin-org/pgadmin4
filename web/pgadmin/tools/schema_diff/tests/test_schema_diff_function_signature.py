##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for functions and procedures whose OUT arguments,
return type or input argument names differ between source and target
(#6652, #10597).

PostgreSQL identifies a function by its name and its input (IN, INOUT and
VARIADIC) argument types only, so two functions that differ solely in their
OUT arguments or return type are the same function. Schema Diff must
therefore compare them as one "Different" object, rather than as an
unrelated "Source Only" and "Target Only" pair, and because CREATE OR
REPLACE cannot change a function's return type, the generated script must
drop the target function before recreating it. Procedures, which may
have OUT arguments from PostgreSQL 14, are matched in the same way.

Likewise, CREATE OR REPLACE cannot rename an input argument, so a function
or procedure whose input argument names differ must be matched as one
"Different" object, shown under its source name, and dropped and recreated.
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

CREATE FUNCTION {0}.body_changed(iid bigint, OUT result integer)
    LANGUAGE plpgsql
    AS $$BEGIN result := 1; END;$$;

CREATE FUNCTION {0}.arg_renamed(new_id bigint, label text)
    RETURNS bigint
    LANGUAGE sql
    AS $$SELECT new_id$$;

CREATE FUNCTION {0}.inout_renamed(iid bigint, INOUT new_state text)
    LANGUAGE plpgsql
    AS $$BEGIN END;$$;

CREATE FUNCTION {0}.arg_named(iid bigint)
    RETURNS bigint
    LANGUAGE sql
    AS $$SELECT iid$$;
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

CREATE FUNCTION {0}.body_changed(iid bigint, OUT result integer)
    LANGUAGE plpgsql
    AS $$BEGIN result := 0; END;$$;

CREATE FUNCTION {0}.arg_renamed(old_id bigint, label text)
    RETURNS bigint
    LANGUAGE sql
    AS $$SELECT old_id$$;

CREATE FUNCTION {0}.inout_renamed(iid bigint, INOUT old_state text)
    LANGUAGE plpgsql
    AS $$BEGIN END;$$;

CREATE FUNCTION {0}.arg_named(bigint)
    RETURNS bigint
    LANGUAGE sql
    AS $$SELECT $1$$;
"""

# Procedures can only have OUT arguments from PostgreSQL 14.
SOURCE_PROC_DDL = """
CREATE PROCEDURE {0}.proc_out_added(iid bigint, OUT result integer)
    LANGUAGE plpgsql
    AS $$BEGIN result := 0; END;$$;

CREATE PROCEDURE {0}.proc_out_changed(iid bigint, OUT result integer)
    LANGUAGE plpgsql
    AS $$BEGIN result := 0; END;$$;

CREATE PROCEDURE {0}.proc_arg_renamed(new_id bigint)
    LANGUAGE plpgsql
    AS $$BEGIN END;$$;
"""

TARGET_PROC_DDL = """
CREATE PROCEDURE {0}.proc_out_added(iid bigint)
    LANGUAGE plpgsql
    AS $$BEGIN END;$$;

CREATE PROCEDURE {0}.proc_out_changed(iid bigint, OUT result text)
    LANGUAGE plpgsql
    AS $$BEGIN result := ''; END;$$;

CREATE PROCEDURE {0}.proc_arg_renamed(old_id bigint)
    LANGUAGE plpgsql
    AS $$BEGIN END;$$;
"""

# Objects whose difference can only be applied by dropping and recreating
# them, as (type, name, DROP statement).
RECREATED = [
    ('function', 'out_removed', 'DROP FUNCTION'),
    ('function', 'out_added', 'DROP FUNCTION'),
    ('function', 'out_changed', 'DROP FUNCTION'),
    ('function', 'rettype_changed', 'DROP FUNCTION'),
    ('function', 'arg_renamed', 'DROP FUNCTION'),
    ('function', 'inout_renamed', 'DROP FUNCTION'),
    ('function', 'arg_named', 'DROP FUNCTION'),
]

RECREATED_PROCS = [
    ('procedure', 'proc_out_added', 'DROP PROCEDURE'),
    ('procedure', 'proc_out_changed', 'DROP PROCEDURE'),
    ('procedure', 'proc_arg_renamed', 'DROP PROCEDURE'),
]

# Objects whose input argument names differ, with the title (the source's
# name and input arguments) that Schema Diff must show them under.
TITLES = {
    ('function', 'arg_renamed'): 'arg_renamed(new_id bigint, label text)',
    ('function', 'inout_renamed'):
        'inout_renamed(iid bigint, INOUT new_state text)',
    ('function', 'arg_named'): 'arg_named(iid bigint)',
    ('procedure', 'proc_arg_renamed'): 'proc_arg_renamed(IN new_id bigint)',
}

# Objects that have OUT arguments, but whose difference (the body only) can
# be applied in place with CREATE OR REPLACE.
REPLACED = [('function', 'body_changed')]


class SchemaDiffFunctionSignatureTestCase(BaseSocketTestGenerator):
    """ Test Schema Diff for function signatures and argument names. """
    scenarios = [
        ('Schema diff comparison of function OUT arguments, return type '
         'and input argument names',
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

        self.recreated = list(RECREATED)
        if self.server_information['server_version'] >= 140000:
            self.execute_sql(self.src_database,
                             SOURCE_PROC_DDL.format(SCHEMA_NAME))
            self.execute_sql(self.tar_database,
                             TARGET_PROC_DDL.format(SCHEMA_NAME))
            self.recreated += RECREATED_PROCS

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

    def find_objects(self, response_data, obj_type, name):
        """
        Pick every compared function or procedure with the given name out
        of the comparison result.

        :param response_data: Result of compare()
        :param obj_type: Object type, i.e. function or procedure
        :param name: Function name (without argument list)
        :return: List of compared objects
        """
        return [diff for diff in response_data
                if diff.get('type') == obj_type and
                diff.get('title', '').startswith(name + '(')]

    def runTest(self):
        """ Test Schema Diff for function signatures and argument names. """
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

        # Each object must be matched across source and target as a
        # single "Different" object, keyed on its input signature.
        diff_ddls = []
        for obj_type, name, drop in self.recreated:
            diff_ddl = self.get_diff_ddl(response_data, obj_type, name)
            self.assertIn(drop, diff_ddl, diff_ddl)
            self.assertIn('CREATE', diff_ddl, diff_ddl)
            self.assertLess(diff_ddl.index(drop),
                            diff_ddl.index('CREATE'), diff_ddl)
            diff_ddls.append(diff_ddl)

        # A difference that CREATE OR REPLACE can apply must not drop the
        # object, even if it has OUT arguments.
        for obj_type, name in REPLACED:
            diff_ddl = self.get_diff_ddl(response_data, obj_type, name)
            self.assertIn('CREATE OR REPLACE', diff_ddl, diff_ddl)
            self.assertNotIn('DROP', diff_ddl, diff_ddl)
            diff_ddls.append(diff_ddl)

        # The generated script must apply cleanly to the target, after
        # which every function compares as identical.
        self.execute_sql(self.tar_database, '\n'.join(diff_ddls))

        response_data = self.compare()
        for obj_type, name in [(t, n) for t, n, _ in self.recreated] + \
                REPLACED:
            diffs = self.find_objects(response_data, obj_type, name)
            self.assertEqual(
                [d['status'] for d in diffs], ['Identical'],
                '{0} {1} does not compare as identical after applying '
                'the generated script: {2}'.format(
                    obj_type, name,
                    [(d['title'], d['status'], d.get('diff_ddl'))
                     for d in diffs]))

    def get_diff_ddl(self, response_data, obj_type, name):
        """
        Check that an object was compared as a single "Different" object,
        and return the script that applies the difference to the target.

        :param response_data: Result of compare()
        :param obj_type: Object type, i.e. function or procedure
        :param name: Object name (without argument list)
        :return: Generated DDL
        """
        diffs = self.find_objects(response_data, obj_type, name)
        self.assertEqual(
            [d['status'] for d in diffs], ['Different'],
            '{0} {1} was not compared as a single Different object: '
            '{2}'.format(obj_type, name,
                         [(d['title'], d['status']) for d in diffs]))
        if (obj_type, name) in TITLES:
            self.assertEqual(diffs[0]['title'], TITLES[(obj_type, name)])
        return diffs[0]['diff_ddl']

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
