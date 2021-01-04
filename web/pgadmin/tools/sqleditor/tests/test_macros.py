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


class TestMacros(BaseTestGenerator):
    """ This class will test the query tool polling. """
    scenarios = [
        ('Get all macros',
         dict(
             url='get_macros',
             method='get'
         )),
        ('Set Macros',
         dict(
             url='set_macros',
             method='put',
             operation='set',
             data={
                 'changed': [
                     {'id': 1,
                      'name': 'Test Macro 1',
                      'sql': 'SELECT 1;'
                      },
                     {'id': 2,
                      'name': 'Test Macro 2',
                      'sql': 'SELECT 2;'
                      },
                     {'id': 3,
                      'name': 'Test Macro 3',
                      'sql': 'SELECT 3;'
                      },
                 ]
             }
         )),
        ('Update Macros',
         dict(
             url='set_macros',
             method='put',
             operation='update',
             data={
                 'changed': [
                     {'id': 1,
                      'name': 'Test Macro 1 updated',
                      },
                     {'id': 2,
                      'sql': 'SELECT 22;'
                      },
                     {'id': 3,
                      'name': 'Test Macro 3 updated',
                      'sql': 'SELECT 33;'
                      },
                 ]
             }
         )),
        ('Clear Macros',
         dict(
             url='set_macros',
             method='put',
             operation='clear',
             data={
                 'changed': [
                     {'id': 1,
                      'name': '',
                      'sql': ''
                      },
                     {'id': 2,
                      'name': '',
                      'sql': ''
                      },
                     {'id': 3,
                      'name': '',
                      'sql': ''
                      },
                 ]
             }
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
        url = '/sqleditor/{0}/{1}'.format(self.url, self.trans_id)

        if self.method == 'get':
            response = self.tester.get(url)
            self.assertEqual(response.status_code, 200)

            response_data = json.loads(response.data.decode('utf-8'))
            self.assertEqual(len(response_data['macro']), 22)
        else:
            response = self.tester.put(url,
                                       data=json.dumps(self.data),
                                       follow_redirects=True)
            self.assertEqual(response.status_code, 200)

            for m in self.data['changed']:
                url = '/sqleditor/get_macros/{0}/{1}'.format(m['id'],
                                                             self.trans_id)
                response = self.tester.get(url)

                if self.operation == 'clear':
                    self.assertEqual(response.status_code, 410)
                elif self.operation == 'set':
                    self.assertEqual(response.status_code, 200)

                    response_data = json.loads(response.data.decode('utf-8'))
                    self.assertEqual(response_data['name'], m['name'])
                    self.assertEqual(response_data['sql'], m['sql'])
                elif self.operation == 'update':
                    self.assertEqual(response.status_code, 200)

                    response_data = json.loads(response.data.decode('utf-8'))
                    if 'name' in m:
                        self.assertEqual(response_data['name'], m['name'])
                    if 'sql' in m:
                        self.assertEqual(response_data['sql'], m['sql'])

    def tearDown(self):
        # Close query tool
        url = '/datagrid/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)

        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
