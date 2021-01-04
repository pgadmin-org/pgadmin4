##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as views_utils


class ViewsSqlTestCase(BaseTestGenerator):
    """This class will fetch the view/mview sql under schema node."""

    # Generates scenarios
    scenarios = utils.generate_scenarios("view_sql", views_utils.test_cases)

    def setUp(self):
        # Load test data
        self.data = self.test_data

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)

        # Check DB version
        if "server_min_version" in self.data:
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to check version")
            if "type" in server_con["data"] and \
                    server_con["data"]["type"] == "pg":
                self.skipTest("Compound Triggers are not supported by PG.")
            elif server_con["data"]["type"] == "ppas" \
                and server_con["data"]["version"] < self.data[
                    "server_min_version"]:
                self.skipTest(self.data["skip_msg"])

        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to fetch the view.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to fetch the view.")

        # Create view
        query = self.inventory_data['query']

        self.view_name = "test_view_sql_%s" % (str(uuid.uuid4())[1:8])

        self.view_id = views_utils.create_view(self.server,
                                               self.db_name,
                                               self.schema_name,
                                               self.view_name,
                                               query)

        if hasattr(self, "trigger_fun_required"):
            self.func_name = "trigger_func_get_%s" % str(uuid.uuid4())[1:8]
            self.function_info = views_utils.\
                create_trigger_function_with_trigger(self.server, self.db_name,
                                                     self.schema_name,
                                                     self.func_name)
            self.trigger_name = \
                "test_trigger_get_%s" % (str(uuid.uuid4())[1:8])
            self.trigger_id = views_utils.create_trigger(self.server,
                                                         self.db_name,
                                                         self.schema_name,
                                                         self.view_name,
                                                         self.trigger_name,
                                                         self.func_name,
                                                         "a")

    def runTest(self):
        """This function will fetch the view/mview sql under schema node."""
        if self.is_positive_test:
            response = views_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = views_utils.api_get(self)
            elif 'view_id' in self.data:
                # Non-existing view id
                self.view_id = self.data["view_id"]
                response = views_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
