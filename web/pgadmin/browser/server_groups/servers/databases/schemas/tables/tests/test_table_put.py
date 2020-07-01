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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class TableUpdateTestCase(BaseTestGenerator):
    """This class will add new collation under schema node."""
    scenarios = [
        # Fetching default URL for table node.
        ('Update Table', dict(url='/browser/table/obj/')),
        ('Create partitions of existing range partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='range',
              mode='create'
              )
         ),
        ('Create partitions with partition table of existing range '
         'partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='range',
              mode='multilevel'
              )
         ),
        ('Create partitions of existing list partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='list',
              mode='create'
              )
         ),
        ('Create partitions with partition table of existing list '
         'partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='list',
              mode='multilevel'
              )
         ),
        ('Detach partition from existing range partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='range',
              mode='detach'
              )
         ),
        ('Detach partition from existing list partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='list',
              mode='detach'
              )
         ),
        ('Attach partition to existing range partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='range',
              mode='attach'
              )
         ),
        ('Attach partition to existing list partitioned table',
         dict(url='/browser/table/obj/',
              server_min_version=100000,
              partition_type='list',
              mode='attach'
              )
         )
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]

        if hasattr(self, 'server_min_version'):
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "partitioned table.")
            if server_con["data"]["version"] < self.server_min_version:
                message = "Partitioned table are not supported by " \
                          "PPAS/PG 10.0 and below."
                self.skipTest(message)

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        self.table_name = "test_table_put_%s" % (str(uuid.uuid4())[1:8])
        self.is_partition = False

        if hasattr(self, 'server_min_version'):
            self.is_partition = True
            self.table_id = tables_utils.create_table_for_partition(
                self.server,
                self.db_name,
                self.schema_name,
                self.table_name,
                'partitioned',
                self.partition_type)
        else:
            self.table_id = tables_utils.create_table(
                self.server, self.db_name,
                self.schema_name,
                self.table_name)

    def runTest(self):
        """This function will fetch added table under schema node."""
        table_response = tables_utils.verify_table(self.server, self.db_name,
                                                   self.table_id)
        if not table_response:
            raise Exception("Could not find the table to update.")

        if self.is_partition:
            data = {"id": self.table_id}
            tables_utils.set_partition_data(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.partition_type, data, self.mode)
        else:
            data = {
                "description": "This is test comment for table",
                "id": self.table_id
            }

        response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' + str(self.table_id),
            data=json.dumps(data), follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
