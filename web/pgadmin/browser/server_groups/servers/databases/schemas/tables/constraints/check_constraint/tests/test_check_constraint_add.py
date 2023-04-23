##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
from unittest.mock import patch
from . import utils as check_constraint_utils


class CheckConstraintAddTestCase(BaseTestGenerator):
    """This class will add check constraint to existing table"""
    url = '/browser/check_constraint/obj/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("check_constraint_create",
                                         check_constraint_utils.test_cases)

    def setUp(self):
        super().setUp()
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
            raise Exception("Could not connect to database to add a check "
                            "constraint.")
        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a check "
                            "constraint.")

        # Create table
        self.table_name = "table_checkconstraint_add_%s" % \
                          (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server,
                                                  self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def runTest(self):
        """This function will add check constraint to table."""
        if "name" in self.data:
            check_constraint_name = \
                self.data["name"] + (str(uuid.uuid4())[1:8])
            self.data["name"] = check_constraint_name

        if self.is_positive_test:
            response = check_constraint_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            cross_check_res = check_constraint_utils. \
                verify_check_constraint(self.server, self.db_name,
                                        self.data["name"])
            self.assertIsNotNone(cross_check_res, "Could not find the newly"
                                                  " created check constraint.")
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = check_constraint_utils.api_create(self)
                    # Assert response
                    utils.assert_status_code(self, response)
                    utils.assert_error_message(self, response)
            else:
                if 'table_id' in self.data:
                    self.table_id = self.data['table_id']
                response = check_constraint_utils.api_create(self)
                # Assert response
                utils.assert_status_code(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
