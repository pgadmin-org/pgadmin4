##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as roles_utils
import json
from unittest.mock import patch


class ReassignRoleSQLTestCase(BaseTestGenerator):
    """This class tests the role reassign/drop scenario"""

    url = '/browser/role/reassign/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("role_reassign_sql",
                                         roles_utils.test_cases)

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        self.data = self.test_data
        self.role_id = 1
        self.data['did'] = parent_node_dict['database'][-1]['db_id']

        if hasattr(self, 'server_min_version') and \
            self.server_information['server_version'] \
                < self.server_min_version:
            self.skipTest(self.skip_msg)

    def reassign_get_api(self):

        get_response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.role_id),
            data=json.dumps(self.data),
            follow_redirects=True)
        return get_response

    def runTest(self):

        """This function tests role reassign/drop scenario"""
        if self.is_positive_test:
            get_response = self.reassign_get_api()
        elif self.mocking_required:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                get_response = self.reassign_get_api()

        self.assertEqual(get_response.status_code,
                         self.expected_data['status_code'])

        self.assertEqual(get_response.json['data'],
                         self.expected_data['test_result_data']['result'])

    def tearDown(self):
        """This function delete the role from added server"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        connection.close()
