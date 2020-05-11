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
from . import utils as index_constraint_utils


class IndexConstraintAddTestCase(BaseTestGenerator):
    """This class will add index constraint(primary key or unique key) to
    table column"""
    skip_on_database = ['gpdb']
    primary_key_name = "test_primarykey_add_%s" % \
                       (str(uuid.uuid4())[1:8])
    primary_key_data = {"name": primary_key_name,
                        "spcname": "pg_default",
                        "columns": [{"column": "id"}]
                        }
    unique_key_name = "test_uniquekey_add_%s" % \
                      (str(uuid.uuid4())[1:8])
    unique_key_data = {"name": unique_key_name,
                       "spcname": "pg_default",
                       "columns": [{"column": "id"}]}
    scenarios = [
        ('Add primary Key constraint to table',
         dict(url='/browser/primary_key/obj/', data=primary_key_data)),
        ('Add unique Key constraint to table',
         dict(url='/browser/unique_constraint/obj/', data=unique_key_data))
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
        """This function will add index constraint(primary key or unique key)
        to table column."""
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


class ConstraintsUsingIndexAddTestCase(BaseTestGenerator):
    """This class will add the constraint(primary key or unique key) to the
    table column using newly created index"""
    skip_on_database = ['gpdb']

    primary_key_name = "test_primarykey_add_%s" % (str(uuid.uuid4())[1:8])
    primary_index_name = "test_primaryindex_add_%s" % (str(uuid.uuid4())[1:8])
    primary_key_data = {
        "name": primary_key_name,
        "spcname": "pg_default",
        "columns": [],
        "index": primary_index_name
    }

    unique_key_name = "test_uniquekey_add_%s" % (str(uuid.uuid4())[1:8])
    unique_index_name = "test_uniqueindex_add_%s" % (str(uuid.uuid4())[1:8])
    unique_key_data = {
        "name": unique_key_name,
        "spcname": "pg_default",
        "columns": [],
        "index": unique_index_name
    }

    scenarios = [
        ('Add primary Key constraint to table using index',
         dict(url='/browser/primary_key/obj/', data=primary_key_data)),
        ('Add unique Key constraint to table using index',
         dict(url='/browser/unique_constraint/obj/', data=unique_key_data))
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
                            "constraint using index.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a index "
                            "constraint(primary key or unique key).")
        self.table_name = "table_constraint_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def runTest(self):
        """This function will add index constraint(primary key or unique key)
        to table column."""
        self.index_id = \
            index_constraint_utils.create_unique_index(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.data["index"], "name")

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
