##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import os

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import server_utils, does_utility_exist
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from unittest.mock import patch, MagicMock
from config import PG_DEFAULT_DRIVER

RESTORE_JOB_URL = '/restore/job/{0}'


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
             url=RESTORE_JOB_URL,
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
             url=RESTORE_JOB_URL,
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
             url=RESTORE_JOB_URL,
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
             url=RESTORE_JOB_URL,
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
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--no-owner',
                                '--no-tablespaces',
                                '--no-privileges'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with option - Do not save comments, '
         'Publications, Subscriptions, Security Labels',
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
                 dns_comments=True,
                 dns_publications=True,
                 dns_subscriptions=True,
                 dns_security_labels=True,
                 only_data=False
             ),
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--no-comments', '--no-publications',
                                '--no-subscriptions', '--no-security-labels'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=110000,
             message='Restore object with --no-comments --no-publications,'
                     '--no-subscriptions, --no-security-labels is not '
                     'supported by EPAS/PG server less than 11.0'
         )),
        ('When restore object with option - Do not save Table Access Method ',
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
                 dns_table_access_method=True
             ),
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--no-table-access-method'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=150000,
             message='Restore object with --no-table-access-method is not '
                     'supported by EPAS/PG server less than 15.0'
         )),
        ('When restore object with option - Queries',
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
                 schemas=[],
                 tables=[],
                 database='postgres',
                 clean=True,
                 include_create_database=True,
                 single_transaction=True,
                 if_exists=True,
             ),
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--create', '--clean',
                                '--single-transaction', '--if-exists'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with Table options - enable row security and '
         'No data for failed tables',
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
                 schemas=[],
                 tables=[],
                 database='postgres',
                 enable_row_security=True,
                 no_data_fail_table=True,
                 only_schema=False
             ),
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--enable-row-security',
                                '--no-data-for-failed-tables'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with option - Disable Triggers',
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
                 schemas=[],
                 tables=[],
                 database='postgres',
                 disable_trigger=True,
                 only_schema=False
             ),
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--disable-triggers'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with option - Miscellaneous',
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
                 schemas=[],
                 tables=[],
                 database='postgres',
                 use_set_session_auth=True,
                 exit_on_error=True,
             ),
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--exit-on-error',
                                '--use-set-session-authorization'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When restore object with option - Exclude schema',
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
                 schemas=[],
                 tables=[],
                 database='postgres',
                 exclude_schema="sch*"
             ),
             url=RESTORE_JOB_URL,
             expected_cmd_opts=['--exclude-schema', 'sch*'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
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
            self.server['default_binary_paths'][self.server['type']],
            'pg_restore')

        if os.name == 'nt':
            binary_path = binary_path + '.exe'

        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            self.skipTest(ret_val)

    @patch('pgadmin.tools.restore.RestoreMessage')
    @patch('pgadmin.tools.restore.filename_with_file_manager_path')
    @patch('pgadmin.tools.restore.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, restore_message_mock):
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

        filename_mock.return_value = self.params['file']

        batch_process_mock.return_value.id = 140391
        batch_process_mock.return_value.set_env_variables = MagicMock(
            return_value=True
        )
        batch_process_mock.return_value.start = MagicMock(
            return_value=True
        )

        restore_message_mock.message = 'test'
        batch_process_mock.return_value.desc = restore_message_mock
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
