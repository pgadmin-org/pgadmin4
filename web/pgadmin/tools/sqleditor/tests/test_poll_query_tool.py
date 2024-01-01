##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
import secrets


class TestPollQueryTool(BaseTestGenerator):
    """ This class will test the query tool polling. """
    scenarios = [
        ('When query tool polling returns messages with result data-set',
         dict(
             sql=[
                 """
DROP TABLE IF EXISTS test_for_notices;

DO $$
BEGIN
    RAISE NOTICE 'Hello, world!';
END $$;

SELECT 'CHECKING POLLING';
""",
                 """
DO $$
BEGIN
    FOR i in 1..1000 LOOP
        RAISE NOTICE 'Count is %', i;
    END LOOP;
END $$;

SELECT 'CHECKING POLLING FOR LONG MESSAGES';
""",
                 "SELECT 'CHECKING POLLING WITHOUT MESSAGES';"
             ],
             expected_message=['NOTICE:  table "test_for_notices" ' +
                               """does not exist, skipping
NOTICE:  Hello, world!
""",
                               "\n".join(["NOTICE:  Count is {0}".format(i)
                                          for i in range(1, 1001)]) + "\n",
                               None],
             expected_result=['CHECKING POLLING',
                              'CHECKING POLLING FOR LONG MESSAGES',
                              'CHECKING POLLING WITHOUT MESSAGES'],
             print_messages=['2 NOTICES WITH DATASET',
                             '1000 NOTICES WITH DATASET',
                             'NO NOTICE WITH DATASET'
                             ]
         ))
    ]

    def runTest(self):
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
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps({
            "dbname": database_info["db_name"]
        }))
        self.assertEqual(response.status_code, 200)

        cnt = 0
        for s in self.sql:
            print("Executing and polling with: " + self.print_messages[cnt])
            # Start query tool transaction
            url = '/sqleditor/query_tool/start/{0}'.format(self.trans_id)
            response = self.tester.post(url, data=json.dumps({"sql": s}),
                                        content_type='html/json')
            self.assertEqual(response.status_code, 200)
            url = '/sqleditor/poll/{0}'.format(self.trans_id)

            _status = True
            # Lets poll till the status is busy and check the messages
            while _status:
                response = self.tester.get(url)
                if response.data:
                    response_data = json.loads(response.data.decode('utf-8'))

                    if response_data['success'] == 1 and 'data' in\
                            response_data:
                        if response_data['data']['status'] == 'NotInitialised':
                            pass
                        elif response_data['data']['status'] == 'Busy':
                            if self.expected_message[cnt] is not None:
                                if response_data['data']['result']:

                                    self.assertIn(
                                        response_data['data']['result'],
                                        self.expected_message[cnt]
                                    )
                        else:
                            self.assertEqual(self.expected_result[cnt],
                                             response_data['data']['result'][
                                                 0][0])
                            _status = False

            cnt += 1

        # Close query tool
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)

        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
