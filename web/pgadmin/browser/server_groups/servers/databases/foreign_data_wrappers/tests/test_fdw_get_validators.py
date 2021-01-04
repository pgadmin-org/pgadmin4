##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
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


class FDWValidatorsTestCase(BaseTestGenerator):
    """This class will test fdw validators under test database."""
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('fdw_get_validators',
                                         fdw_utils.test_cases)

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super(FDWValidatorsTestCase, self).setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_name = "fdw_{0}".format(str(uuid.uuid4())[1:8])
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)

    def get_validators_fdw(self):
        """
        This function gets fdw validators
        :return: fdw validators
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
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
        fdw_response = fdw_utils.verify_fdw(self.server, self.db_name,
                                            self.fdw_name)
        if not fdw_response:
            raise Exception("Could not find FDW.")

        if self.is_positive_test:
            response = self.get_validators_fdw()
        else:
            if hasattr(self, "internal_server_error"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.get_validators_fdw()

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the FDW and disconnect the test database """
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
