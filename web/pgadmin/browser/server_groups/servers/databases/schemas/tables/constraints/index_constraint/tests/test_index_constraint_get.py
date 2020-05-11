##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

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
from . import utils as index_constraint_utils


class IndexConstraintGetTestCase(BaseTestGenerator):
    """This class will fetch the index constraint(primary key or unique key) of
    table column"""
    skip_on_database = ['gpdb']
    primary_key_name = "test_primarykey_delete_%s" % \
                       (str(uuid.uuid4())[1:8])
    unique_key_name = "test_uniquekey_delete_%s" % \
                      (str(uuid.uuid4())[1:8])
    scenarios = [
        ('Fetch primary Key constraint of table',
         dict(url='/browser/primary_key/obj/', name=primary_key_name,
              type="PRIMARY KEY")),
        ('Fetch unique Key constraint of table',
         dict(url='/browser/unique_constraint/obj/', name=unique_key_name,
              type="UNIQUE"))
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a "
                            "index constraint(primary key or unique key).")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a index "
                            "constraint(primary key or unique key).")
        self.table_name = "table_indexconstraint_%s" % \
                          (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server,
                                                  self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def runTest(self):
        """This function will fetch the index constraint(primary key or
        unique key) of table column."""
        index_constraint_id = \
            index_constraint_utils.create_index_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.name, self.type)
        response = self.tester.get(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id,
                                                self.table_id,
                                                index_constraint_id),
            follow_redirects=True
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
