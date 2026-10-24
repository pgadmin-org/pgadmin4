##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Identity sequence options can legitimately be negative (a descending
identity column), so they must still be emitted in the CREATE and ALTER
SQL for a column rather than being mistaken for an unset option
(#10548).
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


class ColumnNegativeIdentityOptionsTestCase(BaseTestGenerator):
    """Generate SQL for a descending identity column."""

    scenarios = [
        ('A negative INCREMENT is altered',
         dict(changes=dict(seqincrement=-2),
              expected=['SET INCREMENT -2'],
              unexpected=['SET MINVALUE', 'SET MAXVALUE', 'RESTART'],
              sequence=dict(seqincrement=-2, seqmin=-100))),
        ('A negative MINVALUE is altered',
         dict(changes=dict(seqmin=-50),
              expected=['SET MINVALUE -50'],
              unexpected=['SET INCREMENT', 'SET MAXVALUE', 'RESTART'],
              sequence=dict(seqincrement=-1, seqmin=-50))),
        ('Negative options appear in the CREATE SQL',
         dict(changes=None,
              expected=['INCREMENT -1', 'START -1', 'MINVALUE -100',
                        'MAXVALUE -1'],
              unexpected=[],
              sequence=None)),
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

        self.table_name = "test_ident_desc_%s" % (str(uuid.uuid4())[1:8])
        self._query(
            "CREATE TABLE {0}.{1} (id integer NOT NULL GENERATED ALWAYS "
            "AS IDENTITY (INCREMENT -1 START -1 MINVALUE -100 "
            "MAXVALUE -1 CACHE 1))".format(self.schema_name,
                                           self.table_name))
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

    def _generate_sql(self):
        if self.changes is None:
            self.url = '/browser/table/sql/'
            response = tables_utils.api_get(self)
            self.assertEqual(response.status_code, 200)
            return response.data.decode('utf-8')

        self.url = '/browser/table/obj/'
        response = tables_utils.api_get(self)
        self.assertEqual(response.status_code, 200)
        column = json.loads(response.data.decode('utf-8'))['columns'][0]

        column.update(self.changes)
        data = {'columns': json.dumps({'changed': [column]})}
        self.url = '/browser/table/msql/'
        response = tables_utils.api_get_msql(self, data)
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode('utf-8'))['data']

    def runTest(self):
        sql = self._generate_sql()

        for text in self.expected:
            self.assertIn(text, sql)
        for text in self.unexpected:
            self.assertNotIn(text, sql)

        if self.sequence is None:
            return

        # The generated ALTER must actually change the identity sequence.
        self._query(sql)
        increment, minimum = self._query(
            "SELECT s.seqincrement, s.seqmin FROM pg_sequence s "
            "WHERE s.seqrelid = pg_get_serial_sequence("
            "'{0}.{1}', 'id')::regclass".format(
                self.schema_name, self.table_name), fetch=True)
        self.assertEqual(int(increment), self.sequence['seqincrement'])
        self.assertEqual(int(minimum), self.sequence['seqmin'])

    def tearDown(self):
        self._query("DROP TABLE IF EXISTS {0}.{1}".format(
            self.schema_name, self.table_name))
        database_utils.disconnect_database(self, self.server_id, self.db_id)
