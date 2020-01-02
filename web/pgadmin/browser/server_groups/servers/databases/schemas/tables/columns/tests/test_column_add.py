##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
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
from pgadmin.utils import server_utils as server_utils


class ColumnAddTestCase(BaseTestGenerator):
    """This class will add new column under table node."""
    scenarios = [
        ('Add column', dict(
            url='/browser/column/obj/',
            data={
                'cltype': "\"char\"",
                'attacl': [],
                'is_primary_key': False,
                'attnotnull': False,
                'attlen': None,
                'attprecision': None,
                'attoptions':[],
                'seclabels':[],
            })),
        ('Add Identity column with Always', dict(
            url='/browser/column/obj/',
            server_min_version=100000,
            skip_msg='Identity column are not supported by EPAS/PG 10.0 '
                     'and below.',
            data={
                'cltype': 'bigint',
                'attacl': [],
                'is_primary_key': False,
                'attnotnull': True,
                'attlen': None,
                'attprecision': None,
                'attoptions': [],
                'seclabels': [],
                'colconstype': 'i',
                'attidentity': 'a',
                'seqincrement': 1,
                'seqstart': 1,
                'seqmin': 1,
                'seqmax': 10,
                'seqcache': 1,
                'seqcycle': True
            })),
        ('Add Identity column with As Default', dict(
            url='/browser/column/obj/',
            col_data_type='bigint',
            server_min_version=100000,
            skip_msg='Identity column are not supported by EPAS/PG 10.0 '
                     'and below.',
            data={
                'cltype': 'bigint',
                'attacl': [],
                'is_primary_key': False,
                'attnotnull': True,
                'attlen': None,
                'attprecision': None,
                'attoptions': [],
                'seclabels': [],
                'colconstype': 'i',
                'attidentity': 'd',
                'seqincrement': 2,
                'seqstart': 2,
                'seqmin': 2,
                'seqmax': 2000,
                'seqcache': 1,
                'seqcycle': True
            })),
        ('Add Generated column', dict(
            url='/browser/column/obj/',
            col_data_type='bigint',
            server_min_version=120000,
            skip_msg='Generated column are not supported by EPAS/PG 12.0 '
                     'and below.',
            data={
                'cltype': 'bigint',
                'attacl': [],
                'is_primary_key': False,
                'attnotnull': True,
                'attlen': None,
                'attprecision': None,
                'attoptions': [],
                'seclabels': [],
                'colconstype': 'g',
                'genexpr': '100 * 100'
            })),
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]

        if hasattr(self, 'server_min_version'):
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "a table.")
            if server_con["data"]["version"] < self.server_min_version:
                self.skipTest(self.skip_msg)

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
        self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def runTest(self):
        """This function will add column under table node."""
        self.column_name = "test_column_add_%s" % (str(uuid.uuid4())[1:8])
        self.data.update({
            'name': self.column_name
        })

        # Add table
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/' + str(self.table_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
