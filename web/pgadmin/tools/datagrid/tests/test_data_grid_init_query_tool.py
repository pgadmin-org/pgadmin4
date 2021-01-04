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
from pgadmin.utils.exception import ExecuteError
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
from . import utils as data_grid_utils


class DatagridInitQueryToolTestCase(BaseTestGenerator):
    """
    This will init query-tool connection.
    """

    scenarios = utils.generate_scenarios(
        'data_grid_init_query_tool',
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

        if not db_con['data']["connected"]:
            raise ExecuteError("Could not connect to database to add a table.")

    def init_query_tool(self):
        response = self.tester.post(
            self.url + str(self.trans_id) + '/' + str(self.sgid) + '/' + str(
                self.sid) + '/' + str(self.did),
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will init query tool connection."""

        if self.is_positive_test:
            response = self.init_query_tool()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']

            self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect database."""
        database_utils.disconnect_database(self, self.sid,
                                           self.did)
