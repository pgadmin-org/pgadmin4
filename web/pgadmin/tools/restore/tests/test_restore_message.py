##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.tools.restore import RestoreMessage
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch


class RestoreMessageTest(BaseTestGenerator):
    """Test the RestoreMessage class"""
    scenarios = [
        ('When restore object',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_restore_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_restore',
                 args=[
                     '--file',
                     'restore_file',
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
                 cmd="/test_path/pg_restore"
             ),
             expected_msg="Restoring backup on the server "
                          "'test_restore_server (localhost:5444)'",
             expected_details_cmd='/test_path/pg_restore --file '
                                  '"restore_file" --host "localhost"'
                                  ' --port "5444" --username "postgres" '
                                  '--no-password --database "postgres"'

         ))
    ]

    @patch('pgadmin.tools.restore.RestoreMessage.get_server_name')
    def runTest(self, get_server_name_mock):
        get_server_name_mock.return_value = "{0} ({1}:{2})" \
            .format(
                self.class_params['name'],
                self.class_params['host'],
                self.class_params['port'])

        restore_obj = RestoreMessage(
            self.class_params['sid'],
            self.class_params['bfile'],
            *self.class_params['args']
        )

        # Check the expected message returned
        self.assertEqual(restore_obj.message, self.expected_msg)

        # Check the command
        obj_details = restore_obj.details(self.class_params['cmd'],
                                          self.class_params['args'])
        self.assertEqual(self.expected_details_cmd, obj_details['cmd'])
