##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests\
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as trigger_funcs_utils


class InitTargetDebugger(BaseTestGenerator):
    """ This class will Initialize the debugger """

    scenarios = utils.generate_scenarios('init_debugger_target',
                                         debugger_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.debugger_error = 'The debugger plugin is not enabled. ' \
                              'Please add the plugin to the shared_preload_' \
                              'libraries setting in the postgresql.conf file' \
                              ' and restart the database server for indirect' \
                              ' debugging.'

        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.schema_id = self.schema_data['schema_id']

        local_self = funcs_utils.set_up(self)

        func_name = "test_function_%s" % str(uuid.uuid4())[1:8]
        function_info = funcs_utils.create_function(
            local_self.server, local_self.db_name, local_self.schema_name,
            func_name)

        self.func_id = function_info[0]

        if self.add_extension:
            debugger_utils.add_extension(self, utils, db_utils=db_utils)

        init_debugger = debugger_utils.init_debugger_function(self)

        self.trans_id = json.loads(init_debugger.data)['data']['trans_id']

        if hasattr(self, 'create_trigger_func') and self.create_trigger_func:
            db_con = db_utils.connect_database(self, utils.SERVER_GROUP,
                                               self.server_id, self.db_id)
            if not db_con['data']["connected"]:
                raise Exception(
                    "Could not connect to database to delete trigger.")

            self.table_name = "table_trigger_%s" % (str(uuid.uuid4())[1:8])
            self.table_id = tables_utils.create_table(self.server,
                                                      self.db_name,
                                                      self.schema_name,
                                                      self.table_name)

            self.trigger_func_name = 'test_trigger_function_%s' % str(
                uuid.uuid4())[1:8]

            self.trigger_function_id = \
                trigger_funcs_utils.create_trigger_function_with_trigger(
                    self.server, self.db_name, self.schema_name,
                    self.trigger_func_name)[0]

            self.trigger_name = "trigger_%s" % str(uuid.uuid4())[1:8]
            self.test_data['name'] = self.trigger_name
            self.test_data['tfunction'] = "{0}.{1}".format(
                self.schema_name, self.trigger_func_name)

            self.trigger_id = debugger_utils.create_trigger(self, utils)

    def initialize_traget(self):
        if hasattr(self, 'create_trigger_func') and self.create_trigger_func:
            return self.tester.post(
                self.url + str(self.trans_id) + '/' + str(self.server_id) +
                '/' + str(self.db_id) + '/' + str(self.schema_id) +
                '/' + str(self.table_id) + '/' +
                str(self.trigger_id), content_type='application/json')
        else:
            return self.tester.post(
                self.url + str(self.trans_id) + '/' + str(self.server_id) +
                '/' + str(self.db_id) + '/' + str(self.schema_id) +
                '/' + str(self.func_id),
                content_type='application/json')

    def runTest(self):
        """
        This function will initialize the debugger for function and procedures.
        """
        if self.is_positive_test:
            response = self.initialize_traget()
        else:
            if self.mocking_required:
                if hasattr(self, 'mock_multiple') and self.mock_multiple:
                    with patch(self.mock_data["function_name"],
                               side_effect=eval(
                                   self.mock_data["return_value"])):
                        response = self.initialize_traget()
                else:
                    with patch(self.mock_data["function_name"],
                               return_value=eval(
                                   self.mock_data["return_value"])):
                        response = self.initialize_traget()
            else:
                response = self.initialize_traget()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        if response.json['errormsg'] == self.debugger_error:
            self.assertEqual(actual_response_code, actual_response_code)
        else:
            self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function delete the server from SQLite """
        debugger_utils.close_debugger(self)
        debugger_utils.delete_function(self, utils)
        db_utils.disconnect_database(self, self.server_id, self.db_id)
