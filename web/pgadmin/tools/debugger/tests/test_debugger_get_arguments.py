##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as debugger_utils
from unittest.mock import patch
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.databases.schemas.functions \
    .tests import utils as funcs_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as db_utils


class DebuggerGetArguments(BaseTestGenerator):
    """ This class will get arguments.."""

    scenarios = utils.generate_scenarios('get_arguments',
                                         debugger_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.schema_id = self.schema_data['schema_id']

        local_self = funcs_utils.set_up(self)

        self.test_data['funcowner'] = self.server["username"]

        function_info = debugger_utils.create_function(self, utils)

        self.func_id = json.loads(function_info.data)['node']['_id']

    def get_arguments(self):
        return self.tester.get(
            self.url + str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' + str(self.func_id),
            content_type='application/json')

    def runTest(self):
        """
        This function will initialize the debugger for function and procedures.
        """
        if self.is_positive_test:
            response = self.get_arguments()
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.get_arguments()
            else:
                response = self.get_arguments()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function delete the server from SQLite """
        debugger_utils.delete_function(self, utils)
        db_utils.disconnect_database(self, self.server_id, self.db_id)
