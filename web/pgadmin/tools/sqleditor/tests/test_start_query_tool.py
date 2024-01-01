##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.sqleditor import StartRunningQuery
from unittest.mock import patch, ANY


class StartQueryTool(BaseTestGenerator):
    """
    Ensures that the call to the backend to start running a query
    calls the needed functions
    """

    @patch('pgadmin.tools.sqleditor.extract_sql_from_network_parameters')
    def runTest(self, extract_sql_from_network_parameters_mock):
        """Check correct function is called to handle to run query."""

        extract_sql_from_network_parameters_mock.return_value = \
            'transformed sql'

        with patch.object(StartRunningQuery,
                          'execute',
                          return_value='some result'
                          ) as StartRunningQuery_execute_mock:
            response = self.tester.post(
                '/sqleditor/query_tool/start/1234', data=json.dumps({
                    "sql": "some sql statement"}))
            self.assertEqual(response.status, '200 OK')
            self.assertEqual(response.data, b'some result')
            StartRunningQuery_execute_mock \
                .assert_called_with('transformed sql', 1234, ANY, False)
            extract_sql_from_network_parameters_mock \
                .assert_called_with(
                    b'{"sql": "some sql statement"}',
                    ANY, ANY)
