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
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class TableUpdateColumnTestCase(BaseTestGenerator):
    """This class will update the column node from table"""
    scenarios = [
        # Fetching default URL for table node.
        ('Add privileges for existing column',
         dict(url='/browser/table/obj/')
         )
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
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")
        self.table_name = "test_table_column_put_%s" % (str(uuid.uuid4())[1:8])

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

        data = {
            "columns": {
                "changed": [{
                    "attnum": 1,
                    "attacl": {
                        "added": [{
                            "grantee": self.server["username"],
                            "grantor": self.server["username"],
                            "privileges": [
                                {"privilege_type": "a", "privilege": True,
                                 "with_grant": True},
                                {"privilege_type": "r", "privilege": True,
                                 "with_grant": True},
                                {"privilege_type": "w", "privilege": True,
                                 "with_grant": True},
                                {"privilege_type": "x", "privilege": True,
                                 "with_grant": True
                                 }
                            ]
                        }]
                    }
                }]
            }
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
