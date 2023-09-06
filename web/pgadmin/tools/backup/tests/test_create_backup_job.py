##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import does_utility_exist
import pgadmin.tools.backup.tests.test_backup_utils as backup_utils


class BackupJobTest(BaseTestGenerator):
    """Backup api test cases"""
    scenarios = [
        ('When backup the object with the default options (< v16)',
         dict(
             params=dict(
                 file='test_backup',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
             ),
             url='/backup/job/{0}/object',
             expected_params=dict(
                 expected_cmd_opts=['--verbose', '--format=c', '--blobs'],
                 not_expected_cmd_opts=[],
                 expected_exit_code=[0, None]
             ),
             server_max_version=159999,
             message='--blobs is deprecated and is not supported by EPAS/PG '
                     'server greater than 15'
         )),
        ('When backup the object with the default options (>= v16)',
         dict(
             params=dict(
                 file='test_backup',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
             ),
             url='/backup/job/{0}/object',
             expected_params=dict(
                 expected_cmd_opts=['--verbose', '--format=c',
                                    '--large-objects'],
                 not_expected_cmd_opts=[],
                 expected_exit_code=[0, None]
             ),
             server_min_version=160000,
             message='--large-objects is not supported by EPAS/PG server '
                     'less than 16'
         )),
        ('When backup selected objects ',
         dict(
             params=dict(
                 file='test_backup',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 objects={
                     "schema": [],
                     "table": [
                         {"id": "public_test", "name": "test",
                          "icon": "icon-table", "schema": "public",
                          "type": "table", "_name": "public.test"}
                     ],
                     "view": [], "sequence": [], "foreign_table": [],
                     "mview": []
                 }
             ),
             url='/backup/job/{0}/object',
             expected_params=dict(
                 expected_cmd_opts=['--verbose', '--format=c', '--blobs'],
                 not_expected_cmd_opts=[],
                 expected_exit_code=[1]
             )
         )),
    ]

    def setUp(self):
        if hasattr(self, 'server_min_version') and \
            self.server_information['server_version'] < \
                self.server_min_version:
            self.skipTest(self.message)

        if hasattr(self, 'server_max_version') and \
            self.server_information['server_version'] > \
                self.server_max_version:
            self.skipTest(self.message)

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
            'pg_dump')

        if os.name == 'nt':
            binary_path = binary_path + '.exe'

        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            self.skipTest(ret_val)

    def runTest(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        url = self.url.format(self.server_id)

        # Create the backup job
        job_id = backup_utils.create_backup_job(self.tester, url, self.params,
                                                self.assertEqual)
        backup_file = backup_utils.run_backup_job(self.tester,
                                                  job_id,
                                                  self.expected_params,
                                                  self.assertIn,
                                                  self.assertNotIn,
                                                  self.assertEqual
                                                  )

        if backup_file is not None and os.path.isfile(backup_file):
            os.remove(backup_file)
