##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
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


class CheckConstraintGetMsqlTestCase(BaseTestGenerator):
    """This class will fetch modified sql for check constraint of table. """
    url = '/browser/check_constraint/msql/'

    # Generates scenarios from cast_test_data.json file
    scenarios = utils.generate_scenarios("check_constraint_msql",
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

        # Create constraint to modify
        self.check_constraint_name = "test_checkconstraint_get_%s" % \
                                     (str(uuid.uuid4())[1:8])
        self.check_constraint_id = \
            check_constraint_utils.create_check_constraint(
                self.server, self.db_name, self.schema_name, self.table_name,
                self.check_constraint_name)

        # In case of multiple constraints
        if self.is_list:
            self.check_constraint_name = "test_checkconstraint_get_list_%s" % \
                                         (str(uuid.uuid4())[1:8])
            self.check_constraint_id = \
                check_constraint_utils.create_check_constraint(
                    self.server, self.db_name, self.schema_name,
                    self.table_name,
                    self.check_constraint_name)

    def runTest(self):
        """This function will fetch modified sql for check constraint to
        table. """
        if self.is_positive_test:
            url_encode_data = {"oid": self.check_constraint_id,
                               "comment": self.data['comment']}

            if 'convalidated' in self.data:
                url_encode_data["convalidated"] = self.data['convalidated']

            response = check_constraint_utils.api_get_msql(self,
                                                           url_encode_data)

            # Assert response
            utils.assert_status_code(self, response)
            self.assertIn(self.data['comment'], response.json['data'])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
