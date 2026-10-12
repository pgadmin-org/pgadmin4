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
    Fetch the properties of the columns of a table that inherits from a
    parent table, and check that the inherited columns report the parent
    they come from whilst the child's own column does not. Issue #10534.
    """
    url = '/browser/column/obj/'

    scenarios = [
        ('Get details: For columns of a table inheriting from a parent',
         dict())
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

        # Parent table, with the default columns: id, name, location
        self.parent_name = "table_column_parent_%s" % \
                           (str(uuid.uuid4())[1:8])
        self.parent_id = tables_utils.create_table(self.server, self.db_name,
                                                   self.schema_name,
                                                   self.parent_name)

        # Child table inheriting from the parent, plus one column of its own
        self.table_name = "table_column_child_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(
            self.server, self.db_name, self.schema_name, self.table_name,
            '"CREATE TABLE %s.%s (child_col int) INHERITS (%s.{0})" % '
            '(schema_name, table_name, schema_name)'.format(self.parent_name)
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
