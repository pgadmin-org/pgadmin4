##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as check_constraint_utils


class CheckConstraintGetNodesTestCase(BaseTestGenerator):
    """This class will fetch nodes check constraint of table."""
    skip_on_database = ['gpdb']
    url = '/browser/check_constraint/nodes/'

    # Generates scenarios from cast_test_data.json file
    scenarios = utils.generate_scenarios("check_constraint_get_nodes",
                                         check_constraint_utils.test_cases)

    def setUp(self):
        super(CheckConstraintGetNodesTestCase, self).setUp()
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
            raise Exception("Could not connect to database to fetch a check "
                            "constraint.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to fetch a check "
                            "constraint.")

        # Create table
        self.table_name = "table_checkconstraint_get_%s" % \
                          (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server,
                                                  self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

        # Create constraint
        if 'query' in self.inventory_data:
            query = self.inventory_data['query']
        else:
            query = None
        self.check_constraint_name = "test_checkconstraint_get_%s" % \
                                     (str(uuid.uuid4())[1:8])
        self.check_constraint_id = \
            check_constraint_utils.create_check_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.check_constraint_name, query)

    def runTest(self):
        """This function will fetch nodes check constraint of table."""
        if self.is_positive_test:
            if self.is_list:
                response = check_constraint_utils.api_get(self, '')
            else:
                response = check_constraint_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = check_constraint_utils.api_get(self)
            elif 'check_constraint_id' in self.data:
                # Non-existing constraint id
                self.check_constraint_id = self.data["check_constraint_id"]
                response = check_constraint_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
