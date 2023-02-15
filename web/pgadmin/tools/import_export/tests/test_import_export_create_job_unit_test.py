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


class IECreateJobTest(BaseTestGenerator):
    """Test the IECreateJob class"""

    import_export_url = '/import_export/job/{0}'

    scenarios = [
        ('When export file with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file.csv',
                 format='csv',
                 is_import=False,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 database='postgres',
                 columns=['test_col_1', 'test_col_2'],
                 icolumns=[],
                 schema="export_test_schema",
                 table="export_test_table"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO',
                                'export_test_schema', 'export_test_table'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When export file with csv file, header, delimiter=tab, '
         'encoding=LATIN1',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_01',
                 format="csv",
                 encoding="LATIN1",
                 header=True,
                 delimiter="[tab]",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 icolumns=[],
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_01',
                                'export_test_table_01', 'HEADER', 'DELIMITER',
                                'LATIN1'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When export file with csv file, header, delimiter=tab, '
         'encoding=LATIN1',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_01',
                 format="csv",
                 encoding="LATIN1",
                 header=True,
                 delimiter="[tab]",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 icolumns=[],
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_01',
                                'export_test_table_01', 'HEADER', 'DELIMITER',
                                'LATIN1'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When export file with binary file, oid, encoding=UTF8',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_02',
                 format="binary",
                 encoding="UTF8",
                 oid=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_020', 'test_col_021'],
                 icolumns=[],
                 schema="test_schema_02",
                 table="export_test_table_02"
             ),
             server_max_version=119999,
             skip_msg="OIDs not supported by EPAS/PG 12.0 and above.",
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_02',
                                'export_test_table_02', 'UTF8',
                                'OIDS'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When export file with text file, delimiter=|, encoding=ISO_8859_6',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_03',
                 format="text",
                 encoding="ISO_8859_6",
                 delimiter="|",
                 quote="\"",
                 escape="'",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_030', 'test_col_031'],
                 icolumns=[],
                 schema="test_schema_03",
                 table="export_test_table_03"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_03',
                                'export_test_table_03', 'DELIMITER',
                                'ISO_8859_6'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When export file with binary file, delimiter=tab, '
         'encoding=ISO_8859_6',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_04',
                 format="binary",
                 encoding="ISO_8859_6",
                 quote="\"",
                 escape="'",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_040', 'test_col_041'],
                 icolumns=[],
                 schema="test_schema_04",
                 table="export_test_table_04"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_04',
                                'export_test_table_04',
                                'ISO_8859_6'],
             not_expected_cmd_opts=['DELIMITER'],
             expected_exit_code=[0, None]
         )),
        ('When import file with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_import_file.csv',
                 format='csv',
                 is_import=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 database='postgres',
                 columns=['test_col_1', 'test_col_2'],
                 icolumns=[],
                 schema="import_test_schema",
                 table="import_test_table"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM',
                                'import_test_schema', 'import_test_table'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
    ]

    def setUp(self):

        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or \
                self.server['default_binary_paths'][self.server['type']] == '':
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

        bin_p = self.server['default_binary_paths'][self.server['type']]

        binary_path = os.path.join(bin_p, 'psql')

        if os.name == 'nt':
            binary_path = binary_path + '.exe'

        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            self.skipTest(ret_val)

    @patch('pgadmin.tools.import_export.Server')
    @patch('pgadmin.tools.import_export.IEMessage')
    @patch('pgadmin.tools.import_export.filename_with_file_manager_path')
    @patch('pgadmin.tools.import_export.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, ie_message_mock, server_mock):
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

        filename_mock.return_value = self.params['filename']

        batch_process_mock.return_value.id = 140391
        batch_process_mock.return_value.set_env_variables = MagicMock(
            return_value=True
        )
        batch_process_mock.return_value.start = MagicMock(
            return_value=True
        )

        ie_message_mock.message = 'test'
        batch_process_mock.return_value.desc = ie_message_mock
        export_password_env_mock.return_value = True

        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":
            db_owner = server_response['data']['user']['name']
            self.data = database_utils.get_db_data(db_owner)

            if hasattr(self, 'server_max_version') \
                and server_response["data"]["version"] > self.\
                    server_max_version:
                self.skipTest(self.skip_msg)

        url = self.url.format(self.server_id)

        # Create the import/export job
        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        self.assertTrue(ie_message_mock.called)
        self.assertTrue(batch_process_mock.called)

        if self.expected_cmd_opts:
            for opt in self.expected_cmd_opts:
                arg = repr(batch_process_mock.call_args_list[0][1]['args'])
                self.assertIn(
                    opt,
                    arg
                )
        if self.not_expected_cmd_opts:
            for opt in self.not_expected_cmd_opts:
                arg = repr(batch_process_mock.call_args_list[0][1]['args'])
                self.assertNotIn(
                    opt,
                    arg
                )
