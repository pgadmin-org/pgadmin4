##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from unittest.mock import patch, MagicMock

from config import PG_DEFAULT_DRIVER

MAINTENANCE_URL = '/maintenance/job/{0}/{1}'


class MaintenanceInputValidationTest(BaseTestGenerator):
    """
    Reject malicious / out-of-range values for the four maintenance options
    that get concatenated into the rendered SQL command. These payloads
    correspond to the SQL-injection PoC patterns; the endpoint must return
    HTTP 400 and never reach BatchProcess.
    """

    scenarios = [
        ('buffer_usage_limit with SQL-injection payload is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='ANALYZE',
                 buffer_usage_limit='256kB"); COPY (SELECT 1) TO PROGRAM '
                                    "'id'; --",
                 verbose=True,
             ),
         )),
        ('buffer_usage_limit with bad unit is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 buffer_usage_limit='1XB',
                 verbose=True,
             ),
         )),
        ('buffer_usage_limit non-string is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 buffer_usage_limit=12345,
                 verbose=True,
             ),
         )),
        ('vacuum_parallel with SQL-injection payload is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_parallel='0); COPY (SELECT 1) TO PROGRAM \'id\'; --',
                 verbose=True,
             ),
         )),
        ('vacuum_parallel negative is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_parallel='-1',
                 verbose=True,
             ),
         )),
        ('vacuum_parallel above max is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_parallel='99999',
                 verbose=True,
             ),
         )),
        ('vacuum_index_cleanup with SQL-injection payload is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_index_cleanup='OFF); COPY (SELECT 1) TO PROGRAM '
                                      "'id'; ANALYZE (VERBOSE",
                 verbose=True,
             ),
         )),
        ('vacuum_index_cleanup with unknown value is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_index_cleanup='MAYBE',
                 verbose=True,
             ),
         )),
        ('vacuum_index_cleanup lowercase is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_index_cleanup='off',
                 verbose=True,
             ),
         )),
        ('reindex_tablespace non-string is rejected',
         dict(
             params=dict(
                 database='postgres',
                 op='REINDEX',
                 reindex_tablespace=['pg_default'],
                 verbose=True,
             ),
         )),
        ('vacuum_index_cleanup as list is rejected (no 500)',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_index_cleanup=['OFF'],
                 verbose=True,
             ),
         )),
        ('vacuum_index_cleanup as dict is rejected (no 500)',
         dict(
             params=dict(
                 database='postgres',
                 op='VACUUM',
                 vacuum_index_cleanup={'$ne': None},
                 verbose=True,
             ),
         )),
    ]

    @patch('pgadmin.tools.maintenance.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock):
        self.server_id = parent_node_dict["database"][-1]["server_id"]
        self.db_id = parent_node_dict["database"][-1]["db_id"]
        url = MAINTENANCE_URL.format(self.server_id, self.db_id)

        batch_process_mock.return_value.id = 1
        batch_process_mock.return_value.set_env_variables = MagicMock(
            return_value=True)
        batch_process_mock.return_value.start = MagicMock(return_value=True)
        export_password_env_mock.return_value = True

        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')

        self.assertEqual(response.status_code, 400)
        # Validation must reject the request before BatchProcess is touched.
        self.assertFalse(batch_process_mock.called)


class MaintenanceInputValidationAcceptsValidTest(BaseTestGenerator):
    """
    Confirm that legitimate option values still pass validation. Anything
    that the UI can produce should reach BatchProcess.
    """

    scenarios = [
        ('vacuum_index_cleanup AUTO is accepted',
         dict(params=dict(database='postgres', op='VACUUM',
                          vacuum_index_cleanup='AUTO', verbose=True))),
        ('buffer_usage_limit with space is accepted',
         dict(params=dict(database='postgres', op='ANALYZE',
                          buffer_usage_limit='128 kB', verbose=True))),
        ('buffer_usage_limit case-insensitive is accepted',
         dict(params=dict(database='postgres', op='VACUUM',
                          buffer_usage_limit='1mb', verbose=True))),
        ('vacuum_parallel zero is accepted',
         dict(params=dict(database='postgres', op='VACUUM',
                          vacuum_parallel='0', verbose=True))),
        ('vacuum_parallel max is accepted',
         dict(params=dict(database='postgres', op='VACUUM',
                          vacuum_parallel='1024', verbose=True))),
    ]

    @patch('pgadmin.tools.maintenance.does_utility_exist')
    @patch('pgadmin.tools.maintenance.Server')
    @patch('pgadmin.tools.maintenance.Message')
    @patch('pgadmin.tools.maintenance.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                message_mock, server_mock, does_utility_exist_mock):
        # The route short-circuits with success=0 when the psql binary
        # is missing on disk; on Windows CI the binary is not at the
        # path pgAdmin expects, so stub the check out to keep this test
        # focused on input validation behavior.
        does_utility_exist_mock.return_value = None
        self.server_id = parent_node_dict["database"][-1]["server_id"]
        self.db_id = parent_node_dict["database"][-1]["db_id"]
        url = MAINTENANCE_URL.format(self.server_id, self.db_id)

        class TestMockServer:
            def __init__(self, host, port, sid, username):
                self.host = host
                self.port = port
                self.id = sid
                self.username = username

        mock_obj = TestMockServer('localhost', 5444, self.server_id,
                                  'postgres')
        server_mock.query.filter_by.return_value.first.return_value = mock_obj

        batch_process_mock.return_value.id = 140391
        batch_process_mock.return_value.set_env_variables = MagicMock(
            return_value=True)
        batch_process_mock.return_value.start = MagicMock(return_value=True)
        message_mock.message = 'test'
        batch_process_mock.return_value.desc = message_mock
        export_password_env_mock.return_value = True

        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(batch_process_mock.called)
