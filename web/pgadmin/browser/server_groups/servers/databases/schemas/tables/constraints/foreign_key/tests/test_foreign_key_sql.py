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
from . import utils as fk_utils


class ForeignKeyGetSqlTestCase(BaseTestGenerator):
    """This class will fetch foreign key sql from existing table"""
    url = '/browser/foreign_key/sql/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("foreign_key_sql",
                                         fk_utils.test_cases)

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
            raise Exception(
                "Could not connect to database to fetch a foreign "
                "key constraint.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to fetch a foreign "
                            "key constraint.")

        # Create local table
        self.local_table_name = "local_table_foreignkey_get_%s" % \
                                (str(uuid.uuid4())[1:8])
        self.local_table_id = tables_utils.create_table(
            self.server, self.db_name, self.schema_name, self.local_table_name)

        # Create foreign table
        self.foreign_table_name = "foreign_table_foreignkey_get_%s" % \
                                  (str(uuid.uuid4())[1:8])
        self.foreign_table_id = tables_utils.create_table(
            self.server, self.db_name, self.schema_name,
            self.foreign_table_name)

        # Create foreign key
        self.foreign_key_name = "test_foreignkey_get_%s" % \
                                (str(uuid.uuid4())[1:8])
        self.foreign_key_id = fk_utils.create_foreignkey(
            self.server, self.db_name, self.schema_name, self.local_table_name,
            self.foreign_table_name)

    def runTest(self):
        """This function will delete foreign key sql attached to table
        column. """
        if self.is_positive_test:
            response = fk_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = fk_utils.api_get(self)
            elif 'foreign_key_id' in self.data:
                self.foreign_key_id = self.data["foreign_key_id"]
                response = fk_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
