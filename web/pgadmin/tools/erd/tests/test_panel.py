##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils


class ERDPanel(BaseTestGenerator):

    def setUp(self):
        self.db_name = "erdtestdb"
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)
        self.sgid = config_data["server_group"]

    def runTest(self):
        url = '/erd/panel/{trans_id}?sgid={sgid}&sid={sid}&server_type=pg' \
              '&did={did}&gen=false'.\
            format(trans_id=123344, sgid=self.sgid, sid=self.sid, did=self.did)

        response = self.tester.post(
            url, data={"title": "panel_title", "close_url": "the/close/url"},
            content_type="application/x-www-form-urlencoded")
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
