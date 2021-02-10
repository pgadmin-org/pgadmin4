##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json
import uuid
import random

from unittest.mock import patch
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
from pgadmin.browser.server_groups.servers.roles.tests import \
    utils as roles_utils
from . import utils as data_grid_utils
from pgadmin.utils.exception import ExecuteError


class DatagridUpdateConnectionTestCase(BaseTestGenerator):
    """
    This will update query-tool connection.
    """

    scenarios = utils.generate_scenarios(
        'data_grid_update_connection',
        data_grid_utils.test_cases
    )

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.did = self.database_info["db_id"]
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.sgid = config_data['server_group']

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.sid, self.did)

        self.trans_id = str(random.randint(1, 9999999))
        self.roles = None

        if self.is_create_role:
            data = roles_utils.get_role_data(self.server['db_password'])
            self.role_name = data['rolname']
            self.role_password = data['rolpassword']
            roles_utils.create_role_with_password(
                self.server, self.role_name, self.role_password)

        if not self.is_positive_test or self.is_create_role:
            qt_init = data_grid_utils._init_query_tool(self, self.trans_id,
                                                       self.sgid, self.sid,
                                                       self.did)

            if not qt_init['success']:
                raise ExecuteError("Could not initialize querty tool.")

        self.test_data = {
            "database": self.did,
            "server": self.sid,
        }

        if self.server_information['type'] == 'ppas':
            self.test_data['password'] = 'enterprisedb'
            self.test_data['user'] = 'enterprisedb'
        else:
            self.test_data['password'] = 'postgres'
            self.test_data['user'] = 'postgres'

        if not db_con['data']["connected"]:
            raise ExecuteError("Could not connect to database to add a table.")

    def update_connection(self, user_data=None):
        if user_data:
            response = self.tester.post(
                self.url + str(self.trans_id) + '/' + str(self.sgid) +
                '/' + str(self.sid) + '/' + str(self.did),
                data=json.dumps(user_data),
                content_type='html/json'
            )
        else:
            response = self.tester.post(
                self.url + str(self.trans_id) + '/' + str(self.sgid) + '/' +
                str(self.sid) + '/' + str(self.did),
                data=json.dumps(self.test_data),
                content_type='html/json'
            )
        return response

    def runTest(self):
        """ This function will update query tool connection."""

        if self.is_positive_test:
            user_data = dict()
            if self.is_create_role:
                user_data['user'] = self.role_name
                user_data['password'] = self.role_password
                user_data['role'] = None
            response = self.update_connection(user_data=user_data)
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']
        else:
            response = self.update_connection()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']

        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect database."""
        # Delete role of created
        if self.is_create_role:
            connection = utils.get_db_connection(self.server['db'],
                                                 self.server['username'],
                                                 self.server['db_password'],
                                                 self.server['host'],
                                                 self.server['port'],
                                                 self.server['sslmode'])
            roles_utils.delete_role(connection, self.role_name)

        database_utils.disconnect_database(self, self.sid,
                                           self.did)
