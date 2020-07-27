##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
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


class TriggersUpdateTestCase(BaseTestGenerator):
    """This class will update trigger under table node."""
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('update_trigger',
                                         triggers_utils.test_cases)

    def setUp(self):
        super(TriggersUpdateTestCase, self).setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception(
                "Could not connect to database to update a trigger.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update a trigger.")
        self.table_name = "table_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.func_name = "trigger_func_add_%s" % str(uuid.uuid4())[1:8]
        self.function_info = \
            trigger_funcs_utils.create_trigger_function_with_trigger(
                self.server, self.db_name, self.schema_name, self.func_name)
        self.trigger_name = "test_trigger_update_%s" % (str(uuid.uuid4())[1:8])
        self.trigger_id = triggers_utils.create_trigger(self.server,
                                                        self.db_name,
                                                        self.schema_name,
                                                        self.table_name,
                                                        self.trigger_name,
                                                        self.func_name)

    def update_trigger(self):
        """
        This function update the trigger under table node
        :return: response of updated trigger
        """
        return self.tester.put(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id, self.table_id,
                                                self.trigger_id),
            data=json.dumps(self.test_data),
            follow_redirects=True
        )

    def runTest(self):
        """This function will update trigger under table node."""
        trigger_response = triggers_utils.verify_trigger(self.server,
                                                         self.db_name,
                                                         self.trigger_name)
        if not trigger_response:
            raise Exception("Could not find the trigger to update.")

        self.test_data.update({"id": self.trigger_id})
        if self.is_positive_test:
            if hasattr(self, "wrong_trigger_id"):
                self.trigger_id = 9999
            response = self.update_trigger()

        elif hasattr(self, "new_trigger_id"):
            with patch(self.mock_data["function_name"],
                       side_effect=eval(self.mock_data["return_value"])):
                response = self.update_trigger()

        elif hasattr(self, "dummy_dict"):
            self.mock_data['return_value'] = [(True, self.dummy_dict), (
                False, self.expected_data["message"])]
            with patch(self.mock_data["function_name"],
                       side_effect=self.mock_data["return_value"]):
                response = self.update_trigger()
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                if hasattr(self, "wrong_trigger_id"):
                    self.trigger_id = 9999
                response = self.update_trigger()

        self.assertEquals(response.status_code,
                          self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
