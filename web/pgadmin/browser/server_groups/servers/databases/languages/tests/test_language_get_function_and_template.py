##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid
from . import utils as language_utils
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from unittest.mock import patch


class LanguagesGetFunctionAndTemplateTestCase(BaseTestGenerator):
    scenarios = utils.generate_scenarios(
        'get_language_function_and_template', language_utils.test_cases)

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
        if hasattr(self, 'server_max_version'):
            if self.server_information['server_version'] > \
                    self.server_max_version:
                self.skipTest(self.skip_msg)

    def runTest(self):
        """This function will get the language under test database."""
        if self.is_positive_test:
            response = self.get_language_functions_template()
            actual_response_code = response.status_code
            expected_status_code = self.expected_data['status_code']
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                response = self.get_language_functions_template()
                actual_response_code = response.status_code
                expected_status_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_status_code)

    def get_language_functions_template(self):
        """
        This function will get the language function
        :return:language function response
        """
        return self.tester.get("{0}{1}/{2}/{3}/".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id),
            follow_redirects=True)

    def tearDown(self):
        """This function delete added language and
               disconnect the test database."""
        language_utils.delete_language(self.server, self.db_name,
                                       self.lang_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
