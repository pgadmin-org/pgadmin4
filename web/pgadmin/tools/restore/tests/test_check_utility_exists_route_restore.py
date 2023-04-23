##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils.test_utils import\
    check_binary_path_or_skip_test
from unittest.mock import patch


class TestUtilityCheckRouteCase(BaseTestGenerator):
    """Test to checks the utility route for Restore"""

    scenarios = [
        ('Check utility path route for restore utility', {
            'url': '/restore/utility_exists/{0}',
            'expected_success_value': 1
        })
    ]

    def setUp(self):
        check_binary_path_or_skip_test(self, 'pg_restore')

    @patch('pgadmin.tools.restore.does_utility_exist')
    def runTest(self, does_utility_exist_mock):
        does_utility_exist_mock.return_value = False
        server_id = self.server_information['server_id']
        response = self.tester.get(self.url.format(server_id))
        self.assertEqual(response.status_code, 200)
        response = json.loads(response.data.decode('utf-8'))
        self.assertEqual(self.expected_success_value, response['success'])
