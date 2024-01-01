##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.check_constraint.tests import utils as chk_constraint_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.exclusion_constraint.tests import utils as exclusion_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.foreign_key.tests import utils as fk_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.index_constraint.tests import utils as index_constraint_utils
from . import utils as constraints_utils


class ConstraintDeleteMultipleTestCase(BaseTestGenerator):
    """This class will delete constraints under table node."""
    url = '/browser/constraints/nodes/'

    # Generates scenarios from cast_test_data.json file
    scenarios = utils.generate_scenarios("constraints_get_nodes",
                                         constraints_utils.test_cases)

    def setUp(self):
        # Load test data
        self.data = self.test_data

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        # Create table
        self.table_name = "table_constraint_delete_%s" % \
                          (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server,
                                                  self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

        # Create Check Constraints
        self.check_constraint_name = "test_constraint_delete_%s" % \
                                     (str(uuid.uuid4())[1:8])
        self.check_constraint_id = \
            chk_constraint_utils.create_check_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.check_constraint_name)

        self.check_constraint_name_1 = "test_constraint_delete1_%s" % (
            str(uuid.uuid4())[1:8])
        self.check_constraint_id_1 = \
            chk_constraint_utils.create_check_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.check_constraint_name_1)

        # Create Exclusion Constraint
        self.exclustion_constraint_name = "test_exclusion_get_%s" % (
            str(uuid.uuid4())[1:8])
        self.exclustion_constraint_id = \
            exclusion_utils.create_exclusion_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.exclustion_constraint_name
            )

        # Create Foreign Key
        self.foreign_table_name = "foreign_table_foreignkey_get_%s" % \
                                  (str(uuid.uuid4())[1:8])
        self.foreign_table_id = tables_utils.create_table(
            self.server, self.db_name, self.schema_name,
            self.foreign_table_name)
        self.foreign_key_name = "test_foreignkey_get_%s" % \
                                (str(uuid.uuid4())[1:8])
        self.foreign_key_id = fk_utils.create_foreignkey(
            self.server, self.db_name, self.schema_name, self.table_name,
            self.foreign_table_name)

        # Create Primary Key
        self.primary_key_name = "test_primary_key_get_%s" % \
                                (str(uuid.uuid4())[1:8])
        self.primary_key_id = \
            index_constraint_utils.create_index_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.primary_key_name, "PRIMARY KEY")

        # Create Unique Key constraint
        self.unique_constraint_name = "test_unique_constraint_get_%s" % (
            str(uuid.uuid4())[1:8])

        self.unique_constraint_id = \
            index_constraint_utils.create_index_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.unique_constraint_name, "UNIQUE")

    def runTest(self):
        """This function will delete constraints under table node."""
        if self.is_positive_test:
            response = constraints_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
