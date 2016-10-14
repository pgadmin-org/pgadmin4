# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from . import utils as index_constraint_utils


class IndexConstraintDeleteTestCase(BaseTestGenerator):
    """This class will delete index constraint(primary key or unique key) of
    table column"""
    primary_key_name = "test_primarykey_delete_%s" % \
                       (str(uuid.uuid4())[1:6])
    unique_key_name = "test_uniquekey_delete_%s" % \
                      (str(uuid.uuid4())[1:6])
    scenarios = [
        ('Delete primary Key constraint of table',
         dict(url='/browser/primary_key/obj/', name=primary_key_name,
              type="PRIMARY KEY")),
        ('Delete unique Key constraint of table',
         dict(url='/browser/unique_constraint/obj/', name=unique_key_name,
              type="UNIQUE"))
    ]

    @classmethod
    def setUpClass(cls):
        cls.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        cls.server_id = schema_info["server_id"]
        cls.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(cls, utils.SERVER_GROUP,
                                                 cls.server_id, cls.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a "
                            "index constraint(primary key or unique key).")
        cls.schema_id = schema_info["schema_id"]
        cls.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(cls.server,
                                                      cls.db_name,
                                                      cls.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a index "
                            "constraint(primary key or unique key).")
        cls.table_name = "table_indexconstraint_%s" % \
                         (str(uuid.uuid4())[1:6])
        cls.table_id = tables_utils.create_table(cls.server,
                                                 cls.db_name,
                                                 cls.schema_name,
                                                 cls.table_name)

    def runTest(self):
        """This function will delete index constraint(primary key or
        unique key) of table column."""
        index_constraint_id = \
            index_constraint_utils.create_index_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.name, self.type)
        response = self.tester.delete(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id,
                                                self.table_id,
                                                index_constraint_id),
            follow_redirects=True
        )
        self.assertEquals(response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        # Disconnect the database
        database_utils.disconnect_database(cls, cls.server_id, cls.db_id)
