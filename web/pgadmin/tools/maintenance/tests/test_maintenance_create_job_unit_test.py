##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import server_utils, does_utility_exist
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from unittest.mock import patch, MagicMock

from config import PG_DEFAULT_DRIVER

MAINTENANCE_URL = '/maintenance/job/{0}/{1}'


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
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE);\n'],
         )),
        ('When maintaining object with VACUUM FULL, FREEZE, ANALYZE, '
         'DISABLE_PAGE_SKIPPING',
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
                 vacuum_analyze=True,
                 vacuum_freeze=True,
                 vacuum_full=True,
                 vacuum_disable_page_skipping=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, FULL, FREEZE, ANALYZE, '
                                'DISABLE_PAGE_SKIPPING);\n'],
         )),
        ('When maintaining object with VACUUM SKIP LOCKED, TRUNCATE, '
         'INDEX CLEANUP',
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
                 skip_locked=True,
                 vacuum_truncate=True,
                 vacuum_index_cleanup='OFF',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, SKIP_LOCKED, TRUNCATE, '
                                'INDEX_CLEANUP OFF);\n'],
             server_min_version=120000,
             message='VACUUM SKIP_LOCKED, TRUNCATE and INDEX_CLEANUP is not '
                     'supported by EPAS/PG server less than 12.0'
         )),
        ('When maintaining object with VACUUM PARALLEL',
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
                 vacuum_parallel='15',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, PARALLEL 15);\n'],
             server_min_version=130000,
             message='VACUUM PARALLEL is not supported by EPAS/PG server '
                     'less than 13.0'
         )),
        ('When maintaining object with VACUUM PROCESS TOAST',
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
                 vacuum_process_toast=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, PROCESS_TOAST);\n'],
             server_min_version=140000,
             message='VACUUM PROCESS TOAST is not supported by EPAS/PG server '
                     'less than 14.0'
         )),
        ('When maintaining object with VACUUM SKIP DATABASE STATS, '
         'PROCESS MAIN, BUFFER USAGE LIMIT',
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
                 vacuum_process_main=True,
                 vacuum_skip_database_stats=True,
                 buffer_usage_limit='1MB',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, PROCESS_MAIN, '
                                'SKIP_DATABASE_STATS, BUFFER_USAGE_LIMIT "1MB"'
                                ');\n'],
             server_min_version=160000,
             message='VACUUM SKIP_DATABASE_STATS, PROCESS_MAIN and '
                     'BUFFER_USAGE_LIMIT is not supported by EPAS/PG server '
                     'less than 16.0'
         )),
        ('When maintaining object with VACUUM ONLY DATABASE STATS',
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
                 vacuum_only_database_stats=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, ONLY_DATABASE_STATS);\n'],
             server_min_version=160000,
             message='VACUUM ONLY DATABASE STATS is not supported by EPAS/PG '
                     'server less than 16.0'
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
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['ANALYZE (VERBOSE);\n'],
         )),
        ('When maintaining object with ANALYZE SKIP LOCKED',
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
                 skip_locked=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['ANALYZE (VERBOSE, SKIP_LOCKED);\n'],
             server_min_version=120000,
             message='ANALYZE SKIP_LOCKED is not supported by EPAS/PG server '
                     'less than 12.0'
         )),
        ('When maintaining object with ANALYZE BUFFER USAGE LIMIT',
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
                 buffer_usage_limit='1MB',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['ANALYZE (VERBOSE, BUFFER_USAGE_LIMIT "1MB"'
                                ');\n'],
             server_min_version=160000,
             message='ANALYZE BUFFER_USAGE_LIMIT is not supported by '
                     'EPAS/PG server less than 16.0'
         )),
        ('When maintaining object with default options on table',
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
                 schema='my_schema',
                 table='my_table',
                 vacuum_analyze=False,
                 vacuum_freeze=False,
                 vacuum_full=False,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE) my_schema.my_table;\n'],
         )),
        ('When maintaining object with VACUUM FULL, FREEZE, ANALYZE, '
         'DISABLE_PAGE_SKIPPING on table',
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
                 schema='my_schema',
                 table='my_table',
                 vacuum_analyze=True,
                 vacuum_freeze=True,
                 vacuum_full=True,
                 vacuum_disable_page_skipping=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, FULL, FREEZE, ANALYZE, '
                                'DISABLE_PAGE_SKIPPING) my_schema.my_table'
                                ';\n'],
         )),
        ('When maintaining object with VACUUM SKIP LOCKED, TRUNCATE, '
         'INDEX CLEANUP on table',
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
                 schema='my_schema',
                 table='my_table',
                 skip_locked=True,
                 vacuum_truncate=True,
                 vacuum_index_cleanup='OFF',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, SKIP_LOCKED, TRUNCATE, '
                                'INDEX_CLEANUP OFF) my_schema.my_table;\n'],
             server_min_version=120000,
             message='VACUUM SKIP_LOCKED, TRUNCATE and INDEX_CLEANUP is not '
                     'supported by EPAS/PG server less than 12.0'
         )),
        ('When maintaining object with VACUUM PARALLEL on table',
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
                 schema='my_schema',
                 table='my_table',
                 vacuum_parallel='15',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, PARALLEL 15) '
                                'my_schema.my_table;\n'],
             server_min_version=130000,
             message='VACUUM PARALLEL is not supported by EPAS/PG server '
                     'less than 13.0'
         )),
        ('When maintaining object with VACUUM PROCESS TOAST on table',
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
                 schema='my_schema',
                 table='my_table',
                 vacuum_process_toast=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, PROCESS_TOAST) '
                                'my_schema.my_table;\n'],
             server_min_version=140000,
             message='VACUUM PROCESS TOAST is not supported by EPAS/PG server '
                     'less than 14.0'
         )),
        ('When maintaining object with VACUUM SKIP DATABASE STATS, '
         'PROCESS MAIN, BUFFER USAGE LIMIT on table',
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
                 schema='my_schema',
                 table='my_table',
                 vacuum_process_main=True,
                 vacuum_skip_database_stats=True,
                 buffer_usage_limit='1MB',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, PROCESS_MAIN, '
                                'SKIP_DATABASE_STATS, BUFFER_USAGE_LIMIT "1MB"'
                                ') my_schema.my_table;\n'],
             server_min_version=160000,
             message='VACUUM SKIP_DATABASE_STATS, PROCESS_MAIN and '
                     'BUFFER_USAGE_LIMIT is not supported by EPAS/PG server '
                     'less than 16.0'
         )),
        ('When maintaining object with VACUUM ONLY DATABASE STATS on table',
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
                 schema='my_schema',
                 table='my_table',
                 vacuum_only_database_stats=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['VACUUM (VERBOSE, ONLY_DATABASE_STATS) '
                                'my_schema.my_table;\n'],
             server_min_version=160000,
             message='VACUUM ONLY DATABASE STATS is not supported by EPAS/PG '
                     'server less than 16.0'
         )),
        ('When maintaining object with ANALYZE on table',
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
                 schema='my_schema',
                 table='my_table',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['ANALYZE (VERBOSE) my_schema.my_table;\n'],
         )),
        ('When maintaining object with ANALYZE SKIP LOCKED on table',
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
                 schema='my_schema',
                 table='my_table',
                 skip_locked=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['ANALYZE (VERBOSE, SKIP_LOCKED) '
                                'my_schema.my_table;\n'],
             server_min_version=120000,
             message='ANALYZE SKIP_LOCKED is not supported by EPAS/PG server '
                     'less than 12.0'
         )),
        ('When maintaining object with ANALYZE BUFFER USAGE LIMIT on table',
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
                 schema='my_schema',
                 table='my_table',
                 buffer_usage_limit='1MB',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['ANALYZE (VERBOSE, BUFFER_USAGE_LIMIT "1MB"'
                                ') my_schema.my_table;\n'],
             server_min_version=160000,
             message='ANALYZE BUFFER_USAGE_LIMIT is not supported by '
                     'EPAS/PG server less than 16.0'
         )),
        ('When maintenance the object with the REINDEX SYSTEM',
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
                 reindex_system=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE) SYSTEM postgres;\n'],
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
                 verbose=False
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX DATABASE postgres;\n'],
         )),
        ('When maintenance the object with the REINDEX CONCURRENTLY',
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
                 reindex_concurrently=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE, CONCURRENTLY) DATABASE '
                                'postgres;\n'],
             server_min_version=120000,
             message='REINDEX CONCURRENTLY is not supported by EPAS/PG server '
                     'less than 12.0'
         )),
        ('When maintenance the object with the REINDEX TABLESPACE',
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
                 reindex_tablespace='pg_default',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE, TABLESPACE "pg_default") '
                                'DATABASE postgres;\n'],
             server_min_version=140000,
             message='REINDEX TABLESPACE is not supported by EPAS/PG server '
                     'less than 14.0'
         )),
        ('When maintenance the object with the REINDEX SCHEMA',
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
                 schema='my_schema',
                 op='REINDEX',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE) SCHEMA my_schema;\n'],
         )),
        ('When maintenance the object with the REINDEX TABLE',
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
                 schema='my_schema',
                 table='my_table',
                 op='REINDEX',
                 verbose=False
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX TABLE my_schema.my_table;\n'],
         )),
        ('When maintenance the object with the REINDEX CONCURRENTLY TABLE',
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
                 schema='my_schema',
                 table='my_table',
                 op='REINDEX',
                 reindex_concurrently=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE, CONCURRENTLY) TABLE '
                                'my_schema.my_table;\n'],
             server_min_version=120000,
             message='REINDEX CONCURRENTLY TABLE is not supported by '
                     'EPAS/PG server less than 12.0'
         )),
        ('When maintenance the object with the REINDEX TABLESPACE TABLE',
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
                 schema='my_schema',
                 table='my_table',
                 op='REINDEX',
                 reindex_tablespace='pg_default',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE, TABLESPACE "pg_default") '
                                'TABLE my_schema.my_table;\n'],
             server_min_version=140000,
             message='REINDEX TABLESPACE TABLE is not supported by '
                     'EPAS/PG server less than 14.0'
         )),
        ('When maintenance the object with the REINDEX INDEX',
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
                 schema='my_schema',
                 index='my_index',
                 op='REINDEX',
                 verbose=False
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX INDEX my_schema.my_index;\n'],
         )),
        ('When maintenance the object with the REINDEX CONCURRENTLY INDEX',
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
                 schema='my_schema',
                 index='my_index',
                 op='REINDEX',
                 reindex_concurrently=True,
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE, CONCURRENTLY) INDEX '
                                'my_schema.my_index;\n'],
             server_min_version=120000,
             message='REINDEX CONCURRENTLY is not supported by EPAS/PG server '
                     'less than 12.0'
         )),
        ('When maintenance the object with the REINDEX TABLESPACE INDEX',
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
                 schema='my_schema',
                 index='my_index',
                 op='REINDEX',
                 reindex_tablespace='pg_default',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['REINDEX (VERBOSE, TABLESPACE "pg_default") '
                                'INDEX my_schema.my_index;\n'],
             server_min_version=140000,
             message='REINDEX TABLESPACE is not supported by EPAS/PG server '
                     'less than 14.0'
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
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['CLUSTER VERBOSE;\n'],
         )),
        ('When maintenance the object with the CLUSTER on table',
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
                 schema='my_schema',
                 table='my_table',
                 op='CLUSTER',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['CLUSTER VERBOSE my_schema.my_table;\n'],
         )),
        ('When maintenance the object with the CLUSTER on table using index',
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
                 schema='my_schema',
                 table='my_table',
                 index='my_index',
                 op='CLUSTER',
                 verbose=True
             ),
             url=MAINTENANCE_URL,
             expected_cmd_opts=['CLUSTER VERBOSE my_schema.my_table '
                                'USING my_index;\n'],
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

        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            self.skipTest(ret_val)

    @patch('pgadmin.tools.maintenance.Server')
    @patch('pgadmin.tools.maintenance.Message')
    @patch('pgadmin.tools.maintenance.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
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

            if hasattr(self, 'server_min_version') and \
                    server_response["data"]["version"] < \
                    self.server_min_version:
                self.skipTest(self.message)

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
