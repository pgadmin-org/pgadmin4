##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Changing an identity column's START must not RESTART its sequence
and rewind it below rows already generated. RESTART is only emitted
when the sequence is still at its old START with nothing generated
since, or when its position would fall outside a new MINVALUE/MAXVALUE,
which PostgreSQL refuses without it (#10550).
"""

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class ColumnIdentityStartRestartTestCase(BaseTestGenerator):
    """Change the START of an identity column and apply the script."""

    scenarios = [
        ('A used sequence keeps its position when START changes',
         dict(rows=3, changes=dict(seqstart=50),
              expected=['SET START 50'], unexpected=['RESTART'],
              last_value=3)),
        ('An unused sequence restarts at the new START',
         dict(rows=0, changes=dict(seqstart=50),
              expected=['RESTART SET START 50'], unexpected=[],
              last_value=None, next_value=50)),
        ('A used sequence restarts when it falls below a new MINVALUE',
         dict(rows=3, changes=dict(seqstart=50, seqmin=50),
              expected=['RESTART SET START 50', 'SET MINVALUE 50'],
              unexpected=[], last_value=None, next_value=50)),
        ('A used sequence within a new MINVALUE keeps its position',
         dict(rows=3, changes=dict(seqstart=2, seqmin=2),
              expected=['SET START 2', 'SET MINVALUE 2'],
              unexpected=['RESTART'], last_value=3)),
        ('A sequence already restarted elsewhere keeps its position',
         dict(rows=3, restart_with=100, changes=dict(seqstart=2),
              expected=['SET START 2'], unexpected=['RESTART'],
              last_value=None, next_value=100)),
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        if not schema_utils.verify_schemas(self.server, self.db_name,
                                           self.schema_name):
            raise Exception("Could not find the schema to add a table.")

        self.table_name = "test_ident_start_%s" % (str(uuid.uuid4())[1:8])
        self._query(
            "CREATE TABLE {0}.{1} (id integer NOT NULL GENERATED ALWAYS "
            "AS IDENTITY (INCREMENT 1 START 1 MINVALUE 1 "
            "MAXVALUE 2147483647 CACHE 1))".format(self.schema_name,
                                                   self.table_name))
        for _ in range(self.rows):
            self._query("INSERT INTO {0}.{1} DEFAULT VALUES".format(
                self.schema_name, self.table_name))
        if getattr(self, 'restart_with', None) is not None:
            self._query(
                "ALTER TABLE {0}.{1} ALTER COLUMN id RESTART WITH {2}".format(
                    self.schema_name, self.table_name, self.restart_with))
        self.table_id = self._query(
            "SELECT '{0}.{1}'::regclass::oid".format(
                self.schema_name, self.table_name), fetch=True)[0]

    def _query(self, sql, fetch=False):
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        try:
            pg_cursor = connection.cursor()
            pg_cursor.execute(sql)
            result = pg_cursor.fetchone() if fetch else None
            connection.commit()
            return result
        finally:
            connection.close()

    def runTest(self):
        self.url = '/browser/table/obj/'
        response = tables_utils.api_get(self)
        self.assertEqual(response.status_code, 200)
        column = json.loads(response.data.decode('utf-8'))['columns'][0]

        column.update(self.changes)
        data = {'columns': json.dumps({'changed': [column]})}
        self.url = '/browser/table/msql/'
        response = tables_utils.api_get_msql(self, data)
        self.assertEqual(response.status_code, 200)
        sql = json.loads(response.data.decode('utf-8'))['data']

        for text in self.expected:
            self.assertIn(text, sql)
        for text in self.unexpected:
            self.assertNotIn(text, sql)

        self._query(sql)
        start, last_value = self._query(
            "SELECT s.seqstart, pg_sequence_last_value(s.seqrelid) "
            "FROM pg_sequence s WHERE s.seqrelid = "
            "pg_get_serial_sequence('{0}.{1}', 'id')::regclass".format(
                self.schema_name, self.table_name), fetch=True)
        self.assertEqual(int(start), self.changes['seqstart'])
        self.assertEqual(
            None if last_value is None else int(last_value),
            self.last_value)

        if getattr(self, 'next_value', None) is not None:
            next_value = self._query(
                "INSERT INTO {0}.{1} DEFAULT VALUES RETURNING id".format(
                    self.schema_name, self.table_name), fetch=True)[0]
            self.assertEqual(int(next_value), self.next_value)

    def tearDown(self):
        self._query("DROP TABLE IF EXISTS {0}.{1}".format(
            self.schema_name, self.table_name))
        database_utils.disconnect_database(self, self.server_id, self.db_id)
