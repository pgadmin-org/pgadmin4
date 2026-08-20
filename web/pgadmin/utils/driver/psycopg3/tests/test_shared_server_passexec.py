##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for shared_server_passexec(), used by connection_manager(),
_restore_connections_from_session(), and by browser.server_groups.servers
to recompute a non-owner's passexec after manager.update() rebuilds the
manager from the server object alone (see #10249).
"""

from unittest.mock import MagicMock, patch
from pgadmin.utils.route import BaseTestGenerator

DRIVER_MODULE = 'pgadmin.utils.driver.psycopg3'


def _make_server(**overrides):
    defaults = dict(
        id=1, host='db.owner.com', port=5432, username='owner',
    )
    defaults.update(overrides)
    server = MagicMock()
    for k, v in defaults.items():
        setattr(server, k, v)
    return server


class TestSharedServerPassexec(BaseTestGenerator):
    """Verify shared_server_passexec() resolves a non-owner's own
    PasswordExec and never the owner's."""

    scenarios = [
        ("Non-owner's own passexec_cmd is used",
         dict(test_method='test_nonowner_own_cmd_used')),
        ('No SharedServer row -> None',
         dict(test_method='test_no_shared_server_row')),
        ('SharedServer row with no passexec_cmd -> None',
         dict(test_method='test_shared_server_no_cmd')),
        ("Falls back to owner's server.username when "
         'SharedServer.username is blank',
         dict(test_method='test_username_falls_back_to_server')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    @patch(DRIVER_MODULE + '.current_user')
    @patch(DRIVER_MODULE + '.SharedServer')
    def test_nonowner_own_cmd_used(self, mock_ss_cls, mock_cu):
        from pgadmin.utils.driver.psycopg3 import \
            shared_server_passexec

        mock_cu.id = 200
        shared_server = MagicMock(
            passexec_cmd='/usr/bin/my-own-cmd',
            passexec_expiration=120, username='nonowner')
        mock_ss_cls.query.filter_by.return_value \
            .first.return_value = shared_server

        server = _make_server()
        result = shared_server_passexec(server)

        mock_ss_cls.query.filter_by.assert_called_once_with(
            user_id=200, osid=server.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.cmd, '/usr/bin/my-own-cmd')
        self.assertEqual(result.host, 'db.owner.com')
        self.assertEqual(result.port, 5432)
        self.assertEqual(result.username, 'nonowner')

    @patch(DRIVER_MODULE + '.current_user')
    @patch(DRIVER_MODULE + '.SharedServer')
    def test_no_shared_server_row(self, mock_ss_cls, mock_cu):
        from pgadmin.utils.driver.psycopg3 import \
            shared_server_passexec

        mock_cu.id = 200
        mock_ss_cls.query.filter_by.return_value \
            .first.return_value = None

        self.assertIsNone(shared_server_passexec(_make_server()))

    @patch(DRIVER_MODULE + '.current_user')
    @patch(DRIVER_MODULE + '.SharedServer')
    def test_shared_server_no_cmd(self, mock_ss_cls, mock_cu):
        from pgadmin.utils.driver.psycopg3 import \
            shared_server_passexec

        mock_cu.id = 200
        shared_server = MagicMock(passexec_cmd=None)
        mock_ss_cls.query.filter_by.return_value \
            .first.return_value = shared_server

        self.assertIsNone(shared_server_passexec(_make_server()))

    @patch(DRIVER_MODULE + '.current_user')
    @patch(DRIVER_MODULE + '.SharedServer')
    def test_username_falls_back_to_server(self, mock_ss_cls, mock_cu):
        from pgadmin.utils.driver.psycopg3 import \
            shared_server_passexec

        mock_cu.id = 200
        shared_server = MagicMock(
            passexec_cmd='/usr/bin/my-own-cmd',
            passexec_expiration=None, username=None)
        mock_ss_cls.query.filter_by.return_value \
            .first.return_value = shared_server

        result = shared_server_passexec(_make_server(username='owner'))

        self.assertEqual(result.username, 'owner')
