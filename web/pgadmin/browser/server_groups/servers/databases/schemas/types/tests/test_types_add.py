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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as types_utils
from unittest.mock import patch
from pgadmin.utils import server_utils


class TypesAddTestCase(BaseTestGenerator):
    """ This class will add type under schema node. """
    scenarios = utils.generate_scenarios('types_create',
                                         types_utils.test_cases)

    def setUp(self):
        self.data = self.test_data
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]

        # Check DB version
        if "server_min_version" in self.data:
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "a table.")
            if (server_con["data"]["type"] == 'pg' or
                    server_con["data"]["version"] <=
                    self.data["server_min_version"]):
                self.skipTest(self.data["skip_msg"])

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a type.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a type.")

    def create_types(self):
        """
        This function create a type and returns the created type response
        :return: created types response
        """
        return self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')

    def runTest(self):
        """ This function will add type under schema node. """
        if "name" in self.data:
            self.data["name"] = self.data["name"] + (str(uuid.uuid4())[1:8])

        db_user = self.server["username"]
        self.data["typeowner"] = db_user
        self.data["schema"] = self.schema_name

        if self.is_positive_test:
            response = self.create_types()
        else:
            if hasattr(self, "missing_parameter"):
                response = self.create_types()

            if hasattr(self, "internal_server_error"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.create_types()

            if hasattr(self, "error_in_db"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.create_types()

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
