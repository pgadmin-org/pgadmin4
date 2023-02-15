##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.utils import server_utils
from . import utils as roles_utils
import json
from unittest.mock import patch


class ReassignRoleTestCase(BaseTestGenerator):
    """This class tests the role reassign/drop scenario"""

    url = '/browser/role/reassign/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("role_reassign",
                                         roles_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        self.data = self.test_data

        if self.data["role_op"] == 'reassign' and \
            hasattr(self, 'server_min_version') and \
                self.server_information['server_version'] \
                < self.server_min_version:
            self.skipTest(self.skip_msg)

        self.role_name = "role_get_%s" % str(uuid.uuid4())[1:8]
        self.role_id = roles_utils.create_role(self.server, self.role_name)

        role_dict = {
            "server_id": self.server_id,
            "role_id": self.role_id,
            "role_name": self.role_name,
            "new_role_name": None
        }

        self.data['did'] = parent_node_dict['database'][-1]['db_id']

        if self.data["role_op"] == 'reassign':
            self.role_name_1 = "role_get_%s" % str(uuid.uuid4())[1:8]
            self.role_id_1 = roles_utils.create_role(self.server,
                                                     self.role_name_1)
            role_dict["role_id_1"] = self.role_id_1
            role_dict["new_role_name"] = self.role_name_1

            self.data["new_role_id"] = self.role_id_1
            self.data["new_role_name"] = self.role_name_1

        utils.write_node_info("lrid", role_dict)

    def reassign_post_api(self):

        post_response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.role_id),
            data=json.dumps(self.data),
            follow_redirects=True)
        return post_response

    def runTest(self):

        """This function tests role reassign/drop scenario"""
        if self.is_positive_test:
            post_response = self.reassign_post_api()
        elif self.mocking_required:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                post_response = self.reassign_post_api()

        self.assertEqual(post_response.status_code,
                         self.expected_data['status_code'])

    def tearDown(self):
        """This function delete the role from added server"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        role_list = [self.role_name]
        if self.data["role_op"] == 'reassign':
            role_list.append(self.role_name_1)

        roles_utils.delete_role(connection, role_list)
