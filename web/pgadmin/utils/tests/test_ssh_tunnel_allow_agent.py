##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the SSH agent handling in ServerManager.create_ssh_tunnel().

Probing the agent when pgAdmin already has an identity file or a password of
its own produces repeated prompts or denials (#9814), so the agent is disabled
whenever a credential is available. It must stay enabled when none is, because
sshtunnel raises ValueError from _consolidate_auth() if it is left with
nothing at all to authenticate with, and that would be a worse failure than
the one being fixed: ValueError is not a BaseSSHTunnelForwarderError, so it
would escape the handler that turns tunnel failures into a friendly message.
"""

from unittest.mock import MagicMock, patch

import config
from pgadmin.utils.route import BaseTestGenerator

import pgadmin.utils.driver.psycopg3.server_manager as server_manager


class SSHTunnelAllowAgentTestCase(BaseTestGenerator):
    """allow_agent must follow whether a credential is actually present."""

    scenarios = [
        ('Identity file present disables the agent', dict(
            tunnel_authentication=1,
            resolved_identity_file='/tmp/id_rsa',
            stored_password=None,
            expected_allow_agent=False,
        )),
        ('Unusable identity file leaves the agent enabled', dict(
            tunnel_authentication=1,
            resolved_identity_file=None,
            stored_password=None,
            expected_allow_agent=True,
        )),
        ('Tunnel password disables the agent', dict(
            tunnel_authentication=0,
            resolved_identity_file=None,
            stored_password='encrypted',
            expected_allow_agent=False,
        )),
        ('No credential at all leaves the agent enabled', dict(
            tunnel_authentication=0,
            resolved_identity_file=None,
            stored_password=None,
            expected_allow_agent=True,
        )),
        ('A missing credential is reported, not raised', dict(
            tunnel_authentication=0,
            resolved_identity_file=None,
            stored_password=None,
            expected_allow_agent=True,
            forwarder_error=ValueError(
                'No password or public key available!'),
        )),
    ]

    # Overridden per scenario where the forwarder is meant to fail.
    forwarder_error = None

    def setUp(self):
        # Deliberately no server connection: this exercises the argument
        # marshalling in create_ssh_tunnel(), not a real tunnel.
        if not config.SUPPORT_SSH_TUNNEL:
            self.skipTest('SSH tunnelling is disabled in this configuration.')

    def _make_manager(self):
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.tunnel_authentication = self.tunnel_authentication
        manager.tunnel_host = 'tunnel.example.com'
        manager.tunnel_port = 22
        manager.tunnel_username = 'tunneluser'
        manager.tunnel_identity_file = 'id_rsa'
        manager.tunnel_keep_alive = 0
        manager.host = 'db.example.com'
        manager.port = 5432
        manager.tunnel_object = None
        manager.tunnel_created = False
        return manager

    def runTest(self):
        manager = self._make_manager()
        forwarder = MagicMock(side_effect=self.forwarder_error) \
            if self.forwarder_error else MagicMock()

        # A request context, not just an app context: the failure path calls
        # gettext(), and pgAdmin's locale selector reads the request.
        with self.app.test_request_context(), \
            patch.object(server_manager, 'SSHTunnelForwarder', forwarder), \
            patch.object(server_manager, 'User', MagicMock()), \
            patch.object(server_manager, 'current_user', MagicMock()), \
            patch.object(server_manager, 'get_complete_file_path',
                         return_value=self.resolved_identity_file), \
            patch.object(server_manager, 'get_crypt_key',
                         return_value=(True, 'crypt-key')), \
                patch.object(server_manager, 'decrypt',
                             return_value=b'tunnelpassword'):
            success, error = manager.create_ssh_tunnel(self.stored_password)

        forwarder.assert_called_once()
        self.assertEqual(forwarder.call_args.kwargs['allow_agent'],
                         self.expected_allow_agent)

        if self.forwarder_error:
            self.assertFalse(success)
            self.assertIn('Failed to create the SSH tunnel', error)
        else:
            self.assertTrue(success, msg=error)
