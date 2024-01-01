##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
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


class DebuggerDirect(BaseTestGenerator):
    """ This class will start debugger in direct mode."""

    scenarios = utils.generate_scenarios('debugger_direct',
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

        if self.add_extension:
            debugger_utils.add_extension(self, utils, db_utils=db_utils)

        init_debugger = debugger_utils.init_debugger_function(self)

        self.trans_id = json.loads(init_debugger.data)['data']['trans_id']

        if self.init_target:
            debugger_utils.initialize_target(self, utils)

    def direct(self):
        if hasattr(self, 'invalid_trans') and self.invalid_trans:
            self.trans_id = 0

        return self.tester.get(
            self.url + str(self.trans_id),
            content_type='application/json')

    def runTest(self):
        """
        This function will initialize the debugger for function and procedures.
        """
        if self.is_positive_test:
            response = self.direct()
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.direct()
            else:
                response = self.direct()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function delete the server from SQLite """
        debugger_utils.close_debugger(self)
        debugger_utils.delete_function(self, utils)
        db_utils.disconnect_database(self, self.server_id, self.db_id)
