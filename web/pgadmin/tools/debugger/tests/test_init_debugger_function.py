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
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as debugger_utils
from unittest.mock import patch
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.databases.schemas.functions \
    .tests import utils as funcs_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as db_utils


class InitDebugger(BaseTestGenerator):
    """ This class will Initialize the debugger """

    scenarios = utils.generate_scenarios('init_debugger_for_function',
                                         debugger_utils.test_cases)

    def setUp(self):
        super(InitDebugger, self).setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.schema_id = self.schema_data['schema_id']

        local_self = funcs_utils.set_up(self)

        if self.invalid_name:
            db_user = self.server["username"]
            self.test_data = {"acl": [
                {
                    "grantee": db_user,
                    "grantor": db_user,
                    "privileges":
                        [
                            {
                                "privilege_type": "X",
                                "privilege": True,
                                "with_grant": True
                            }
                        ]
                }
            ], "arguments": [], "funcowner": db_user, "lanname": "sql",
                "name": "test_function_:_%s" % str(uuid.uuid4())[1:8],
                "options": [], "proleakproof": True, "pronamespace": 2200,
                "prorettypename": "integer", "prosecdef": True,
                "prosrc": "SELECT 1;", "probin": "$libdir/",
                "provolatile": "s", "seclabels": [], "variables": [{
                    "name": "search_path",
                    "value": "public, pg_temp"
                }]
            }

            function_info = debugger_utils.create_function(self, utils)
            self.func_id = json.loads(function_info.data)['node']['_id']
        else:
            func_name = "test_function_%s" % str(uuid.uuid4())[1:8]
            function_info = funcs_utils.create_function(
                local_self.server, local_self.db_name, local_self.schema_name,
                func_name)

            self.func_id = function_info[0]

        if self.add_extension:
            debugger_utils.add_extension(self, utils, db_utils=db_utils)

    def initialize_debugger(self):
        if self.node_type == 'function':
            return self.tester.get(
                self.url + str(self.server_id) + '/' + str(self.db_id) +
                '/' + str(self.schema_id) + '/' + str(self.func_id),
                content_type='application/json')

    def runTest(self):
        """
        This function will initialize the debugger for function and procedures.
        """
        if self.is_positive_test:
            response = self.initialize_debugger()
        else:
            if self.mocking_required:
                if hasattr(self,
                           'mock_multiple_calls') and self.mock_multiple_calls:
                    with patch(self.mock_data["function_name"],
                               side_effect=eval(
                                   self.mock_data["return_value"])):
                        response = self.initialize_debugger()
                else:
                    with patch(self.mock_data["function_name"],
                               return_value=eval(
                                   self.mock_data["return_value"])):
                        response = self.initialize_debugger()
            else:
                response = self.initialize_debugger()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function delete the server from SQLite """
        debugger_utils.delete_function(self, utils)
        db_utils.disconnect_database(self, self.server_id, self.db_id)
