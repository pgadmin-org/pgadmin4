# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import json
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


class IndexConstraintAddTestCase(BaseTestGenerator):
    """This class will add index constraint(primary key or unique key) to
    table column"""
    primary_key_name = "test_primarykey_add_%s" % \
                       (str(uuid.uuid4())[1:6])
    primary_key_data = {"name": primary_key_name,
                        "spcname": "pg_default",
                        "columns": [{"column": "id"}]
                        }
    unique_key_name = "test_uniquekey_add_%s" % \
                      (str(uuid.uuid4())[1:6])
    unique_key_data = {"name": unique_key_name,
                       "spcname": "pg_default",
                       "columns": [{"column": "id"}]}
    scenarios = [
        ('Add primary Key constraint to table',
         dict(url='/browser/primary_key/obj/', data=primary_key_data)),
        ('Add unique Key constraint to table',
         dict(url='/browser/unique_constraint/obj/', data=unique_key_data))
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
        """This function will add index constraint(primary key or unique key)
        to table column."""
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/' + str(self.table_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')
        self.assertEquals(response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        # Disconnect the database
        database_utils.disconnect_database(cls, cls.server_id, cls.db_id)
