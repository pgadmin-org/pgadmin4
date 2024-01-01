##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json
import uuid

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as language_utils
from unittest.mock import patch


class LanguagesAddTestCase(BaseTestGenerator):
    scenarios = utils.generate_scenarios('create_language',
                                         language_utils.test_cases)

    def setUp(self):
        super().setUp()
        db_user = self.server['username']
        self.data = self.test_data
        self.data['name'] = "language_%s" % str(uuid.uuid4())[1:8]
        self.data['lanowner'] = db_user
        self.server_data = parent_node_dict["database"][-1]
        self.server_id = self.server_data["server_id"]
        self.db_id = self.server_data['db_id']
        self.db_name = self.server_data["db_name"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

    def runTest(self):
        """This function will add language under test database."""

        actual_status_code = ''
        expected_status_code = ''
        if self.is_positive_test:
            response = self.create_language()
            actual_status_code = response.status_code
            expected_output = language_utils.verify_language(self)
            expected_status_code = self.expected_data["status_code"]
            self.assertDictEqual(expected_output, self.data)
        else:
            if hasattr(self, "missing_name"):
                del self.data["name"]
                response = self.create_language()
                actual_status_code = response.status_code
                expected_status_code = self.expected_data["status_code"]
            if hasattr(self, "missing_lang_pack"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.create_language()
                    actual_status_code = response.status_code
                    expected_status_code = self.expected_data["status_code"]

            if hasattr(self, "error_in_properties"):
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = self.create_language()
                    actual_status_code = response.status_code
                    expected_status_code = self.expected_data["status_code"]
        self.assertEqual(actual_status_code, expected_status_code)

    def create_language(self):
        """This function will add language under test database."""
        return self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')

    def tearDown(self):
        """This function delete added language and
        disconnect the test database."""

        if self.is_positive_test or hasattr(self, "error_in_properties"):
            language_utils.delete_language(
                self.server, self.db_name, self.data['name'])
            database_utils.disconnect_database(self, self.server_id,
                                               self.db_id)
