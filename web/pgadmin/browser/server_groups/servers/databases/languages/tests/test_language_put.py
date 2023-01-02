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
from regression.python_test_utils import test_utils as utils
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from regression import parent_node_dict
from . import utils as language_utils
from unittest.mock import patch


class LanguagesPutTestCase(BaseTestGenerator):
    scenarios = utils.generate_scenarios('update_language',
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
        """This function will update the language under test database."""
        self.test_data['id'] = self.language_id
        if self.is_positive_test:
            response = self.update_language()
            actual_response_code = response.status_code
            expected_status_code = self.expected_data['status_code']

        elif self.error_in_update_language:
            self.mock_data['return_value'] = [(True, self.dummy_dict), (
                False, self.expected_data["message"])]
            with patch(self.mock_data["function_name"],
                       side_effect=self.mock_data['return_value']):
                response = self.update_language()
                actual_response_code = response.status_code
                expected_status_code = self.expected_data['status_code']

        self.assertEqual(actual_response_code, expected_status_code)

    def update_language(self):

        return self.tester.put("{0}{1}/{2}/{3}/{4}".format(
            self.url, utils.SERVER_GROUP, self.server_id, self.db_id,
            self.language_id), data=json.dumps(self.test_data),
            follow_redirects=True)

    def tearDown(self):
        """This function delete added language and
        disconnect the test database."""

        language_utils.delete_language(self.server, self.db_name,
                                       self.lang_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
