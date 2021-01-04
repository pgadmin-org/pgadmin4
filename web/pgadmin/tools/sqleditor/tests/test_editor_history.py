##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
import random


class TestEditorHistory(BaseTestGenerator):
    """ This class will test the query tool polling. """
    scenarios = [
        ('When first query is hit',
         dict(
             entry="""{
                     query: 'first sql statement',
                     start_time: '2017-05-03T14:03:15.150Z',
                     status: true,
                     row_affected: 12345,
                     total_time: '14 msec',
                     message: 'something important ERROR:  message
                     from first sql query',
                     }""",
             clear=False,
             expected_len=1
         )),
        ('When second query is hit',
         dict(
             entry="""{
                    query: 'second sql statement',
                    start_time: '2016-04-03T14:03:15.99Z',
                    status: true,
                    row_affected: 12345,
                    total_time: '14 msec',
                    message: 'something important ERROR:  message from
                    second sql query',
                    }""",
             clear=False,
             expected_len=2
         )),
        ('When cleared',
         dict(
             clear=True,
             expected_len=0
         ))
    ]

    def setUp(self):
        """ This function will check messages return by query tool polling. """
        database_info = parent_node_dict["database"][-1]
        self.server_id = database_info["server_id"]

        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        # Initialize query tool
        self.trans_id = str(random.randint(1, 9999999))
        url = '/datagrid/initialize/query_tool/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url)
        self.assertEqual(response.status_code, 200)

    def runTest(self):
        url = '/sqleditor/query_history/{0}'.format(self.trans_id)

        if not self.clear:
            response = self.tester.post(url, data=self.entry)
            self.assertEqual(response.status_code, 200)

            response = self.tester.get(url)
            self.assertEqual(response.status_code, 200)

            response_data = json.loads(response.data.decode('utf-8'))
            self.assertEqual(len(response_data['data']['result']),
                             self.expected_len)
        else:
            response = self.tester.delete(url)
            self.assertEqual(response.status_code, 200)

            response = self.tester.get(url)
            self.assertEqual(response.status_code, 200)

            response_data = json.loads(response.data.decode('utf-8'))
            self.assertEqual(len(response_data['data']['result']),
                             self.expected_len)

    def tearDown(self):
        # Close query tool
        url = '/datagrid/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)

        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
