##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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


class LanguagesGetTestCase(BaseTestGenerator):
    scenarios = utils.generate_scenarios('get_language',
                                         language_utils.test_cases)

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
        if self.is_positive_test:
            self.language_id = language_utils.create_language(self.server,
                                                              self.db_name,
                                                              self.lang_name)

    def runTest(self):
        """This function contains the test cases for language get"""

        actual_response_code = ''
        expected_status_code = 'none'
        if self.is_positive_test:
            if hasattr(self, 'language_list'):
                response = self.get_language_list()
            else:
                response = self.get_language_properties()
            actual_response_code = response.status_code
            expected_status_code = self.expected_data['status_code']
        else:
            if hasattr(self, 'invalid_id'):
                self.language_id = 9999
                response = self.get_language_properties()
                actual_response_code = response.status_code
                expected_status_code = self.expected_data['status_code']

            elif hasattr(self, 'language_list') or \
                    hasattr(self, 'error_in_language_properties'):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):

                    if hasattr(self, 'language_list'):
                        response = self.get_language_list()

                    elif hasattr(self, 'error_in_language_properties'):
                        self.language_id = 9999
                        response = self.get_language_properties()

                    actual_response_code = response.status_code
                    expected_status_code = self.expected_data['status_code']
            elif self.language_acl:
                dummy_dict = {"rows": {"data1": "1", "data2": "2"}}
                self.mock_data['return_value'] = [(True, dummy_dict), (
                    False, self.expected_data["message"])]
                with patch(self.mock_data["function_name"],
                           side_effect=self.mock_data["return_value"]):
                    self.language_id = 9999
                    response = self.get_language_properties()
                    actual_response_code = response.status_code
                    expected_status_code = self.expected_data['status_code']

        self.assertEqual(actual_response_code, expected_status_code)

    def get_language_properties(self):
        return self.tester.get("{0}{1}/{2}/{3}/{4}".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id,
            self.language_id), follow_redirects=True)

    def get_language_list(self):
        return self.tester.get("{0}{1}/{2}/{3}/".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id),
            follow_redirects=True)

    def tearDown(self):
        """This function delete added language and
               disconnect the test database."""
        if self.is_positive_test:
            language_utils.delete_language(self.server, self.db_name,
                                           self.lang_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)


class LanguagesGetNodesTestCase(BaseTestGenerator):
    scenarios = utils.generate_scenarios('get_language_node',
                                         language_utils.test_cases)

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
        """This function will get the language under test database."""

        if self.is_positive_test:
            if hasattr(self, 'language_node'):
                response = self.get_language_node()
            else:
                response = self.get_language_nodes()

            actual_response_code = response.status_code
            expected_status_code = self.expected_data['status_code']
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                if hasattr(self, 'language_node'):
                    response = self.get_language_node()
                else:
                    response = self.get_language_nodes()

                actual_response_code = response.status_code
                expected_status_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_status_code)

    def get_language_nodes(self):
        return self.tester.get("{0}{1}/{2}/{3}/".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id),
            follow_redirects=True)

    def get_language_node(self):
        return self.tester.get("{0}{1}/{2}/{3}/{4}".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id,
            self.language_id), follow_redirects=True)

    def tearDown(self):
        """This function delete added language and
               disconnect the test database."""
        language_utils.delete_language(self.server, self.db_name,
                                       self.lang_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
