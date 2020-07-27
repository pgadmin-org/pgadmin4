##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as language_utils
from unittest.mock import patch


class LanguagesDeleteTestCase(BaseTestGenerator):
    scenarios = utils.generate_scenarios(
        'language_delete', language_utils.test_cases)

    def setUp(self):
        self.server_data = parent_node_dict["database"][-1]
        self.server_id = self.server_data["server_id"]
        self.db_id = self.server_data['db_id']
        self.db_name = self.server_data["db_name"]
        self.lang_name = "language_%s" % str(uuid.uuid4())[1:8]

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        self.language_id = language_utils.create_language(self.server,
                                                          self.db_name,
                                                          self.lang_name)

    def runTest(self):
        """This function contains the test cases for delete language"""

        if self.is_positive_test:
            response = self.delete_language()
            actual_response_code = response.status_code
            expected_status_code = self.expected_data['status_code']
        elif hasattr(self, 'error_in_getting_language'):
            with patch(self.mock_data["function_name"],
                       return_value=[eval(self.mock_data["return_value"])]):
                response = self.delete_language()
                actual_response_code = response.status_code
                expected_status_code = self.expected_data['status_code']

        elif self.error_in_deleting_language:
            # with patch('pgadmin.utils.driver.psycopg2.connection.Connection'
            #            '.execute_scalar',
            #            side_effect=[(True, True), (
            #                False, self.expected_data["message"])]):
            with patch(self.mock_data["function_name"],
                       side_effect=[eval(self.mock_data["return_value"])]):
                response = self.delete_language()
                actual_response_code = response.status_code
                expected_status_code = self.expected_data['status_code']

        self.assertEquals(actual_response_code, expected_status_code)

    def delete_language(self):
        """This function will delete language under test database."""
        return self.tester.delete("{0}{1}/{2}/{3}/{4}".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id,
            self.language_id), follow_redirects=True)

    def tearDown(self):
        """This function disconnect the test database."""

        database_utils.disconnect_database(self, self.server_id, self.db_id)
