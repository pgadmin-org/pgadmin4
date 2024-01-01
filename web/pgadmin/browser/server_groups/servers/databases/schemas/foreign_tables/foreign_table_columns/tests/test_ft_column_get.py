##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as columns_utils
from pgadmin.browser.server_groups.servers.databases.schemas.foreign_tables.\
    foreign_table_columns. tests import utils as columns_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    foreign_servers.tests import utils as fsrv_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    tests import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.schemas.foreign_tables.\
    tests import utils as ft_utils


class ColumnGetTestCase(BaseTestGenerator):
    """This class will get column under table node."""
    url = '/browser/foreign_table_column/obj/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("column_get",
                                         columns_utils.test_cases)

    def setUp(self):
        super().setUp()
        # Load test data
        self.data = self.test_data

        # Get parent schema info
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_info = parent_node_dict['schema'][-1]
        self.server_id = self.schema_info['server_id']
        self.db_id = self.schema_info['db_id']

        # Create db connection
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        # Create schema
        self.schema_name = self.schema_info['schema_name']
        self.schema_id = self.schema_info['schema_id']
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

        # Create FDW, server & table
        self.fdw_name = "fdw_%s" % (str(uuid.uuid4())[1:8])
        self.fsrv_name = "fsrv_%s" % (str(uuid.uuid4())[1:8])
        self.ft_name = "ft_%s" % (str(uuid.uuid4())[1:8])

        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_id = fsrv_utils.create_fsrv(self.server, self.db_name,
                                              self.fsrv_name, self.fdw_name)
        self.ft_id = ft_utils.create_foreign_table(self.server, self.db_name,
                                                   self.schema_name,
                                                   self.fsrv_name,
                                                   self.ft_name)

        # Create column
        self.column_name = "test_column_delete_%s" % (str(uuid.uuid4())[1:8])
        self.column_id = columns_utils.create_column(self.server,
                                                     self.db_name,
                                                     self.schema_name,
                                                     self.ft_name,
                                                     self.column_name)
        if self.is_list:
            # Create column
            self.column_name_1 = "test_column_delete_%s" % \
                                 (str(uuid.uuid4())[1:8])
            self.column_id_1 = columns_utils.create_column(self.server,
                                                           self.db_name,
                                                           self.schema_name,
                                                           self.ft_name,
                                                           self.column_name_1)

    def runTest(self):
        """This function will fetch the column under table node."""
        if self.is_positive_test:
            if self.is_list:
                response = columns_utils.api_get(self, "")
            else:
                response = columns_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    if self.is_list:
                        response = columns_utils.api_get(self, "")
                    else:
                        response = columns_utils.api_get(self)
            else:
                if 'column_id' in self.data:
                    self.column_id = self.data['column_id']
                response = columns_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
