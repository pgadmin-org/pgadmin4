##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import secrets

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import async_poll


class TestExplainPlan(BaseTestGenerator):
    """ This class will test the explain plan return format. """

    def runTest(self):
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
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps({
            "dbname": database_info["db_name"]
        }))
        self.assertEqual(response.status_code, 200)

        # Start query tool transaction
        url = '/sqleditor/query_tool/start/{0}'.format(self.trans_id)
        response = self.tester.post(
            url, data=json.dumps({
                "sql": "SELECT 1",
                "explain_plan": {
                    "format": "json",
                    "analyze": False,
                    "verbose": False,
                    "costs": False,
                    "buffers": False,
                    "timing": False,
                    "verbose": False
                }
            }), content_type='html/json')

        self.assertEqual(response.status_code, 200)

        response = async_poll(tester=self.tester,
                              poll_url='/sqleditor/poll/{0}'.format(
                                  self.trans_id))

        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))

        # Check the ouput of explain plan
        self.assertEqual(len(response_data['data']['result']), 1)
        self.assertEqual(len(response_data['data']['result'][0]), 1)

        # Close query tool
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)

        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
