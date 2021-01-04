##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.tools.backup import BackupMessage, BACKUP
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch


class BackupMessageTest(BaseTestGenerator):
    """Test the BackupMessage class"""

    expected_storage_dir = '/test_path'
    pg_dump = "/pg_dump"

    scenarios = [
        ('When Backup server',
         dict(
             class_params=dict(
                 type=BACKUP.SERVER,
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='/test_path/test_restore.sql',
                 args=[
                     '--file',
                     "backup_file",
                     '--host',
                     "localhost",
                     '--port',
                     "5444",
                     '--username',
                     "postgres",
                     '--no-password',
                     '--database',
                     "postgres"
                 ],
                 cmd=expected_storage_dir + pg_dump
             ),
             expected_msg="Backing up the server"
                          " 'test_backup_server (localhost:5444)'",
             expected_details_cmd='/test_path/pg_dump --file '
                                  '"backup_file" --host "localhost" '
                                  '--port "5444" --username "postgres" '
                                  '--no-password --database "postgres"',
             expected_storage_dir=expected_storage_dir

         )),
        ('When Backup global',
         dict(
             class_params=dict(
                 type=BACKUP.GLOBALS,
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='/test_path/test_backup',
                 args=[
                     '--file',
                     'backup_file',
                     '--host',
                     'localhost',
                     '--port',
                     '5444',
                     '--username',
                     'postgres',
                     '--no-password',
                     '--database',
                     'postgres'
                 ],
                 cmd=expected_storage_dir + pg_dump
             ),
             expected_msg="Backing up the global objects on the server "
                          "'test_backup_server (localhost:5444)'",
             expected_details_cmd='/test_path/pg_dump --file "backup_file" '
                                  '--host "localhost"'
                                  ' --port "5444" --username "postgres" '
                                  '--no-password --database "postgres"',
             expected_storage_dir=expected_storage_dir

         )),
        ('When backup object',
         dict(
             class_params=dict(
                 type=BACKUP.OBJECT,
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='/test_path/test_backup',
                 args=[
                     '--file',
                     'backup_file',
                     '--host',
                     'localhost',
                     '--port',
                     '5444',
                     '--username',
                     'postgres',
                     '--no-password',
                     '--database',
                     'postgres'
                 ],
                 cmd=expected_storage_dir + pg_dump
             ),
             expected_msg="Backing up an object on the server "
                          "'test_backup_server (localhost:5444)'"
                          " from database 'postgres'",
             expected_details_cmd='/test_path/pg_dump --file "backup_file" '
                                  '--host "localhost" '
                                  '--port "5444" --username "postgres" '
                                  '--no-password --database "postgres"',
             expected_storage_dir=expected_storage_dir

         ))
    ]

    @patch('pgadmin.utils.get_storage_directory')
    @patch('pgadmin.tools.backup.BackupMessage.get_server_details')
    def runTest(self, get_server_details_mock, get_storage_directory_mock):
        get_server_details_mock.return_value = \
            self.class_params['name'],\
            self.class_params['host'],\
            self.class_params['port']

        backup_obj = BackupMessage(
            self.class_params['type'],
            self.class_params['sid'],
            self.class_params['bfile'],
            *self.class_params['args'],
            **{'database': self.class_params['database']}
        )

        get_storage_directory_mock.return_value = '/'

        # Check the expected message returned
        self.assertEqual(backup_obj.message, self.expected_msg)

        # Check the command
        obj_details = backup_obj.details(self.class_params['cmd'],
                                         self.class_params['args'])

        self.assertIn(self.expected_details_cmd, obj_details)
