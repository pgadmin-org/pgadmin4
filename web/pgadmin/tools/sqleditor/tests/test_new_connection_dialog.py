##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.test_setup import config_data
from regression.python_test_utils import test_utils as utils


class TestNewConnectionDialog(BaseTestGenerator):
    """ This class will test new connection dialog. """
    scenarios = [
        ('New connection dialog',
         dict(
             url="/sqleditor/new_connection_dialog/",
             is_positive_test=True,
             mocking_required=False,
             is_connect_server=False,
             test_data={},
             mock_data={},
             expected_data={
                 "status_code": 200
             }
         )),
    ]

    def setUp(self):
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.sgid = config_data['server_group']

    def new_connection(self):
        response = self.tester.get(
            self.url + str(self.sgid) + '/' + str(self.sgid),
            content_type='html/json'
        )

        return response

    def runTest(self):
        if self.is_positive_test:
            response = self.new_connection()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']
            self.assertEqual(actual_response_code, expected_response_code)
