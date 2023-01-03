##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
from . import utils as exclusion_utils


class ExclusionConstraintDeleteTestCase(BaseTestGenerator):
    """This class will delete the existing exclusion constraint of table."""
    url = '/browser/exclusion_constraint/obj/'
    # Generates scenarios from cast_test_data.json file
    scenarios = utils.generate_scenarios("exclusion_constraint_delete",
                                         exclusion_utils.test_cases)

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
        self.table_name = "table_exclusion_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

        # Create constraint to delete
        self.exclusion_constraint_name = \
            "test_exclusion_delete_%s" % (str(uuid.uuid4())[1:8])
        self.exclusion_constraint_id = exclusion_utils.\
            create_exclusion_constraint(self.server, self.db_name,
                                        self.schema_name, self.table_name,
                                        self.exclusion_constraint_name)

        # Cross check constraint creation
        cross_check_res = exclusion_utils.verify_exclusion_constraint(
            self.server, self.db_name, self.exclusion_constraint_name)
        if not cross_check_res:
            raise Exception("Could not find the exclusion constraint "
                            "to delete.")

        # In case of multiple constraints
        if self.is_list:
            # Create constraint to delete
            self.exclusion_constraint_name_2 = \
                "test_exclconstraint_get_list_%s" % (str(uuid.uuid4())[1:8])
            self.exclusion_constraint_id_2 = \
                exclusion_utils.create_exclusion_constraint(
                    self.server, self.db_name, self.schema_name,
                    self.table_name,
                    self.exclusion_constraint_name_2)

            # constraint list to delete
            self.data['ids'] = [self.exclusion_constraint_id,
                                self.exclusion_constraint_id_2]

    def runTest(self):
        """This function will delete exclusion constraint."""
        if self.is_positive_test:

            if self.is_list:
                response = exclusion_utils.api_delete(self, '')
            else:
                response = exclusion_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            cross_chk_res = exclusion_utils.verify_exclusion_constraint(
                self.server,
                self.db_name,
                self.exclusion_constraint_name)
            self.assertIsNone(cross_chk_res,
                              "Deleted exclusion constraint still present")
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = exclusion_utils.api_delete(self)
            elif 'exclusion_constraint_id' in self.data:
                self.exclusion_constraint_id = \
                    self.data["exclusion_constraint_id"]
                response = exclusion_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
