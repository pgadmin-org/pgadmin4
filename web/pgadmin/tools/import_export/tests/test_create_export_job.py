##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
import pgadmin.tools.import_export.tests.test_import_export_utils \
    as import_export_utils
from pgadmin.utils import does_utility_exist

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils


class ExportJobTest(BaseTestGenerator):
    """Export api test cases"""

    import_export_url = '/import_export/job/{0}'

    scenarios = [
        ('When exporting a table with the default options',
         dict(
             params=dict(
                 filename='test_import_export',
                 format='csv',
                 is_import=False,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 database='',
                 columns=[],
                 icolumns=[],
                 schema="",
                 table=""
             ),
             url=import_export_url,
             expected_params=dict(
                 expected_cmd_opts=['--command', 'copy', 'TO'],
                 not_expected_cmd_opts=[],
                 expected_exit_code=[0, None]
             )
         )),
        ('When exporting a table with binary, encoding, delimiter, quote',
         dict(
             params=dict(
                 filename='test_import_export_bin',
                 format='binary',
                 is_import=False,
                 encoding="LATIN1",
                 delimiter="|",
                 quote="'",
                 escape="'",
                 database='',
                 columns=[],
                 icolumns=[],
                 schema="",
                 table=""
             ),
             url=import_export_url,
             expected_params=dict(
                 expected_cmd_opts=['--command', 'copy', 'TO'],
                 not_expected_cmd_opts=[],
                 expected_exit_code=[0, None]
             )
         )),
        ('When exporting a table with text, encoding, delimiter, quote',
         dict(
             params=dict(
                 filename='test_import_export_text',
                 format='text',
                 is_import=False,
                 encoding="ISO_8859_5",
                 delimiter="[tab]",
                 quote="\"",
                 escape="'",
                 database='',
                 columns=[],
                 icolumns=[],
                 schema="",
                 table=""
             ),
             url=import_export_url,
             expected_params=dict(
                 expected_cmd_opts=['--command', 'copy', 'TO'],
                 not_expected_cmd_opts=[],
                 expected_exit_code=[0, None]
             )
         ))
    ]

    def setUp(self):

        import_export_utils.setup_export_data(self)

        self.params['database'] = self.db_name
        self.params['schema'] = self.schema_name
        self.params['table'] = self.table_name
        self.params['columns'] = [self.column_name, self.column_name_1]

        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or\
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

    def runTest(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        url = self.url.format(self.server_id)

        # Create the import/export job
        job_id = import_export_utils.create_import_export_job(self.tester,
                                                              url,
                                                              self.params,
                                                              self.assertEqual)
        export_file = import_export_utils\
            .run_import_export_job(self.tester, job_id, self.expected_params,
                                   self.assertIn,
                                   self.assertNotIn,
                                   self.assertEqual
                                   )

        if export_file is not None and os.path.isfile(export_file):
            os.remove(export_file)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
