##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import simplejson as json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import server_utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils

if sys.version_info < (3, 3):
    from mock import patch, MagicMock
else:
    from unittest.mock import patch, MagicMock


class RestoreCreateJobTest(BaseTestGenerator):
    """Test the RestoreCreateJob class"""
    scenarios = [
        ('When restore object with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_restore_file',
                 format='custom',
                 custom=False,
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='postgres'
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--verbose'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with format directory',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_restore_file',
                 format='directory',
                 custom=False,
                 verbose=True,
                 blobs=False,
                 schemas=[],
                 tables=[],
                 database='postgres'
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--verbose', '--format=d'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with the sections options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_restore_file',
                 format='custom',
                 no_of_jobs='2',
                 custom=False,
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 data=True,
                 pre_data=True,
                 post_data=True,
                 only_data=True,
                 only_schema=True
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--verbose', '--jobs', '2',
                                '--section=pre-data', '--section=data',
                                '--section=post-data'],
             not_expected_cmd_opts=[],
             # Below options should be enabled once we fix the issue #3368
             # not_expected_cmd_opts=['--data-only', '--schema-only'],
             expected_exit_code=[0, None],
         )),
        ('When restore the object with Type of objects',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_restore_file',
                 format='custom',
                 no_of_jobs='2',
                 custom=False,
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 only_data=True,
                 only_schema=True,
                 dns_owner=True
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--verbose', '--data-only'],
             not_expected_cmd_opts=[],
             # Below options should be enabled once we fix the issue #3368
             # not_expected_cmd_opts=['--schema-only', '--no-owner'],
             expected_exit_code=[0, None],
         )),
        ('When restore object with option - Do not save',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_restore_file',
                 format='custom',
                 verbose=True,
                 custom=False,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_owner=True,
                 dns_privilege=True,
                 dns_tablespace=True,
                 only_data=False
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--no-owner',
                                '--no-tablespaces',
                                '--no-privileges'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with option - Do not save comments',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_restore_file',
                 format='custom',
                 verbose=True,
                 custom=False,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 no_comments=True,
                 only_data=False
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--no-comments'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=110000,
             message='Restore object with --no-comments are not supported '
                     'by EPAS/PG server less than 11.0'
         )),
        ('When restore object with option - Queries',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_file',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 clean=True,
                 include_create_database=True,
                 single_transaction=True,
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--create', '--clean',
                                '--single-transaction'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with option - Disbale',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_file',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 disable_trigger=True,
                 no_data_fail_table=True,
                 only_schema=False
             ),
             url='/restore/job/{0}',
             expected_cmd_opts=['--disable-triggers',
                                '--no-data-for-failed-tables'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with option - Miscellaneous',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_file',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 use_set_session_auth=True,
                 exit_on_error=True,
             ),
             url='/restore/job/{0}',
             # Add '--use_set_session_auth' into
             # expected_cmd_opts once #3363 fixed
             expected_cmd_opts=['--exit-on-error'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
    ]

    def setUp(self):
        if self.server['default_binary_paths'] is None:
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

    @patch('pgadmin.tools.restore.Server')
    @patch('pgadmin.tools.restore.current_user')
    @patch('pgadmin.tools.restore.RestoreMessage')
    @patch('pgadmin.tools.restore.filename_with_file_manager_path')
    @patch('pgadmin.tools.restore.BatchProcess')
    @patch('pgadmin.utils.driver.psycopg2.server_manager.ServerManager.'
           'export_password_env')
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, restore_message_mock,
                current_user_mock, server_mock):
        class TestMockServer():
            def __init__(self, name, host, port, id, username):
                self.name = name
                self.host = host
                self.port = port
                self.id = id
                self.username = username

        self.db_name = ''
        self.server_id = parent_node_dict["server"][-1]["server_id"]

        mock_obj = TestMockServer(self.class_params['name'],
                                  self.class_params['host'],
                                  self.class_params['port'],
                                  self.server_id,
                                  self.class_params['username']
                                  )
        mock_result = server_mock.query.filter_by.return_value
        mock_result.first.return_value = mock_obj

        filename_mock.return_value = self.params['file']

        batch_process_mock.set_env_variables = MagicMock(
            return_value=True
        )
        batch_process_mock.start = MagicMock(
            return_value=True
        )

        export_password_env_mock.return_value = True

        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":
            db_owner = server_response['data']['user']['name']
            self.data = database_utils.get_db_data(db_owner)
            self.db_name = self.data['name']

            if hasattr(self, 'server_min_version') and \
                    server_response["data"]["version"] < \
                    self.server_min_version:
                self.skipTest(self.message)

        url = self.url.format(self.server_id)

        # Create the restore job
        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        self.assertTrue(restore_message_mock.called)
        self.assertTrue(batch_process_mock.called)

        if self.expected_cmd_opts:
            for opt in self.expected_cmd_opts:
                self.assertIn(
                    opt,
                    batch_process_mock.call_args_list[0][1]['args']
                )
        if self.not_expected_cmd_opts:
            for opt in self.not_expected_cmd_opts:
                self.assertNotIn(
                    opt,
                    batch_process_mock.call_args_list[0][1]['args']
                )
