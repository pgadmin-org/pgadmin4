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
from . import utils as data_grid_utils
from pgadmin.utils.exception import ExecuteError


class DatagridQueryToolCloseTestCase(BaseTestGenerator):
    """
    This will close query-tool connection.
    """

    scenarios = utils.generate_scenarios(
        'data_grid_query_tool_close',
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

        if not db_con['data']["connected"]:
            raise ExecuteError("Could not connect to database to add a table.")

        self.trans_id = str(random.randint(1, 9999999))
        qt_init = data_grid_utils._init_query_tool(self, self.trans_id,
                                                   self.sgid, self.sid,
                                                   self.did)

        if not qt_init['success']:
            raise ExecuteError("Could not initialize querty tool.")

    def close_connection(self):
        response = self.tester.delete(
            self.url + str(self.trans_id),
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will update query tool connection."""

        if self.is_positive_test:
            response = self.close_connection()
            actual_response_code = response.status_code
            expected_response_code = self.expected_data['status_code']

            self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect database."""
        database_utils.disconnect_database(self, self.sid,
                                           self.did)
