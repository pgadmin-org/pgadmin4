##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as cast_utils
from unittest.mock import patch


class CastsCreateGetFunctionsTestCase(BaseTestGenerator):
    url = '/browser/cast/'
    scenarios = utils.generate_scenarios("cast_create_get_functions",
                                         cast_utils.test_cases)

    def runTest(self):
        """ This function will add cast under test database. """
        super().runTest()
        self.data = self.test_data
        self.server_data = parent_node_dict["database"][-1]
        self.server_id = self.server_data["server_id"]
        self.db_id = self.server_data['db_id']
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        if self.is_positive_test:
            response = cast_utils.api_create_cast_get_functions(self)
            cast_utils.assert_status_code(self, response)

        else:
            if self.mocking_required:
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = cast_utils.api_create_cast_get_functions(self)
                    cast_utils.assert_status_code(self, response)
                    cast_utils.assert_error_message(self, response)

    def tearDown(self):
        """This function disconnect the test database and drop added cast."""
        if self.is_positive_test:
            database_utils.disconnect_database(self, self.server_id,
                                               self.db_id)
