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


class TestNewConnectionUser(BaseTestGenerator):
    """ This class will test new connection user. """
    API_URL = '/sqleditor/new_connection_user/'
    scenarios = [
        ('New connection dialog',
         dict(
             url=API_URL,
             is_positive_test=True,
             mocking_required=False,
             is_server_conn_required=False,
             test_data={},
             mock_data={},
             expected_data={
                 "status_code": 200
             }
         )),
        ('New connection dialog connect server',
         dict(
             url=API_URL,
             is_positive_test=True,
             mocking_required=False,
             is_server_conn_required=True,
             test_data={},
             mock_data={},
             expected_data={
                 "status_code": 200
             }
         )),
        ('New connection dialog negative',
         dict(
             url=API_URL,
             is_positive_test=False,
             mocking_required=False,
             is_server_conn_required=True,
             test_data={},
             mock_data={},
             expected_data={
                 "status_code": 200
             }
         )),
    ]

    def setUp(self):
        self.content_type = 'html/json'
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.sgid = config_data['server_group']

    def get_use(self):
        response = self.tester.get(
            self.url + str(self.sgid) + '/' + str(self.sid),
            content_type=self.content_type
        )

        return response

    def runTest(self):
        if self.is_positive_test:
            if self.is_server_conn_required:
                self.server['password'] = self.server['db_password']
                self.tester.post(
                    '/browser/server/connect/{0}/{1}'.format(
                        utils.SERVER_GROUP,
                        self.sid),
                    data=json.dumps(self.server),
                    content_type=self.content_type
                )
            response = self.get_use()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']
        else:
            if self.is_server_conn_required:
                self.server['password'] = self.server['db_password']
                self.tester.post(
                    '/browser/server/connect/{0}/{1}'.format(
                        utils.SERVER_GROUP,
                        self.sid),
                    data=json.dumps(self.server),
                    content_type='html/json'
                )
            self.sid = 0
            response = self.get_use()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)
