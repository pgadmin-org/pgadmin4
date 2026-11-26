##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""An access token only goes to a destination the user chose, over a
protected connection: the entra method refuses a Unix-domain socket, a
utility keeps verify-full whatever a service file says, a connected server
keeps its server authentication method, and a non-owner's token method is
revoked when the owner of a shared server changes its endpoint."""

import unittest
from unittest.mock import MagicMock, patch

from flask import Flask
from flask_babel import Babel
from psycopg.conninfo import conninfo_to_dict

from pgadmin.utils import utility_conninfo
from pgadmin.utils.auth_method import AUTH_METHOD_ENTRA, \
    AUTH_METHOD_PASSWORD, check_entra_ssl, is_entra_destination_valid, \
    is_unix_socket_host
from pgadmin.utils.route import BaseTestGenerator

VERIFY_FULL = {'sslmode': 'verify-full'}


class _AppMixin:
    def setUp(self):
        # No database is needed.
        unittest.TestCase.setUp(self)
        self.app = Flask(__name__)
        self.app.config.update(SECRET_KEY='unit-test', TESTING=True,
                               SERVER_MODE=True)
        Babel(self.app)


class EntraDestinationTestCase(_AppMixin, BaseTestGenerator):
    """Every destination libpq may try must be TCP."""

    scenarios = [
        ('A TCP host', dict(host='db.example.com', params={}, valid=True)),
        ('A private endpoint', dict(
            host='pg.privatelink.postgres.database.azure.com', params={},
            valid=True)),
        ('An IP address', dict(host='10.0.0.4', params={}, valid=True)),
        ('A hostaddr with a socket host', dict(
            host='/tmp', params={'hostaddr': '10.0.0.4'}, valid=True)),
        ('A list of TCP hosts', dict(
            host='a.example.com,b.example.com', params={}, valid=True)),
        ('No host at all', dict(host=None, params={}, valid=False)),
        ('A blank host', dict(host='  ', params={}, valid=False)),
        ('A socket directory', dict(
            host='/var/run/postgresql', params={}, valid=False)),
        ('An abstract socket', dict(host='@pg', params={}, valid=False)),
        ('A Windows socket directory', dict(
            host='C:\\pgsock', params={}, valid=False)),
        ('A socket in a host list', dict(
            host='db.example.com,/tmp', params={}, valid=False)),
        ('A socket host connection parameter', dict(
            host='db.example.com', params={'host': '/tmp'}, valid=False)),
        ('A blank host connection parameter', dict(
            host='db.example.com', params={'host': ''}, valid=False)),
        ('A whitespace host connection parameter', dict(
            host='db.example.com', params={'host': '  '}, valid=False)),
        ('A null host connection parameter', dict(
            host='db.example.com', params={'host': None}, valid=False)),
        ('An empty entry in a hostaddr list', dict(
            host='/tmp', params={'hostaddr': '10.0.0.4,'}, valid=False)),
    ]

    def runTest(self):
        self.assertEqual(
            is_entra_destination_valid(self.params, self.host), self.valid)

        with self.app.app_context():
            err = check_entra_ssl(
                AUTH_METHOD_ENTRA, dict(self.params, **VERIFY_FULL),
                self.host)
        if self.valid:
            self.assertIsNone(err)
        else:
            self.assertIn('TCP', err)


class HostOverrideConninfoTestCase(_AppMixin, BaseTestGenerator):
    """A host connection parameter that is present replaces the server's
    host in the connection string, so the check refuses whatever libpq
    would then fall back to."""

    scenarios = [
        ('A null host connection parameter', dict(override=None)),
        ('A blank host connection parameter', dict(override='')),
    ]

    def runTest(self):
        from pgadmin.utils.driver.psycopg3.server_manager import \
            ServerManager
        manager = ServerManager.__new__(ServerManager)
        manager.host = 'db.example.com'
        manager.port = 5432
        manager.use_ssh_tunnel = False
        manager.service = None
        manager.connection_params = dict(VERIFY_FULL, host=self.override)

        with self.app.test_request_context('/'):
            conninfo = conninfo_to_dict(
                manager.create_connection_string('postgres', 'alice'))

        # No TCP host reaches libpq, and the check agrees.
        self.assertFalse(conninfo.get('host'))
        self.assertFalse(is_entra_destination_valid(
            manager.connection_params, manager.host))


class EntraCheckTestCase(_AppMixin, BaseTestGenerator):
    """A TCP destination still needs verify-full; other methods are not
    checked."""

    def runTest(self):
        with self.app.app_context():
            self.assertIn('verify-full', check_entra_ssl(
                AUTH_METHOD_ENTRA, {'sslmode': 'require'}, 'db.example.com'))
            self.assertIsNone(check_entra_ssl(
                AUTH_METHOD_PASSWORD, {}, '/tmp'))
        self.assertFalse(is_unix_socket_host('db.example.com'))
        self.assertFalse(is_unix_socket_host('c'))


class UtilityConninfoVerifyFullTestCase(_AppMixin, BaseTestGenerator):
    """verify-full goes in the utility's connection string, which outranks a
    service file entry; other modes stay in the environment only."""

    scenarios = [
        ('verify-full', dict(params=VERIFY_FULL, expected='verify-full')),
        ('require', dict(params={'sslmode': 'require'}, expected=None)),
        ('None', dict(params=None, expected=None)),
    ]

    def runTest(self):
        with self.app.app_context():
            conninfo = conninfo_to_dict(utility_conninfo('db', self.params))
        self.assertEqual(conninfo.get('sslmode'), self.expected)
        self.assertEqual(conninfo['dbname'], 'db')


class ConnectedAuthMethodTestCase(_AppMixin, BaseTestGenerator):
    """The server authentication method cannot change while connected."""

    scenarios = [
        ('Connected', dict(connected=True, refused=True)),
        ('Not connected', dict(connected=False, refused=False)),
    ]

    def runTest(self):
        from pgadmin.browser.server_groups.servers import ServerNode
        node = ServerNode.__new__(ServerNode)
        disp_lbl = {'auth_method': 'Authentication method'}

        with self.app.test_request_context('/'):
            response = node._server_modify_disallowed_when_connected(
                self.connected, {'auth_method': 'oauth_direct'}, disp_lbl)

        if self.refused:
            self.assertEqual(response.status_code, 403)
            self.assertIn(b'Authentication method', response.data)
        else:
            self.assertIsNone(response)


class RevokeSharedTokenAuthTestCase(_AppMixin, BaseTestGenerator):
    """An owner's change of endpoint turns non-owners' token methods back
    to password; anything else, including an endpoint sent again with the
    same values, leaves them alone."""

    scenarios = [
        ('Host changed', dict(shared=True, data={'host': 'new'},
                              revoked=True)),
        ('Port changed', dict(shared=True, data={'port': 6432},
                              revoked=True)),
        ('Connection parameters changed', dict(
            shared=True, data={'connection_params': {}}, revoked=True)),
        ('Endpoint sent unchanged', dict(
            shared=True, revoked=False,
            data={'host': 'old', 'port': 5432,
                  'connection_params': {'sslmode': 'verify-full'}})),
        ('Unrelated change', dict(shared=True, data={'comment': 'x'},
                                  revoked=False)),
        ('Not shared', dict(shared=False, data={'host': 'new'},
                            revoked=False)),
    ]

    def runTest(self):
        from pgadmin.browser.server_groups import servers
        server = MagicMock(id=7, shared=self.shared, host='old', port=5432,
                           connection_params={'sslmode': 'verify-full'})
        endpoint_before = servers.ServerNode._endpoint_of(server)
        for key, value in self.data.items():
            setattr(server, key, value)

        with patch.object(servers, 'SharedServer') as shared_server:
            servers.ServerNode._revoke_shared_token_auth(
                server, endpoint_before)

        query = shared_server.query.filter.return_value
        if self.revoked:
            query.update.assert_called_once_with(
                {'auth_method': AUTH_METHOD_PASSWORD},
                synchronize_session=False)
        else:
            shared_server.query.filter.assert_not_called()
