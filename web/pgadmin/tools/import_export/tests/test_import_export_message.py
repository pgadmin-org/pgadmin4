##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.tools.import_export import IEMessage
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch
import config


class IEMessageTest(BaseTestGenerator):
    """Test the IEMessage class"""
    scenarios = [
        ('When Export table with default options',
         dict(
             class_params=dict(
                 sid=1,
                 schema='public',
                 name='test_export',
                 is_import=False,
                 port=5444,
                 host='localhost',
                 database='postgres',
                 server='postgres x',
                 filename='/test_export_file.csv',
                 storage='/',
                 table='test_table',
                 cmd="/test_path",
                 args=[
                     '--command',
                     '\\copy public.test_table  (m_id)  TO '
                     '\'/test_path/text_export.csv\'   CSV   '
                     'QUOTE \'"\' ESCAPE \'\'\'\';'
                 ]
             ),
             expected_msg="Copying table data '{0}.{1}' on "
                          "database '{2}' and server '{3} ({4}:{5})'",
             expected_storage_dir='/'

         )),
        ('When Export table with folder path',
         dict(
             class_params=dict(
                 sid=1,
                 schema='public',
                 name='test_export',
                 is_import=False,
                 port=5444,
                 host='localhost',
                 database='postgres',
                 server='postgres x',
                 filename='/test_path/test_export_file.csv',
                 storage='/',
                 table='test_table',
                 cmd="/test_path",
                 args=[
                     '--command',
                     '\\copy public.test_table  (m_id)  TO '
                     '\'/test_path/text_export.csv\'   CSV   '
                     'QUOTE \'"\' ESCAPE \'\'\'\';'
                 ]
             ),
             expected_msg="Copying table data '{0}.{1}' on "
                          "database '{2}' and server '{3} ({4}:{5})'",
             expected_storage_dir='/test_path'

         )),
    ]

    @patch('os.path.realpath')
    @patch('pgadmin.misc.bgprocess.processes.get_storage_directory')
    @patch('pgadmin.misc.bgprocess.processes.get_complete_file_path')
    @patch('pgadmin.tools.import_export.IEMessage.get_server_name')
    def runTest(self, get_server_name_mock,
                get_complete_file_path_mock,
                get_storage_directory_mock,
                realpath_mock):

        get_server_name_mock.return_value = "{0} ({1}:{2})" \
            .format(
                self.class_params['name'],
                self.class_params['host'],
                self.class_params['port'])

        get_complete_file_path_mock.return_value \
            = self.class_params['filename']
        realpath_mock.return_value = self.class_params['filename']
        get_storage_directory_mock.return_value = '//'

        import_export_obj = IEMessage(
            *self.class_params['args'],
            **{
                'sid': self.class_params['sid'],
                'schema': self.class_params['schema'],
                'table': self.class_params['table'],
                'is_import': self.class_params['is_import'],
                'database': self.class_params['database'],
                'filename': self.class_params['filename'],
                'storage': self.class_params['storage'],
            }
        )

        expected_msg = self.expected_msg.format(
            self.class_params['schema'],
            self.class_params['table'],
            self.class_params['database'],
            self.class_params['name'],
            self.class_params['host'],
            self.class_params['port']
        )

        # Check the expected message returned
        self.assertEqual(import_export_obj.message, expected_msg)

        # Check the command
        obj_details = import_export_obj.details(self.class_params['cmd'],
                                                self.class_params['args'])

        self.assertIn(self.class_params['schema'], obj_details['message'])
        self.assertIn(self.class_params['table'], obj_details['message'])
        self.assertIn(self.class_params['database'], obj_details['message'])
        self.assertIn(self.class_params['host'], obj_details['message'])
        self.assertIn(str(self.class_params['port']), obj_details['message'])

        if config.SERVER_MODE is False:
            self.skipTest(
                "Skipping tests for Storage manager in Desktop mode."
            )
        else:
            storage_dir = import_export_obj.current_storage_dir
            self.assertEqual(self.expected_storage_dir, storage_dir)
