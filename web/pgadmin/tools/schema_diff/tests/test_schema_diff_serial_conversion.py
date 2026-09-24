##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for converting a column between a plain integer type
and SERIAL/BIGSERIAL/SMALLSERIAL (#10292).

Schema Diff already detects that such a column differs, but the generated
script used to stop halfway: converting a plain column to SERIAL changed
the column's type and (separately) created the owned sequence, without
ever setting the column's DEFAULT to nextval(...), so the column never
actually became usable as a SERIAL. Converting a SERIAL column back to
plain needs its DROP DEFAULT and the sequence's DROP SEQUENCE issued in
that order, since PostgreSQL refuses to drop a sequence that a column's
default still references.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_serial_conversion'

SRC_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.int_to_serial (
    id bigserial NOT NULL,
    val text
);

CREATE TABLE {0}.serial_to_int (
    id integer NOT NULL,
    val text
);

CREATE TABLE {0}.int_to_smallserial (
    id smallserial NOT NULL,
    val text
);
"""

TAR_DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.int_to_serial (
    id integer NOT NULL,
    val text
);

CREATE TABLE {0}.serial_to_int (
    id bigserial NOT NULL,
    val text
);

CREATE TABLE {0}.int_to_smallserial (
    id smallint NOT NULL,
    val text
);
"""

# Rows the target's plain column already holds before it becomes SERIAL.
TAR_ROWS = """
INSERT INTO {0}.int_to_serial (id, val) VALUES (1, 'a'), (5, 'b');
INSERT INTO {0}.int_to_smallserial (id, val) VALUES (0, 'a');
"""

# Fails the batch unless the converted column's new sequence carries on
# past the values it already held, rather than starting again at 1.
CHECK_INT_TO_SERIAL_NEXT_ID = """
DO $$
DECLARE
    new_id bigint;
BEGIN
    INSERT INTO {0}.int_to_serial (val) VALUES ('x') RETURNING id INTO new_id;
    IF new_id <> 6 THEN
        RAISE EXCEPTION 'expected the next id to be 6, got %', new_id;
    END IF;
END
$$;
"""

# Fails the batch unless the SMALLSERIAL column, which held nothing past
# its sequence's START (only a 0, below MINVALUE 1), still starts at 1.
CHECK_INT_TO_SMALLSERIAL_NEXT_ID = """
DO $$
DECLARE
    new_id smallint;
BEGIN
    INSERT INTO {0}.int_to_smallserial (val) VALUES ('x')
        RETURNING id INTO new_id;
    IF new_id <> 1 THEN
        RAISE EXCEPTION 'expected the next id to be 1, got %', new_id;
    END IF;
END
$$;
"""

# Fails the batch unless the sequence a SMALLSERIAL conversion created has
# the same smallint type PostgreSQL itself gives a SMALLSERIAL's sequence,
# rather than the bigint a bare CREATE SEQUENCE defaults to.
CHECK_SMALLSERIAL_SEQ_TYPE = """
DO $$
BEGIN
    IF (SELECT s.seqtypid::regtype::text
          FROM pg_catalog.pg_sequence s
         WHERE s.seqrelid = pg_catalog.pg_get_serial_sequence(
                   '{0}.int_to_smallserial', 'id')::regclass)
       IS DISTINCT FROM 'smallint' THEN
        RAISE EXCEPTION 'SMALLSERIAL sequence is not smallint';
    END IF;
END
$$;
"""


class SchemaDiffSerialConversionTestCase(BaseSocketTestGenerator):
    """ This class tests converting a column between plain integer and
    SERIAL in both directions. """
    scenarios = [
        ('Schema diff comparison converting between integer and SERIAL',
         dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_serial_conv_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_serial_conv_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        self.execute_sql(self.src_database, SRC_DDL.format(SCHEMA_NAME))
        self.execute_sql(self.tar_database, TAR_DDL.format(SCHEMA_NAME))
        self.execute_sql(self.tar_database, TAR_ROWS.format(SCHEMA_NAME))

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
        generateFinalScript() in static/js/components/SchemaDiffCompare.jsx:
        anything another object depends on is written first, and objects
        on the same level keep the comparison's own order.

        :param response_data: Result of compare()
        :return: The script, wrapped in a single transaction
        """
        rows = [diff for diff in response_data
                if diff.get('status') != 'Identical']
        by_oid = {diff['oid']: idx for idx, diff in enumerate(rows)
                  if diff.get('oid') is not None}
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
        """ This function will test converting a column between integer
        and SERIAL, in both directions. """
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

        # Forward: target's plain integer column must become BIGSERIAL,
        # which means the ALTER script must also create the owned
        # sequence and set the column's DEFAULT to nextval() against it.
        int_to_serial = self.find_object(response_data, 'table',
                                         'int_to_serial')
        self.assertEqual(int_to_serial['status'], 'Different')
        fwd_ddl = int_to_serial['diff_ddl']
        self.assertIn('TYPE bigint', fwd_ddl)
        self.assertIn('CREATE SEQUENCE', fwd_ddl)
        self.assertIn('SET DEFAULT nextval(', fwd_ddl)
        # The sequence must be created before the column can default to
        # nextval() against it.
        self.assertLess(fwd_ddl.index('CREATE SEQUENCE'),
                        fwd_ddl.index('SET DEFAULT nextval('))

        # The same for SMALLSERIAL, whose sequence must be smallint.
        int_to_smallserial = self.find_object(response_data, 'table',
                                              'int_to_smallserial')
        self.assertEqual(int_to_smallserial['status'], 'Different')
        small_ddl = int_to_smallserial['diff_ddl']
        self.assertIn('AS smallint', small_ddl)
        self.assertIn('SET DEFAULT nextval(', small_ddl)

        # Reverse: target's BIGSERIAL column must become plain integer,
        # which means the ALTER script must drop the column's DEFAULT
        # before it drops the now-unused sequence (PostgreSQL refuses to
        # drop a sequence a column's default still references).
        serial_to_int = self.find_object(response_data, 'table',
                                         'serial_to_int')
        self.assertEqual(serial_to_int['status'], 'Different')
        rev_ddl = serial_to_int['diff_ddl']
        self.assertIn('DROP DEFAULT', rev_ddl)
        self.assertIn('DROP SEQUENCE', rev_ddl)
        self.assertLess(rev_ddl.index('DROP DEFAULT'),
                        rev_ddl.index('DROP SEQUENCE'))

        # Applying the whole script, which also carries the owned
        # sequences' own Source Only / Target Only rows, must succeed in a
        # single transaction and settle every difference, so the column
        # diffs' CREATE/DROP SEQUENCE must not collide with those rows.
        self.execute_sql(self.tar_database,
                         self.generate_full_script(response_data))
        self.execute_sql(self.tar_database,
                         CHECK_SMALLSERIAL_SEQ_TYPE.format(SCHEMA_NAME))

        response_data = self.compare()
        for node_type, title in (
                ('table', 'int_to_serial'), ('table', 'serial_to_int'),
                ('table', 'int_to_smallserial'),
                ('sequence', 'int_to_serial_id_seq'),
                ('sequence', 'int_to_smallserial_id_seq')):
            self.assertEqual(
                self.find_object(response_data, node_type, title)['status'],
                'Identical')
        self.assertFalse(any(
            diff.get('title') == 'serial_to_int_id_seq'
            for diff in response_data))

        # The forward conversion must have made the column a genuine
        # SERIAL: an insert omitting it must now succeed, and must not
        # reuse a value the column already held.
        self.execute_sql(self.tar_database,
                         CHECK_INT_TO_SERIAL_NEXT_ID.format(SCHEMA_NAME))
        self.execute_sql(self.tar_database,
                         CHECK_INT_TO_SMALLSERIAL_NEXT_ID.format(SCHEMA_NAME))

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
