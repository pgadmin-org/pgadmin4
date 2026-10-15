##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Changing only the integer type of a SERIAL column from the table dialog
(a partial update carrying 'cltype' but no 'defval') must keep the column
SERIAL: it must not queue its sequence to be dropped, which PostgreSQL
would refuse anyway whilst the column's default still references it
(#10292).
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


class TableSerialTypeChangeMsqlTestCase(BaseTestGenerator):
    """Widen a SERIAL column to bigint through the table msql endpoint."""
    url = '/browser/table/msql/'

    scenarios = [
        ('Changing only the type of a SERIAL column keeps its sequence',
         dict()),
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

        # The default table has "id serial" as its first column.
        self.table_name = "test_serial_type_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def _query(self, sql, fetch=True):
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
        data = {'columns': json.dumps(
            {'changed': [{'attnum': 1, 'cltype': 'bigint'}]})}
        response = tables_utils.api_get_msql(self, data)
        self.assertEqual(response.status_code, 200)
        sql = json.loads(response.data.decode('utf-8'))['data']

        self.assertIn('TYPE bigint', sql)
        self.assertNotIn('DROP SEQUENCE', sql)
        self.assertNotIn('DROP DEFAULT', sql)

        # The generated script must apply, and leave the column a bigint
        # that still defaults from, and owns, its sequence.
        self._query(sql, fetch=False)
        type_name, seq = self._query(
            "SELECT a.atttypid::regtype::text, "
            "pg_catalog.pg_get_serial_sequence('{0}.{1}', 'id') "
            "FROM pg_catalog.pg_attribute a "
            "WHERE a.attrelid = '{0}.{1}'::regclass "
            "AND a.attname = 'id'".format(self.schema_name, self.table_name))
        self.assertEqual(type_name, 'bigint')
        self.assertIsNotNone(seq)

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)
