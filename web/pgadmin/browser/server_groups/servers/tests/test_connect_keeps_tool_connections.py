##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Connecting a server from the Object Explorer must not release the
connections of open Query Tool and View/Edit Data tabs (#10742).

Restored tabs connect to their database before the Object Explorer
connects the server, so the maintenance database connection is still
closed when the tree's connect request arrives. ServerNode.connect() used
to call ServerManager.update() in that case, which releases every
connection of the server: each restored tab then answered its status poll
with "Transaction status check failed.".
"""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import Flask

from pgadmin.browser.server_groups.servers import ServerNode
from pgadmin.utils.driver.psycopg3.server_manager import ServerManager
from pgadmin.utils.exception import CryptKeyMissing
from pgadmin.utils.route import BaseTestGenerator

MODULE = 'pgadmin.browser.server_groups.servers'


def connection(connected):
    return MagicMock(**{'connected.return_value': connected})


class TestConnectKeepsToolConnections(BaseTestGenerator):
    """ServerNode.connect() re-reads the server details with
    ServerManager.update() only while none of the server's connections is
    open, and never for the Query Tool."""

    scenarios = [
        ('Nothing connected: update the manager', dict(
            tool_connected=False, is_qt=False, expect_update=True)),
        ('Restored tool tab connected, tree not yet: keep its connection',
         dict(tool_connected=True, is_qt=False, expect_update=False)),
        ('Request from the Query Tool: never update', dict(
            tool_connected=False, is_qt=True, expect_update=False)),
    ]

    def setUp(self):
        # Pure logic test with mocked connections: skip the server setup.
        unittest.TestCase.setUp(self)

    def runTest(self):
        maintenance_conn = connection(False)

        manager = ServerManager.__new__(ServerManager)
        manager.connections = {
            'DB:postgres': maintenance_conn,
            'DB:appdb': connection(self.tool_connected),
            'CONN:4584253': connection(self.tool_connected),
        }
        manager.connection = MagicMock(return_value=maintenance_conn)
        manager.update = MagicMock()

        driver = MagicMock()
        driver.connection_manager.return_value = manager
        server = SimpleNamespace(id=1, username='postgres', service=None,
                                 shared=False, use_ssh_tunnel=0)

        app = Flask(__name__)
        with app.test_request_context(method='POST', data='{}'), \
                patch(MODULE + '.get_driver', return_value=driver), \
                patch(MODULE + '._is_non_owner', return_value=False), \
                patch(MODULE + '.current_user', SimpleNamespace(id=1)), \
                patch(MODULE + '.User'), \
                patch(MODULE + '.get_crypt_key', return_value=(False, None)):
            # A missing crypt key ends the request right after the
            # update decision, before any connection is attempted.
            with self.assertRaises(CryptKeyMissing):
                ServerNode.connect(ServerNode.__new__(ServerNode), 1, 1,
                                   is_qt=self.is_qt, server=server)

        if self.expect_update:
            manager.update.assert_called_once_with(server)
        else:
            manager.update.assert_not_called()
