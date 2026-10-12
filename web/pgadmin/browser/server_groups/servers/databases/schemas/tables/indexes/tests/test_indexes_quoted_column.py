##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for index columns whose names require quoting (#6481).

pg_get_indexdef() returns such a name quoted, so comparing it against
pg_attribute.attname classified the column as an expression and the
Properties panel showed nothing at all. The SQL now compares against
quote_ident(attname), and the name is unquoted properly on the way out
rather than by stripping quote characters, which mangled any name
containing a literal double quote.
"""

import uuid

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as indexes_utils


class IndexesQuotedColumnTestCase(BaseTestGenerator):
    """An index on a column needing quotes must report that column."""

    url = "/browser/index/obj/"

    scenarios = [
        ('Mixed case column name', dict(
            column_name='Mixed Case',
        )),
        ('Column name containing a double quote', dict(
            column_name='col"x',
        )),
        ('Column name that is a reserved word', dict(
            column_name='select',
        )),
    ]

    def setUp(self):
        super().setUp()
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
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        self.table_name = "table_quoted_col_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

        # The helpers interpolate names into SQL as given, so quote the
        # column exactly as the server would.
        quoted_column = '"%s"' % self.column_name.replace('"', '""')
        self._add_column(quoted_column)

        self.index_name = "test_index_quoted_%s" % (str(uuid.uuid4())[1:8])
        self.index_id = indexes_utils.create_index(
            self.server, self.db_name, self.schema_name, self.table_name,
            self.index_name, quoted_column)

    def _add_column(self, quoted_column):
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute('ALTER TABLE %s.%s ADD COLUMN %s text' % (
            self.schema_name, self.table_name, quoted_column))
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        connection.close()

    def runTest(self):
        response = indexes_utils.api_get_index(self, self.index_id)
        self.assertEqual(response.status_code, 200)

        data = response.json
        self.assertEqual(len(data['columns']), 1)
        column = data['columns'][0]

        # The name must come back exactly as the user typed it, and must not
        # be mistaken for an expression.
        self.assertEqual(column['colname'], self.column_name)
        self.assertFalse(column['is_exp'])

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)
