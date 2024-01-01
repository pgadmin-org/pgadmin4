##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as trigger_funcs_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as triggers_utils
import sys


class TriggersAddTestCase(BaseTestGenerator):
    """This class will add new trigger under table node."""
    scenarios = utils.generate_scenarios('add_trigger',
                                         triggers_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a trigger.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a trigger.")
        self.table_name = "table_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.func_name = "trigger_func_add_%s" % str(uuid.uuid4())[1:8]
        self.function_info = \
            trigger_funcs_utils.create_trigger_function_with_trigger(
                self.server, self.db_name, self.schema_name, self.func_name)

    def create_trigger(self):
        return self.tester.post(
            "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                             self.server_id, self.db_id,
                                             self.schema_id, self.table_id),
            data=json.dumps(self.test_data),
            content_type='html/json'
        )

    def runTest(self):
        """This function will trigger under table node."""
        trigger_name = "test_trigger_add_%s" % (str(uuid.uuid4())[1:8])
        self.test_data['name'] = trigger_name
        self.test_data['tfunction'] = "{0}.{1}".format(self.schema_name,
                                                       self.func_name)

        if self.is_positive_test:
            response = self.create_trigger()
        else:
            if hasattr(self, 'wrong_table_id'):
                del self.test_data["name"]
                response = self.create_trigger()
            elif hasattr(self, 'internal_server_error'):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.create_trigger()
            elif hasattr(self, 'error_creating_rule'):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.create_trigger()
            else:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.create_trigger()
        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
