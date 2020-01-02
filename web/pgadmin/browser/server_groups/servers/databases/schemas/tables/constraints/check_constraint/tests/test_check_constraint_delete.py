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
from . import utils as chk_constraint_utils


class CheckConstraintDeleteTestCase(BaseTestGenerator):
    """This class will delete check constraint to existing table"""
    skip_on_database = ['gpdb']
    scenarios = [
        ('Delete check constraint to table',
         dict(url='/browser/check_constraint/obj/'))
    ]

    def setUp(self):
        super(CheckConstraintDeleteTestCase, self).setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to delete a check "
                            "constraint.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to delete a check "
                            "constraint.")
        self.table_name = "table_checkconstraint_delete_%s" % \
                          (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server,
                                                  self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.check_constraint_name = "test_checkconstraint_delete_%s" % \
                                     (str(uuid.uuid4())[1:8])
        self.check_constraint_id = \
            chk_constraint_utils.create_check_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.check_constraint_name)

    def runTest(self):
        """This function will delete check constraint to table."""
        chk_constraint = chk_constraint_utils.verify_check_constraint(
            self.server, self.db_name, self.check_constraint_name)
        if not chk_constraint:
            raise Exception("Could not find the check constraint to delete.")
        response = self.tester.delete(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id,
                                                self.table_id,
                                                self.check_constraint_id),
            follow_redirects=True
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
