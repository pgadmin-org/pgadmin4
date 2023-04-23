##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils


class IsPasswordSaved(BaseTestGenerator):
    """ This class will test the save password functionality. """

    scenarios = utils.generate_scenarios('is_password_saved',
                                         servers_utils.test_cases)

    def setUp(self):
        self.server_id = utils.create_server(self.server)
        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def runTest(self):
        """This function will execute the connect server APIs"""
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' + str(self.server_id),
            data=dict(
                password=self.server['db_password'],
                save_password='on'),
            follow_redirects=True)

        expected_status_code = self.expected_data["status_code"]
        actual_status_code = response.status_code
        self.assertEqual(actual_status_code, expected_status_code)
        response_data = json.loads(response.data.decode('utf-8'))

        expected_message = self.expected_data["message"]
        actual_message = response_data["info"]
        self.assertEqual(actual_message, expected_message)

        expected_is_password_saved = self.test_data["is_password_saved"]
        actual_is_password_saved = response_data["data"]["is_password_saved"]
        self.assertEqual(actual_is_password_saved, expected_is_password_saved)

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
