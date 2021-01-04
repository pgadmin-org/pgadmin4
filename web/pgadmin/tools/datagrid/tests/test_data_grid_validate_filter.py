##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json
import uuid
import random

from unittest.mock import patch
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from . import utils as data_grid_utils
from pgadmin.utils.exception import ExecuteError


class DatagridValidateFilterTestCase(BaseTestGenerator):
    """
    This will validate filter connection.
    """

    scenarios = utils.generate_scenarios(
        'data_grid_validate_filter',
        data_grid_utils.test_cases
    )

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.did = self.database_info["db_id"]
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.sgid = config_data['server_group']

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.sid, self.did)
        if not db_con['data']["connected"]:
            raise ExecuteError("Could not connect to database to add a table.")
        self.schema_id = parent_node_dict['schema'][-1]["schema_id"]
        self.schema_name = parent_node_dict['schema'][-1]["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise ExecuteError("Could not find the schema to add a table.")
        self.table_name = "table_for_wizard%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

    def validate_filter(self):
        response = self.tester.post(
            self.url + str(self.sid) + '/' + str(self.did) + '/' +
            str(self.table_id),
            data=json.dumps(self.test_data),
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will update query tool connection."""

        if self.is_positive_test:
            response = self.validate_filter()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                response = self.validate_filter()
                actual_response_code = response.status_code
                expected_response_code = self.expected_data['status_code']

        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect database."""
        database_utils.disconnect_database(self, self.sid,
                                           self.did)
