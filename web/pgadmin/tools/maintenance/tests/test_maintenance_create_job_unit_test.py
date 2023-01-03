##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import simplejson as json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import server_utils, does_utility_exist
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from unittest.mock import patch, MagicMock


class MaintenanceCreateJobTest(BaseTestGenerator):
    """Test the BackupCreateJob class"""
    scenarios = [
        ('When maintaining object with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_maintenance_server',
                 port=5444,
                 host='localhost',
                 username='postgres'
             ),
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_analyze=False,
                 vacuum_freeze=False,
                 vacuum_full=False,
                 verbose=True
             ),
             url='/maintenance/job/{0}/{1}',
             expected_cmd_opts=['VACUUM VERBOSE;\n'],
         )),
        ('When maintaining object with VACUUM FULL',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_maintenance_server',
                 port=5444,
                 host='localhost',
                 username='postgres'
             ),
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_analyze=False,
                 vacuum_freeze=False,
                 vacuum_full=True,
                 verbose=True
             ),
             url='/maintenance/job/{0}/{1}',
             expected_cmd_opts=['VACUUM FULL VERBOSE;\n'],
         )),
        ('When maintaining object with ANALYZE',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_maintenance_server',
                 port=5444,
                 host='localhost',
                 username='postgres'
             ),
             params=dict(
                 database='postgres',
                 op='ANALYZE',
                 vacuum_analyze=True,
                 vacuum_freeze=False,
                 vacuum_full=False,
                 verbose=True
             ),
             url='/maintenance/job/{0}/{1}',
             expected_cmd_opts=['ANALYZE VERBOSE;\n'],
         )),
        ('When maintenance the object with the REINDEX',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_maintenance_server',
                 port=5444,
                 host='localhost',
                 username='postgres'
             ),
             params=dict(
                 database='postgres',
                 op='REINDEX',
                 vacuum_analyze=False,
                 vacuum_freeze=False,
                 vacuum_full=False,
                 verbose=False
             ),
             url='/maintenance/job/{0}/{1}',
             expected_cmd_opts=['REINDEX DATABASE postgres;\n'],
         )),
        ('When maintenance the object with the CLUSTER',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_maintenance_server',
                 port=5444,
                 host='localhost',
                 username='postgres'
             ),
             params=dict(
                 database='postgres',
                 op='CLUSTER',
                 vacuum_analyze=False,
                 vacuum_freeze=False,
                 vacuum_full=False,
                 verbose=False
             ),
             url='/maintenance/job/{0}/{1}',
             expected_cmd_opts=['CLUSTER;\n'],
         ))
    ]

    def setUp(self):
        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or\
                self.server['default_binary_paths'][self.server['type']] == '':
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

        binary_path = os.path.join(
            self.server['default_binary_paths'][self.server['type']], 'psql')

        if os.name == 'nt':
            binary_path = binary_path + '.exe'

        retVal = does_utility_exist(binary_path)
        if retVal is not None:
            self.skipTest(retVal)

    @patch('pgadmin.tools.maintenance.Server')
    @patch('pgadmin.tools.maintenance.Message')
    @patch('pgadmin.tools.maintenance.BatchProcess')
    @patch('pgadmin.utils.driver.psycopg2.server_manager.ServerManager.'
           'export_password_env')
    def runTest(self, export_password_env_mock,
                batch_process_mock, message_mock, server_mock):
        self.server_id = parent_node_dict["database"][-1]["server_id"]
        self.db_id = parent_node_dict["database"][-1]["db_id"]
        url = self.url.format(self.server_id, self.db_id)

        class TestMockServer():
            def __init__(self, host, port, id, username):
                self.host = host
                self.port = port
                self.id = id
                self.username = username

        mock_obj = TestMockServer(self.class_params['host'],
                                  self.class_params['port'],
                                  self.server_id,
                                  self.class_params['username']
                                  )
        mock_result = server_mock.query.filter_by.return_value
        mock_result.first.return_value = mock_obj

        batch_process_mock.return_value.id = 140391
        batch_process_mock.return_value.set_env_variables = MagicMock(
            return_value=True
        )
        batch_process_mock.return_value.start = MagicMock(
            return_value=True
        )
        message_mock.message = 'test'
        batch_process_mock.return_value.desc = message_mock
        export_password_env_mock.return_value = True

        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":
            db_owner = server_response['data']['user']['name']
            self.data = database_utils.get_db_data(db_owner)
            self.db_name = self.data['name']

        # Create the backup job
        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        self.assertTrue(message_mock.called)
        self.assertTrue(batch_process_mock.called)

        if self.expected_cmd_opts:
            for opt in self.expected_cmd_opts:
                self.assertIn(opt,
                              batch_process_mock.call_args_list[0][1]['args'])
