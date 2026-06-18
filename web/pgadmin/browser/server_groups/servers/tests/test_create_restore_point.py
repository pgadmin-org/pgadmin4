##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for the named-restore-point endpoint.

A prior implementation built the query with ``str.format()``, allowing
an authenticated user to inject SQL through the ``value`` field
(CWE-89). The query must instead pass the user-supplied name as a bound
parameter, so a malicious value is treated as opaque text by
PostgreSQL.
"""

import json
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils


# Payload that would have closed the literal and appended an extra
# statement under the original ``"... '{0}'".format(name)`` formulation.
# With parameterised execution it is just an opaque text value.
_INJECTION_PAYLOAD = "test'); SELECT pg_sleep(0); --"


class CreateRestorePointSQLiTestCase(BaseTestGenerator):
    """POST /browser/server/restore_point/... must bind, not interpolate."""

    scenarios = [
        (
            "Malicious 'value' is bound, not interpolated into SQL",
            dict(
                url='/browser/server/restore_point/',
                test_data={'value': _INJECTION_PAYLOAD},
                expected_sql='SELECT pg_catalog.pg_create_restore_point(%s);',
                expected_status=200,
            ),
        ),
    ]

    def setUp(self):
        self.server_id = servers_utils.create_server(self.server, 1)
        utils.write_node_info('sid', {'server_id': self.server_id})

    @patch('pgadmin.browser.server_groups.servers.get_driver')
    def runTest(self, get_driver_mock):
        # Replace the driver so the view never touches a real server.
        mock_connection = MagicMock()
        mock_connection.connected.return_value = True
        mock_connection.execute_scalar.return_value = (True, '0/1234567')

        mock_manager = MagicMock()
        mock_manager.connection.return_value = mock_connection
        get_driver_mock.return_value.connection_manager.return_value = \
            mock_manager

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' + str(self.server_id),
            data=json.dumps(self.test_data),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, self.expected_status)

        mock_connection.execute_scalar.assert_called_once()
        call = mock_connection.execute_scalar.call_args
        sql_arg = call.args[0] if call.args else call.kwargs.get('query')
        params_arg = call.args[1] if len(call.args) > 1 \
            else call.kwargs.get('params')

        # The user input must arrive as a bound parameter; the SQL text
        # must be the parameterised form with no payload spliced in.
        self.assertEqual(sql_arg, self.expected_sql)
        self.assertEqual(params_arg, (_INJECTION_PAYLOAD,))
        # Defence in depth: if a future refactor reintroduces string
        # formatting while still passing a params tuple, these catch it.
        self.assertNotIn('pg_sleep', sql_arg)
        self.assertNotIn("test')", sql_arg)
