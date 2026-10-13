##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema Diff passes a changed column with all of its properties, not
just the ones that differ, so the ALTER script for it must not repeat a
column comment or identity option that is the same on both sides; a
repeated START would also RESTART the identity sequence (#10422).
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


class ColumnUnchangedCommentMsqlTestCase(BaseTestGenerator):
    """Change one property of a commented identity column, passing the
    column's full properties as Schema Diff does."""
    url = '/browser/table/msql/'

    scenarios = [
        ('An unchanged column comment is not repeated',
         dict(changes=dict(seqstart=7482970),
              expected=['RESTART SET START 7482970'],
              unexpected=['COMMENT ON COLUMN', 'SET INCREMENT',
                          'SET CACHE'])),
        ('A changed column comment is still applied',
         dict(changes=dict(description='A different comment'),
              expected=['COMMENT ON COLUMN', "'A different comment'"],
              unexpected=['ALTER TABLE'])),
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

        self.table_name = "test_ident_comment_%s" % (str(uuid.uuid4())[1:8])
        self._query(
            "CREATE TABLE {0}.{1} (id integer NOT NULL GENERATED ALWAYS "
            "AS IDENTITY (INCREMENT 1 START 0 MINVALUE 0 "
            "MAXVALUE 2147483647 CACHE 3)); "
            "COMMENT ON COLUMN {0}.{1}.id IS 'An identity column.'".format(
                self.schema_name, self.table_name))
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
        self.assertEqual(column['description'], 'An identity column.')

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

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)
