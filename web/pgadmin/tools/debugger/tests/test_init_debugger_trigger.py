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

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as db_utils
from pgadmin.browser.server_groups.servers.databases.schemas.\
    tables.tests import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as trigger_funcs_utils


class InitDebugger(BaseTestGenerator):
    """ This class will Initialize the debugger """

    scenarios = utils.generate_scenarios('init_debugger_for_trigger',
                                         debugger_utils.test_cases)

    def setUp(self):
        super(InitDebugger, self).setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_id = self.schema_data['schema_id']
        self.schema_name = self.schema_data["schema_name"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to delete trigger.")

        self.table_name = "table_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.trigger_func_name = "trigger_func_delete_%s" % \
                                 str(uuid.uuid4())[1:8]
        self.trigger_function_id = \
            trigger_funcs_utils.create_trigger_function_with_trigger(
                self.server, self.db_name, self.schema_name,
                self.trigger_func_name)[0]
        self.trigger_name = "trigger_%s" % str(uuid.uuid4())[1:8]

        self.test_data['name'] = self.trigger_name
        self.test_data['tfunction'] = "{0}.{1}".format(self.schema_name,
                                                       self.trigger_func_name)
        self.trigger_id = debugger_utils.create_trigger(self, utils)

        if self.add_extension:
            debugger_utils.add_extension(self, utils, False, db_utils=db_utils)

    def initialize_debugger(self):
        if self.node_type == 'trigger':
            return self.tester.get(
                self.url + str(self.server_id) + '/' + str(self.db_id) +
                '/' + str(self.schema_id) + '/' + str(self.table_id) +
                '/' + str(self.trigger_id),
                content_type='html/json')

    def runTest(self):
        """
        This function will initialize the debugger for function and procedures.
        """
        if self.is_positive_test:
            response = self.initialize_debugger()
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.initialize_debugger()
            else:
                response = self.initialize_debugger()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function delete the server from SQLite """
        db_utils.disconnect_database(self, self.server_id, self.db_id)
