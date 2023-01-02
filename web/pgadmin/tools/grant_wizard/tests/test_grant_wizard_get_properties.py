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

from unittest.mock import patch
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as grant_wizard_utils


class GrantWizardSaveGetPropertiesTestCase(BaseTestGenerator):
    """
    This will Get the properties as per selected node of database.
    For test we are testing for table node only.
    """

    scenarios = utils.generate_scenarios(
        'grant_wizard_get_properties',
        grant_wizard_utils.test_cases
    )

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.did = self.database_info["db_id"]
        self.sid = parent_node_dict["server"][-1]["server_id"]

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.sid, self.did)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

    def grant_permissions_database(self):
        response = self.tester.get(
            self.url + str(self.sid) + '/' + str(self.did) + '/' +
            str(self.did) + '/database/',
            content_type='html/json'
        )
        return response

    def grant_permissions_non_database(self):
        response = self.tester.get(
            self.url + str(self.sid) + '/' + str(self.did) + '/' +
            str(self.did) + '/' + self.node_type + '/',
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will grant permission for user under database
        object. """
        if self.id_database:
            if self.is_positive_test:
                response = self.grant_permissions_database()
                actual_response_code = response.status_code
                expected_response_code = self.expected_data['status_code']
            else:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.grant_permissions_database()
                    actual_response_code = response.status_code
                    expected_response_code = self.expected_data['status_code']
        else:
            if self.is_positive_test:
                response = self.grant_permissions_non_database()
                actual_response_code = response.status_code
                expected_response_code = self.expected_data['status_code']
            else:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.grant_permissions_non_database()
                    actual_response_code = response.status_code
                    expected_response_code = self.expected_data['status_code']

        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect database."""
        database_utils.disconnect_database(self, self.sid,
                                           self.did)
