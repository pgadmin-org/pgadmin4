##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
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
from pgadmin.utils import server_utils as server_utils


class ColumnPutTestCase(BaseTestGenerator):
    """This class will update the column under table node."""
    scenarios = [
        ('Edit column Node URL', dict(url='/browser/column/obj/',
                                      col_data_type='char')),
        ('Edit column with Identity', dict(url='/browser/column/obj/',
                                           col_data_type='bigint',
                                           server_min_version=100000,
                                           identity_opt={
                                               'attidentity': 'a',
                                               'seqincrement': 1,
                                               'seqstart': 1,
                                               'seqmin': 1,
                                               'seqmax': 10,
                                               'seqcache': 1,
                                               'seqcycle': True
                                           })),
        ('Edit column with Identity', dict(url='/browser/column/obj/',
                                           server_min_version=100000,
                                           col_data_type='bigint',
                                           identity_opt={
                                               'attidentity': 'd',
                                               'seqincrement': 2,
                                               'seqstart': 2,
                                               'seqmin': 2,
                                               'seqmax': 2000,
                                               'seqcache': 1,
                                               'seqcycle': True
                                           }))
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
                message = "Identity columns are not supported by " \
                          "PPAS/PG 10.0 and below."
                self.skipTest(message)

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
        self.column_name = "test_column_put_%s" % (str(uuid.uuid4())[1:8])
        self.column_id = columns_utils.create_column(self.server,
                                                     self.db_name,
                                                     self.schema_name,
                                                     self.table_name,
                                                     self.column_name,
                                                     self.col_data_type)

    def runTest(self):
        """This function will update the column under table node."""
        col_response = columns_utils.verify_column(self.server, self.db_name,
                                                   self.column_name)
        if not col_response:
            raise Exception("Could not find the column to update.")
        data = {
            "attnum": self.column_id,
            "name": self.column_name,
            "attnotnull": True,
            "description": "This is test comment for column"
        }
        if hasattr(self, 'identity_opt'):
            data.update(self.identity_opt)
        response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.table_id) + '/' +
            str(self.column_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
