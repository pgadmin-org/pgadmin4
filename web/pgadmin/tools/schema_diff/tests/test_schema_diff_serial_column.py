##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff tests for SERIAL/BIGSERIAL/SMALLSERIAL columns (#10236).

Two independently created databases assign different OIDs to the sequence
that a SERIAL column owns, and the column is reprojected onto the SERIAL
pseudo-type before it is compared. Neither of those may leak into the
result: a structurally identical serial column must compare as identical,
and a serial column with a genuine difference must produce SQL that
PostgreSQL will actually accept, which rules out the pseudo-type appearing
in ALTER COLUMN ... TYPE, the reprojection's emptied default being read as
a request to drop the default, and the owned sequence's parameters being
altered through the column.
"""

import json
import secrets
import uuid

from pgadmin.utils.route import BaseSocketTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

SCHEMA_NAME = 'test_serial_diff'

DDL = """
CREATE SCHEMA {0};

CREATE TABLE {0}.serial_identical (
    id bigserial NOT NULL,
    val text,
    CONSTRAINT serial_identical_pkey PRIMARY KEY (id)
);

CREATE TABLE {0}.serial_changed (
    id bigserial NOT NULL,
    val text,
    CONSTRAINT serial_changed_pkey PRIMARY KEY (id)
);

COMMENT ON COLUMN {0}.serial_changed.id IS '{1} side';
"""


class SchemaDiffSerialColumnTestCase(BaseSocketTestGenerator):
    """ This class will test Schema Diff against SERIAL columns. """
    scenarios = [
        ('Schema diff comparison of SERIAL columns', dict())
    ]
    SOCKET_NAMESPACE = '/schema_diff'

    def setUp(self):
        super().setUp()
        self.src_database = "db_serial_diff_src_%s" % str(uuid.uuid4())[1:8]
        self.tar_database = "db_serial_diff_tar_%s" % str(uuid.uuid4())[1:8]

        self.src_db_id = utils.create_database(self.server, self.src_database)
        self.tar_db_id = utils.create_database(self.server, self.tar_database)

        self.server = parent_node_dict["server"][-1]["server"]
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        self.execute_sql(self.src_database, DDL.format(SCHEMA_NAME, 'source'))
        self.execute_sql(self.tar_database, DDL.format(SCHEMA_NAME, 'target'))

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
        """ This function will test Schema Diff for SERIAL columns. """
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

        # The sequence a serial column owns is assigned a different oid in
        # each database, which says nothing about the column itself.
        identical = self.find_object(response_data, 'table',
                                     'serial_identical')
        self.assertEqual(identical['status'], 'Identical',
                         'Identical BIGSERIAL columns were reported as {0}: '
                         '{1}'.format(identical['status'],
                                      identical.get('diff_ddl')))

        # A genuine difference is still reported, but the SQL for it must
        # not carry the pseudo-type, drop the serial's default, or try to
        # alter the owned sequence through the column.
        changed = self.find_object(response_data, 'table', 'serial_changed')
        self.assertEqual(changed['status'], 'Different')

        diff_ddl = changed['diff_ddl']
        self.assertIn('COMMENT ON COLUMN', diff_ddl)
        for invalid in ('TYPE bigserial', 'DROP DEFAULT', 'SET INCREMENT'):
            self.assertNotIn(invalid, diff_ddl,
                             'Schema Diff generated invalid SQL for a '
                             'BIGSERIAL column: {0}'.format(diff_ddl))

        # Applying it must succeed, and must settle the difference.
        self.execute_sql(self.tar_database, diff_ddl)

        response_data = self.compare()
        self.assertEqual(
            self.find_object(response_data, 'table',
                             'serial_changed')['status'], 'Identical')

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
