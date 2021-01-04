##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fdw_utils
from unittest.mock import patch


class FDWDAddTestCase(BaseTestGenerator):
    """ This class will add foreign data wrappers under database node. """
    skip_on_database = ['gpdb']

    scenarios = utils.generate_scenarios('fdw_create',
                                         fdw_utils.test_cases)

    def setUp(self):
        """ This function will create extension."""
        super(FDWDAddTestCase, self).setUp()

        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.schema_name = self.schema_data['schema_name']
        self.db_name = parent_node_dict["database"][-1]["db_name"]

    def create_foreign_data_wrapper(self):
        """
        This function create a foreign data wrapper and returns the created
        foreign data wrapper response
        :return: created foreign data wrapper response
        """
        return self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')

    def runTest(self):
        """This function will add foreign data wrapper under test database."""
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        self.data = fdw_utils.get_fdw_data(self.schema_name,
                                           self.server['username'])
        if self.is_positive_test:
            response = self.create_foreign_data_wrapper()
        else:
            if hasattr(self, "error_creating_fdw"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.create_foreign_data_wrapper()

            if hasattr(self, "internal_server_error"):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.create_foreign_data_wrapper()

            if hasattr(self, "invalid_data"):
                del self.data['name']
                response = self.create_foreign_data_wrapper()

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the FDW and disconnect the test database """
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
