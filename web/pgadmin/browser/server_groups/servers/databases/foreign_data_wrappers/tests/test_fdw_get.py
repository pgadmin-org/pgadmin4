##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fdw_utils
from unittest.mock import patch


class FDWDGetTestCase(BaseTestGenerator):
    """ This class will test fdw properties
    and list API under test database. """
    scenarios = utils.generate_scenarios('fdw_get',
                                         fdw_utils.test_cases)

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super().setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_name = "fdw_{0}".format(str(uuid.uuid4())[1:8])
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)

    def get_fdw(self):
        """
        This functions returns the fdw properties
        :return: fdw properties
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' + str(
                self.server_id) + '/' +
            str(self.db_id) + '/' + str(self.fdw_id),
            content_type='html/json')

    def get_fdw_list(self):
        """
        This functions returns the fdw list
        :return: fdw list
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' + str(
                self.server_id) + '/' +
            str(self.db_id) + '/',
            content_type='html/json')

    def runTest(self):
        """This function will fetch foreign data wrapper present under test
         database."""
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        if self.is_positive_test:
            if hasattr(self, "fdw_list"):
                response = self.get_fdw_list()
            else:
                response = self.get_fdw()
        else:
            if hasattr(self, "error_fetching_fdw"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    if hasattr(self, "fdw_list"):
                        response = self.get_fdw_list()
                    else:
                        response = self.get_fdw()

            if hasattr(self, "wrong_fdw_id"):
                self.fdw_id = 99999
                response = self.get_fdw()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function delete the FDW and disconnect the test database """
        fdw_utils.delete_fdw(self.server, self.db_name, self.fdw_name)
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
