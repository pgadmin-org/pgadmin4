##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

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


class TriggersGetTestCase(BaseTestGenerator):
    """This class will fetch trigger under table node."""
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('get_trigger',
                                         triggers_utils.test_cases)

    def setUp(self):
        super(TriggersGetTestCase, self).setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get a trigger.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to get a trigger.")
        self.table_name = "table_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.func_name = "trigger_func_get_%s" % str(uuid.uuid4())[1:8]
        self.function_info = \
            trigger_funcs_utils.create_trigger_function_with_trigger(
                self.server, self.db_name, self.schema_name, self.func_name)
        self.trigger_name = "test_trigger_get_%s" % (str(uuid.uuid4())[1:8])
        self.trigger_id = triggers_utils.create_trigger(self.server,
                                                        self.db_name,
                                                        self.schema_name,
                                                        self.table_name,
                                                        self.trigger_name,
                                                        self.func_name)

    def get_trigger(self):
        return self.tester.get(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id, self.table_id,
                                                self.trigger_id),
            follow_redirects=True
        )

    def runTest(self):
        """This function will fetch trigger under table node."""

        if self.is_positive_test:
            if hasattr(self, "incorrect_trigger_id"):
                self.trigger_id = 9999
            if hasattr(self, "pass_argument"):
                url = "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url,
                                                          utils.SERVER_GROUP,
                                                          self.server_id,
                                                          self.db_id,
                                                          self.schema_id,
                                                          self.table_id,
                                                          self.trigger_id)
                url = \
                    url + \
                    "?oid=17312&description=commaa&name=code&_=1589522392579"
                response = self.tester.get(url, follow_redirects=True)

                self.assertEqual(response.status_code,
                                 self.expected_data["status_code"])
            if hasattr(self, "table_nodes"):
                self.trigger_id = ''
                response = self.get_trigger()
            else:
                response = self.get_trigger()

        else:
            if hasattr(self, "dummy_dict"):
                if hasattr(self, "table_nodes"):
                    self.trigger_id = ''
                self.mock_data['return_value'] = [(True, self.dummy_dict), (
                    False, self.expected_data["message"])]
                with patch(self.mock_data["function_name"],
                           side_effect=self.mock_data["return_value"]):
                    response = self.get_trigger()
            elif hasattr(self, "table_nodes"):
                self.trigger_id = ''
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.get_trigger()
            else:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.get_trigger()

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
