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

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as columns_utils


class ColumnGetInheritedTestCase(BaseTestGenerator):
    """
    Fetch the properties of the columns of a table that inherits from one
    or more parent tables, and check that the inherited columns report the
    parent they come from whilst the child's own column does not. Where a
    column is merged from several parents, the first parent in inheritance
    order must be reported. Issues #10534 and #10554.
    """
    url = '/browser/column/obj/'

    scenarios = [
        ('Get details: For columns of a table inheriting from a parent',
         dict(parent_count=1)),
        ('Get details: For columns merged from two parents',
         dict(parent_count=2))
    ]

    def setUp(self):
        super().setUp()
        self.data = {}

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

        # Parent tables, each with the columns id, name and location. There
        # are no column defaults, as the parents' defaults would conflict.
        # They are created in reverse so that the first parent in
        # inheritance order has the highest OID, rather than happening to
        # sort first by OID as well.
        self.parent_names = ["table_column_parent_%s" %
                             (str(uuid.uuid4())[1:8])
                             for _ in range(self.parent_count)]
        self.parent_ids = {}
        for parent_name in reversed(self.parent_names):
            self.parent_ids[parent_name] = tables_utils.create_table(
                self.server, self.db_name, self.schema_name, parent_name,
                '"CREATE TABLE %s.%s (id int NOT NULL, name text, '
                'location text)" % (schema_name, table_name)')
        self.parent_name = self.parent_names[0]
        self.parent_id = self.parent_ids[self.parent_name]

        # Child table inheriting from the parents, plus a column of its own
        self.table_name = "table_column_child_%s" % (str(uuid.uuid4())[1:8])
        parents = ', '.join('%s.%s' % (self.schema_name, parent_name)
                            for parent_name in self.parent_names)
        self.table_id = tables_utils.create_table(
            self.server, self.db_name, self.schema_name, self.table_name,
            '"CREATE TABLE %s.%s (child_col int) INHERITS ({0})" % '
            '(schema_name, table_name)'.format(parents)
        )

    def runTest(self):
        """
        Fetch the columns of the child table, both as a collection and
        individually, and check where each one is inherited from.
        """
        expected_parent = '{0}.{1}'.format(self.schema_name,
                                           self.parent_name)

        def assert_inheritance(col):
            if col['name'] == 'child_col':
                self.assertIsNone(col['inheritedfrom'])
                self.assertIsNone(col['inheritedid'])
            else:
                self.assertEqual(expected_parent, col['inheritedfrom'])
                self.assertEqual(self.parent_id, col['inheritedid'])

        response = columns_utils.api_get(self, "")
        self.assertEqual(200, response.status_code)
        columns = json.loads(response.data.decode('utf-8'))
        self.assertEqual(['id', 'name', 'location', 'child_col'],
                         [col['name'] for col in columns])

        for col in columns:
            assert_inheritance(col)

            response = columns_utils.api_get(self, col['attnum'])
            self.assertEqual(200, response.status_code)
            assert_inheritance(json.loads(response.data.decode('utf-8')))

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id, self.db_id)
