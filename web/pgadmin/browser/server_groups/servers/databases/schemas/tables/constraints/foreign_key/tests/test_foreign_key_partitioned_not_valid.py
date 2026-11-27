##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class ForeignKeyPartitionedNotValidTestCase(BaseTestGenerator):
    """
    PostgreSQL 18 allows a NOT VALID foreign key on a partitioned table.
    The constraint is cloned onto each partition, and validating it on the
    partitioned table validates the partitions too. The partitioned table's
    own SQL is covered by the resql tests; this checks the partition's.
    """
    scenarios = [
        ('NOT VALID foreign key on a partitioned table and its partition',
         dict()),
    ]

    def setUp(self):
        super().setUp()
        if self.server_information['server_version'] < 180000:
            self.skipTest('NOT VALID foreign keys on partitioned tables '
                          'require PostgreSQL 18 or later.')

        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")

        suffix = str(uuid.uuid4())[1:8]
        self.ref_table = 'fk_ref_%s' % suffix
        self.parent_table = 'fk_parted_%s' % suffix
        self.partition = 'fk_part_%s' % suffix
        self.fk_name = 'fk_parted_not_valid_%s' % suffix

        self._execute(
            "CREATE TABLE {0}.{1} (id integer PRIMARY KEY);"
            "CREATE TABLE {0}.{2} (id integer, ref_id integer) "
            "PARTITION BY RANGE (id);"
            "CREATE TABLE {0}.{3} PARTITION OF {0}.{2} "
            "FOR VALUES FROM (0) TO (1000);".format(
                self.schema_name, self.ref_table, self.parent_table,
                self.partition))
        self.ref_table_id = self._oid(self.ref_table)
        self.parent_table_id = self._oid(self.parent_table)
        self.partition_id = self._oid(self.partition)

    def _connect(self):
        return utils.get_db_connection(self.db_name,
                                       self.server['username'],
                                       self.server['db_password'],
                                       self.server['host'],
                                       self.server['port'],
                                       self.server['sslmode'])

    def _execute(self, sql):
        connection = self._connect()
        try:
            connection.cursor().execute(sql)
            connection.commit()
        finally:
            connection.close()

    def _query(self, sql):
        connection = self._connect()
        try:
            cursor = connection.cursor()
            cursor.execute(sql)
            return cursor.fetchall()
        finally:
            connection.close()

    def _oid(self, table):
        return self._query("SELECT '{0}.{1}'::regclass::oid".format(
            self.schema_name, table))[0][0]

    def _constraint(self, table_id):
        return self._query(
            "SELECT oid, convalidated FROM pg_catalog.pg_constraint "
            "WHERE conname = '{0}' AND conrelid = {1}::oid".format(
                self.fk_name, table_id))[0]

    def _url(self, endpoint, table_id, fk_id=None):
        url = '/browser/foreign_key/{0}/{1}/{2}/{3}/{4}/{5}/'.format(
            endpoint, utils.SERVER_GROUP, self.server_id, self.db_id,
            self.schema_id, table_id)
        if fk_id is not None:
            url += '{0}'.format(fk_id)
        return url

    def _sql(self, table_id, fk_id):
        response = self.tester.get(self._url('sql', table_id, fk_id))
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))

    def runTest(self):
        data = {
            'name': self.fk_name,
            'convalidated': False,
            'columns': [{'local_column': 'ref_id',
                         'references': self.ref_table_id,
                         'referenced': 'id'}],
            'confupdtype': 'a',
            'confdeltype': 'a',
            'autoindex': False,
        }
        response = self.tester.post(
            self._url('obj', self.parent_table_id), data=json.dumps(data),
            content_type='html/json')
        self.assertEqual(response.status_code, 200)

        parent_fk_id, parent_valid = self._constraint(self.parent_table_id)
        partition_fk_id, partition_valid = \
            self._constraint(self.partition_id)
        self.assertFalse(parent_valid)
        self.assertFalse(partition_valid)

        sql = self._sql(self.partition_id, partition_fk_id)
        self.assertIn('ALTER TABLE IF EXISTS {0}.{1}'.format(
            self.schema_name, self.partition), sql)
        self.assertIn('NOT VALID', sql)

        # Validating the partitioned table validates the partition too.
        response = self.tester.get(
            self._url('validate', self.parent_table_id, parent_fk_id))
        self.assertEqual(response.status_code, 200)

        self.assertTrue(self._constraint(self.parent_table_id)[1])
        self.assertTrue(self._constraint(self.partition_id)[1])
        self.assertNotIn('NOT VALID',
                         self._sql(self.partition_id, partition_fk_id))

    def tearDown(self):
        self._execute('DROP TABLE IF EXISTS {0}.{1}, {0}.{2}'.format(
            self.schema_name, self.parent_table, self.ref_table))
        database_utils.disconnect_database(self, self.server_id, self.db_id)
