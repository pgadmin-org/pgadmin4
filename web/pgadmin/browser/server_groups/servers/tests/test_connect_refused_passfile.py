##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that connecting to a server whose password file path is refused
asks for a password and reports why, rather than connecting without it."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator

MODULE = 'pgadmin.browser.server_groups.servers'
PASSFILE = '../bob/.pgpass'


class ServerConnectRefusedPassfileTestCase(BaseTestGenerator):
    """The connect route returns 401 with the refusal message."""

    scenarios = [
        ('A refused passfile is reported, not connected with', dict()),
    ]

    def setUp(self):
        # No test server is needed: everything the route reads is mocked.
        unittest.TestCase.setUp(self)

    def runTest(self):
        server = SimpleNamespace(
            id=1, name='s', username='postgres', shared=False, service=None,
            use_ssh_tunnel=False, kerberos_conn=False, save_password=False,
            password=None, connection_params={'passfile': PASSFILE})
        manager = MagicMock()
        manager.connection.return_value.connected.return_value = False
        manager.passexec = None
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        refusal = PermissionError(
            'Access denied ({0}): the path resolves outside your storage '
            'directory, or outside the shared storage directory it '
            'names.'.format(PASSFILE))

        with patch(MODULE + '.get_server', return_value=server), \
                patch(MODULE + '._is_non_owner', return_value=False), \
                patch(MODULE + '.get_crypt_key',
                      return_value=(True, b'k')), \
                patch(MODULE + '.get_driver', return_value=driver), \
                patch(MODULE + '.get_complete_file_path',
                      side_effect=refusal):
            response = self.tester.post(
                '/browser/server/connect/1/1', data='{}',
                content_type='application/json')

        self.assertEqual(response.status_code, 401)
        errmsg = response.json['result']['errmsg']
        self.assertIn(PASSFILE, errmsg)
        manager.connection.return_value.connect.assert_not_called()
