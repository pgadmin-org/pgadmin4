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


class BackupCreateJobTest(BaseTestGenerator):
    """Test the BackupCreateJob class"""
    scenarios = [
        ('When backup object with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='postgres'
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--format=c', '--blobs'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup object with format directory',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_folder',
                 format='directory',
                 verbose=True,
                 blobs=False,
                 schemas=[],
                 tables=[],
                 database='postgres'
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--format=d'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option sections to all data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 data=True,
                 pre_data=True,
                 post_data=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--format=c',
                                '--section=pre-data', '--section=data',
                                '--section=post-data'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option only_data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 only_data=True,
                 only_schema=False
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--format=p', '--data-only'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option only_data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 only_data=True,
                 only_schema=True,
                 dns_owner=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--format=p', '--data-only'],
             not_expected_cmd_opts=['--schema-only', '--no-owner'],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option only_schema',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 only_data=False,
                 only_schema=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--format=p', '--schema-only'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - format plain and dns_owner',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_owner=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--format=p', '--no-owner'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - Do not save privilege,'
         ' tablespace, unlogged table data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_privilege=True,
                 dns_unlogged_tbl_data=True,
                 dns_tablespace=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--no-privileges',
                                '--no-tablespaces',
                                '--no-unlogged-table-data'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - all queries',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 use_column_inserts=True,
                 include_create_database=True,
                 use_insert_commands=True,
                 include_drop_database=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--create', '--clean', '--inserts',
                                '--column-inserts'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - all queries and format custom',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 use_column_inserts=True,
                 include_create_database=True,
                 use_insert_commands=True,
                 include_drop_database=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--inserts',
                                '--column-inserts'],
             not_expected_cmd_opts=['--create', '--clean'],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - miscellaneous',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 disable_quoting=True,
                 use_set_session_auth=True,
                 with_oids=True,
                 dqoute=True
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose', '--quote-all-identifiers',
                                '--disable-dollar-quoting', '--oids',
                                '--use-set-session-authorization'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with format tar',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='tar',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 blobs=True,
             ),
             url='/backup/job/{0}/object',
             expected_cmd_opts=['--verbose',
                                '--blobs',
                                '--format=t'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 dqoute=False,
                 verbose=True,
                 type='server'
             ),
             url='/backup/job/{0}',
             expected_cmd_opts=['--verbose'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup globals',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_global_file',
                 dqoute=False,
                 verbose=True,
                 type='globals'
             ),
             url='/backup/job/{0}',
             expected_cmd_opts=['--globals-only'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         ))
    ]

    def setUp(self):
        if self.server['default_binary_paths'] is None:
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

    @patch('pgadmin.tools.backup.Server')
    @patch('pgadmin.tools.backup.BackupMessage')
    @patch('pgadmin.tools.backup.filename_with_file_manager_path')
    @patch('pgadmin.tools.backup.BatchProcess')
    @patch('pgadmin.utils.driver.psycopg2.server_manager.ServerManager.'
           'export_password_env')
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, backup_message_mock, server_mock):
        class TestMockServer():
            def __init__(self, name, host, port, id, username,
                         maintenance_db):
                self.name = name
                self.host = host
                self.port = port
                self.id = id
                self.username = username
                self.maintenance_db = maintenance_db

        self.server_id = parent_node_dict["server"][-1]["server_id"]
        mock_obj = TestMockServer(self.class_params['name'],
                                  self.class_params['host'],
                                  self.class_params['port'],
                                  self.server_id,
                                  self.class_params['username'],
                                  self.class_params['database']
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

        url = self.url.format(self.server_id)

        # Create the backup job
        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        self.assertTrue(backup_message_mock.called)
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
