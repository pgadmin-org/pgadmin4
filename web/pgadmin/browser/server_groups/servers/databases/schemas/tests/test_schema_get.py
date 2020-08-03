##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from unittest.mock import patch
from . import utils as schema_utils


class SchemaGetTestCase(BaseTestGenerator):
    """ This class will add new schema under database node. """
    scenarios = utils.generate_scenarios('schema_get',
                                         schema_utils.test_cases)

    def get_schema(self):
        """
        This function returns the schema get response
        :return: schema get response
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id),
            content_type='html/json')

    def get_schema_list(self):
        """
        This functions returns the schema list
        :return: schema list
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/',
            content_type='html/json')

    def runTest(self):
        """ This function will delete schema under database node. """
        schema = parent_node_dict["schema"][-1]
        self.db_id = schema["db_id"]
        self.server_id = schema["server_id"]

        server_response = server_utils.connect_server(self, self.server_id)
        if not server_response["data"]["connected"]:
            raise Exception("Could not connect to server to connect the"
                            " database.")

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to get the schema.")

        self.schema_id = schema["schema_id"]
        if self.is_positive_test:
            if hasattr(self, "schema_list"):
                response = self.get_schema_list()
            else:
                response = self.get_schema()

        else:
            if hasattr(self, "error_fetching_schema"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    if hasattr(self, "schema_list"):
                        response = self.get_schema_list()
                    else:
                        response = self.get_schema()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEquals(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
