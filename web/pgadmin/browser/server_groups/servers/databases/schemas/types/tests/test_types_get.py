##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

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


class TypesGetTestCase(BaseTestGenerator):
    """ This class will get the type under schema node. """
    scenarios = utils.generate_scenarios('types_get',
                                         types_utils.test_cases)

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get a type.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to get a type.")
        self.type_name = "test_type_get_%s" % (str(uuid.uuid4())[1:8])
        self.type_id = types_utils.create_type(self.server, self.db_name,
                                               self.schema_name, self.type_name
                                               )

    def get_type(self):
        """
        This functions returns the type properties
        :return: type properties
        """
        return self.tester.get(
            "{0}{1}/{2}/{3}/{4}/{5}".format(self.url, utils.SERVER_GROUP,
                                            self.server_id, self.db_id,
                                            self.schema_id, self.type_id
                                            ),
            follow_redirects=True
        )

    def get_type_list(self):
        """
        This functions returns the list all types
        :return: list all types
        """
        return self.tester.get(
            "{0}{1}/{2}/{3}/{4}/".format(self.url, utils.SERVER_GROUP,
                                         self.server_id, self.db_id,
                                         self.schema_id),
            follow_redirects=True
        )

    def runTest(self):
        """ This function will get a type under schema node. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get a type.")

        if self.is_positive_test:
            if hasattr(self, "type_list"):
                response = self.get_type_list()
            else:
                response = self.get_type()

        else:
            if hasattr(self, "error_fetching_type"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    if hasattr(self, "type_list"):
                        response = self.get_type_list()
                    else:
                        response = self.get_type()

            if hasattr(self, "wrong_type_id"):
                self.type_id = 99999
                response = self.get_type()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
