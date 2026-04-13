##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for shared server isolation logic using mocks.

These tests verify the security-critical merge, suppression, and
sanitization logic without requiring a running PostgreSQL server
or HTTP infrastructure.
"""

from unittest.mock import MagicMock, patch, call
from pgadmin.utils.route import BaseTestGenerator

SRV_MODULE = 'pgadmin.browser.server_groups.servers'


def _make_server(**overrides):
    """Create a mock Server object with sensible defaults."""
    defaults = dict(
        id=1, user_id=100, name='OwnerServer',
        shared=True, host='db.owner.com', port=5432,
        maintenance_db='postgres', username='owner',
        password=b'enc_owner_pass', role=None,
        bgcolor=None, fgcolor=None, service=None,
        use_ssh_tunnel=0, tunnel_host=None,
        tunnel_port=5522, tunnel_authentication=0,
        tunnel_username=None, tunnel_password=None,
        tunnel_identity_file=None,
        tunnel_prompt_password=0, tunnel_keep_alive=30,
        save_password=1, servergroup_id=1,
        server_owner='owner_user', prepare_threshold=5,
        passexec_cmd='/usr/bin/vault-get-secret',
        passexec_expiration=300,
        post_connection_sql='SET role admin;',
        connection_params={
            'sslmode': 'verify-full',
            'sslcert': '/home/owner/.ssl/cert.pem',
            'sslkey': '/home/owner/.ssl/key.pem',
            'sslrootcert': '/home/owner/.ssl/ca.pem',
            'sslcrl': '/home/owner/.ssl/crl.pem',
            'sslcrldir': '/home/owner/.ssl/crl.d',
            'passfile': '/home/owner/.pgpass',
            'connect_timeout': '10',
        },
        discovery_id=None, db_res=None, db_res_type=None,
        kerberos_conn=False, cloud_status=0,
        shared_username='shared_user', tags=None,
        is_adhoc=0,
    )
    defaults.update(overrides)
    server = MagicMock()
    for k, v in defaults.items():
        setattr(server, k, v)
    return server


def _make_shared_server(**overrides):
    """Create a mock SharedServer object."""
    defaults = dict(
        id=10, osid=1, user_id=200,
        server_owner='owner_user', servergroup_id=2,
        name='MySharedView', host='db.owner.com',
        port=5432, maintenance_db='postgres',
        username='nonowner', password=b'enc_nonowner',
        save_password=0, role='readonly',
        bgcolor='#ff0000', fgcolor='#ffffff',
        service='my_pg_service',
        use_ssh_tunnel=1, tunnel_host='bastion.local',
        tunnel_port=2222, tunnel_authentication=1,
        tunnel_username='tunneluser',
        tunnel_password=b'enc_tunnel',
        tunnel_identity_file='/home/user/.ssh/id_rsa',
        tunnel_prompt_password=0,
        tunnel_keep_alive=60, shared=True,
        prepare_threshold=10,
        connection_params={
            'sslmode': 'verify-full',
            'sslcert': '/home/nonowner/.ssl/cert.pem',
            'connect_timeout': '10',
        },
        passexec_cmd=None,
        passexec_expiration=None,
        kerberos_conn=False,
        tags=None,
        post_connection_sql=None,
    )
    defaults.update(overrides)
    ss = MagicMock()
    for k, v in defaults.items():
        setattr(ss, k, v)
    return ss


class TestGetSharedServerProperties(BaseTestGenerator):
    """Unit tests for ServerModule.get_shared_server_properties()
    using mock objects."""

    scenarios = [
        ('Merge overlays passexec_cmd from SharedServer',
         dict(test_method='test_overlays_passexec')),
        ('Merge overlays post_connection_sql from SharedServer',
         dict(test_method='test_overlays_post_sql')),
        ('Merge overlays kerberos_conn and tags',
         dict(test_method='test_overlays_kerberos_tags')),
        ('Merge strips owner SSL paths not in SharedServer',
         dict(test_method='test_strips_owner_ssl_paths')),
        ('Merge applies SharedServer SSL paths',
         dict(test_method='test_applies_ss_ssl_paths')),
        ('Merge overrides service from SharedServer',
         dict(test_method='test_overrides_service')),
        ('Merge overrides tunnel fields',
         dict(test_method='test_overrides_tunnel')),
        ('Merge handles None connection_params',
         dict(test_method='test_none_conn_params')),
        ('Merge returns server unchanged when sharedserver is None',
         dict(test_method='test_null_guard')),
    ]

    @patch('pgadmin.browser.server_groups.servers.'
           'object_session', return_value=None)
    def runTest(self, mock_sess):
        getattr(self, self.test_method)()

    def _merge(self, server=None, ss=None):
        from pgadmin.browser.server_groups.servers import \
            ServerModule
        if server is None:
            server = _make_server()
        if ss is None:
            ss = _make_shared_server()
        return ServerModule.get_shared_server_properties(
            server, ss)

    def test_overlays_passexec(self):
        # SharedServer defaults have None - overlay copies that.
        result = self._merge()
        self.assertIsNone(result.passexec_cmd)
        self.assertIsNone(result.passexec_expiration)
        # If SharedServer has a value, it should appear.
        ss = _make_shared_server(
            passexec_cmd='/usr/bin/get-pw',
            passexec_expiration=120)
        result = self._merge(ss=ss)
        self.assertEqual(result.passexec_cmd, '/usr/bin/get-pw')
        self.assertEqual(result.passexec_expiration, 120)

    def test_overlays_post_sql(self):
        # SharedServer defaults have None - overlay copies that.
        result = self._merge()
        self.assertIsNone(result.post_connection_sql)
        # If SharedServer has a value, it should appear.
        ss = _make_shared_server(
            post_connection_sql='SET role reader;')
        result = self._merge(ss=ss)
        self.assertEqual(
            result.post_connection_sql, 'SET role reader;')

    def test_overlays_kerberos_tags(self):
        result = self._merge()
        self.assertFalse(result.kerberos_conn)
        self.assertIsNone(result.tags)
        # With values set on SharedServer
        ss = _make_shared_server(
            kerberos_conn=True,
            tags=[{'text': 'prod', 'color': '#f00'}])
        result = self._merge(ss=ss)
        self.assertTrue(result.kerberos_conn)
        self.assertEqual(len(result.tags), 1)

    def test_strips_owner_ssl_paths(self):
        result = self._merge()
        cp = result.connection_params
        # Owner had sslkey, sslrootcert, sslcrl, sslcrldir,
        # passfile — SharedServer did not — should be removed.
        self.assertNotIn('sslkey', cp)
        self.assertNotIn('sslcrl', cp)
        self.assertNotIn('sslcrldir', cp)
        self.assertNotIn('sslrootcert', cp)
        self.assertNotIn('passfile', cp)

    def test_applies_ss_ssl_paths(self):
        result = self._merge()
        cp = result.connection_params
        # SharedServer had sslcert -- should override.
        self.assertEqual(
            cp['sslcert'],
            '/home/nonowner/.ssl/cert.pem')
        # Non-sensitive params preserved from owner.
        self.assertEqual(cp['sslmode'], 'verify-full')
        self.assertEqual(cp['connect_timeout'], '10')

    def test_overrides_service(self):
        result = self._merge()
        self.assertEqual(result.service, 'my_pg_service')

    def test_overrides_tunnel(self):
        result = self._merge()
        self.assertEqual(result.tunnel_host, 'bastion.local')
        self.assertEqual(result.tunnel_port, 2222)
        self.assertEqual(result.tunnel_username, 'tunneluser')
        self.assertEqual(result.tunnel_authentication, 1)
        self.assertEqual(
            result.tunnel_identity_file,
            '/home/user/.ssh/id_rsa')

    def test_none_conn_params(self):
        server = _make_server(connection_params=None)
        ss = _make_shared_server(connection_params=None)
        result = self._merge(server, ss)
        # Should not crash; connection_params becomes {}
        self.assertEqual(result.connection_params, {})

    def test_null_guard(self):
        from pgadmin.browser.server_groups.servers import \
            ServerModule
        server = _make_server()
        # Call directly to bypass _merge's None replacement
        result = ServerModule.get_shared_server_properties(
            server, None)
        # Should return server unchanged
        self.assertEqual(result.name, 'OwnerServer')
        self.assertEqual(result.passexec_cmd,
                         '/usr/bin/vault-get-secret')


class TestCreateSharedServerSanitization(BaseTestGenerator):
    """Verify create_shared_server() strips sensitive
    connection_params keys."""

    scenarios = [
        ('Sanitizes connection_params on creation',
         dict(test_method='test_sanitizes_conn_params')),
        ('Copies tunnel_port from owner',
         dict(test_method='test_copies_tunnel_port')),
        ('Copies tunnel_keep_alive from owner',
         dict(test_method='test_copies_tunnel_keep_alive')),
        ('Handles None connection_params',
         dict(test_method='test_none_conn_params')),
    ]

    @patch('pgadmin.browser.server_groups.servers.db')
    @patch('pgadmin.browser.server_groups.servers.User')
    @patch('pgadmin.browser.server_groups.servers.current_user')
    @patch('pgadmin.browser.server_groups.servers.SharedServer')
    def runTest(self, mock_ss_cls, mock_cu, mock_user,
                mock_db):
        mock_cu.id = 200
        mock_user.query.filter_by.return_value \
            .first.return_value = MagicMock(username='owner')
        # Capture the SharedServer() constructor call
        self.captured_kwargs = {}

        def capture_init(**kwargs):
            self.captured_kwargs = kwargs
            return MagicMock()

        mock_ss_cls.side_effect = capture_init
        getattr(self, self.test_method)()

    def _create(self, server=None):
        from pgadmin.browser.server_groups.servers import \
            ServerModule
        if server is None:
            server = _make_server()
        ServerModule.create_shared_server(server, 1)

    def test_sanitizes_conn_params(self):
        self._create()
        cp = self.captured_kwargs.get('connection_params', {})
        # Sensitive keys must be stripped
        for key in ('sslcert', 'sslkey', 'sslrootcert',
                    'sslcrl', 'sslcrldir', 'passfile'):
            self.assertNotIn(
                key, cp,
                'Sensitive key "{0}" should be stripped '
                'on SharedServer creation'.format(key))
        # Non-sensitive keys preserved
        self.assertEqual(cp.get('sslmode'), 'verify-full')
        self.assertEqual(cp.get('connect_timeout'), '10')

    def test_copies_tunnel_port(self):
        server = _make_server(tunnel_port=2222)
        self._create(server)
        self.assertEqual(
            self.captured_kwargs.get('tunnel_port'), 2222)

    def test_copies_tunnel_keep_alive(self):
        server = _make_server(tunnel_keep_alive=45)
        self._create(server)
        self.assertEqual(
            self.captured_kwargs.get('tunnel_keep_alive'), 45)

    def test_none_conn_params(self):
        server = _make_server(connection_params=None)
        self._create(server)
        cp = self.captured_kwargs.get('connection_params', {})
        self.assertEqual(cp, {})


class TestMergeExpungesServer(BaseTestGenerator):
    """Verify get_shared_server_properties() expunges the server
    from the SQLAlchemy session before mutation."""

    scenarios = [
        ('Expunge called when server is in session',
         dict(test_method='test_expunge_called')),
        ('No crash when server not in session',
         dict(test_method='test_no_session')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def test_expunge_called(self):
        from pgadmin.browser.server_groups.servers import \
            ServerModule
        server = _make_server()
        ss = _make_shared_server()
        mock_session = MagicMock()
        with patch(SRV_MODULE + '.object_session',
                   return_value=mock_session):
            ServerModule.get_shared_server_properties(
                server, ss)
        mock_session.expunge.assert_called_once_with(server)

    def test_no_session(self):
        from pgadmin.browser.server_groups.servers import \
            ServerModule
        server = _make_server()
        ss = _make_shared_server()
        with patch(SRV_MODULE + '.object_session',
                   return_value=None):
            # Should not crash
            result = ServerModule.get_shared_server_properties(
                server, ss)
        # SharedServer defaults passexec_cmd to None
        self.assertIsNone(result.passexec_cmd)


class TestUpdateConnectionParameter(BaseTestGenerator):
    """Verify update_connection_parameter() routes changes
    to SharedServer for non-owners."""

    scenarios = [
        ('Non-owner changes go to SharedServer copy',
         dict(test_method='test_nonowner_routing')),
        ('Owner changes go to Server directly',
         dict(test_method='test_owner_routing')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    @patch(SRV_MODULE + '.current_user')
    def test_nonowner_routing(self, mock_cu):
        mock_cu.id = 200  # Non-owner
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server(
            connection_params={'sslmode': 'require'})
        ss = _make_shared_server(
            connection_params={'sslmode': 'require'})

        data = {'connection_params': {
            'changed': [{'name': 'sslmode', 'value': 'verify'}]
        }}

        node = ServerNode.__new__(ServerNode)
        node.update_connection_parameter(data, server, ss)

        # The result should be in data, not mutating server
        self.assertEqual(
            data['connection_params']['sslmode'], 'verify')
        # Owner's server should NOT be mutated
        self.assertEqual(
            server.connection_params['sslmode'], 'require')

    @patch(SRV_MODULE + '.current_user')
    def test_owner_routing(self, mock_cu):
        mock_cu.id = 100  # Owner
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server(
            connection_params={'sslmode': 'require'})

        data = {'connection_params': {
            'changed': [{'name': 'sslmode', 'value': 'verify'}]
        }}

        node = ServerNode.__new__(ServerNode)
        node.update_connection_parameter(data, server, None)

        # Owner path mutates server directly
        self.assertEqual(
            data['connection_params']['sslmode'], 'verify')


class TestUpdateServerDetails(BaseTestGenerator):
    """Verify _update_server_details routes writes to
    SharedServer for non-owners."""

    scenarios = [
        ('Non-owner write goes to SharedServer',
         dict(test_method='test_nonowner_write')),
        ('Owner write goes to Server',
         dict(test_method='test_owner_write')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    @patch(SRV_MODULE + '.current_user')
    def test_nonowner_write(self, mock_cu):
        mock_cu.id = 200
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server()
        ss = _make_shared_server()
        config_map = {'name': 'name'}

        ServerNode._update_server_details(
            server, ss, config_map, 'name', 'NewName')

        self.assertEqual(ss.name, 'NewName')
        # Server should not be modified
        self.assertEqual(server.name, 'OwnerServer')

    @patch(SRV_MODULE + '.current_user')
    def test_owner_write(self, mock_cu):
        mock_cu.id = 100
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server()
        config_map = {'name': 'name'}

        ServerNode._update_server_details(
            server, None, config_map, 'name', 'NewName')

        self.assertEqual(server.name, 'NewName')


class TestDeleteSharedServerOwnerGuard(BaseTestGenerator):
    """Verify that only the owner can trigger
    delete_shared_server via _set_valid_attr_value."""

    scenarios = [
        ('Non-owner shared=false does not delete',
         dict(test_method='test_nonowner_no_delete')),
        ('Owner shared=false triggers delete',
         dict(test_method='test_owner_deletes')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    @patch(SRV_MODULE + '.get_crypt_key',
           return_value=(True, b'key'))
    @patch(SRV_MODULE + '.current_user')
    def test_nonowner_no_delete(self, mock_cu, mock_ck):
        mock_cu.id = 200
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server()
        ss = _make_shared_server()
        node = ServerNode.__new__(ServerNode)
        node.delete_shared_server = MagicMock()

        data = {'shared': False}
        config_map = {'shared': 'shared'}

        node._set_valid_attr_value(
            1, data, config_map, server, ss)

        node.delete_shared_server.assert_not_called()

    @patch(SRV_MODULE + '.get_crypt_key',
           return_value=(True, b'key'))
    @patch(SRV_MODULE + '.current_user')
    def test_owner_deletes(self, mock_cu, mock_ck):
        mock_cu.id = 100  # Owner
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server()
        node = ServerNode.__new__(ServerNode)
        node.delete_shared_server = MagicMock()

        data = {'shared': False}
        config_map = {'shared': 'shared'}

        node._set_valid_attr_value(
            1, data, config_map, server, None)

        node.delete_shared_server.assert_called_once_with(
            1, server.id)


class TestOwnerOnlyFieldsGuard(BaseTestGenerator):
    """Verify _set_valid_attr_value skips owner-only fields
    for non-owners."""

    scenarios = [
        ('Non-owner cannot set passexec_cmd',
         dict(test_method='test_nonowner_passexec_blocked')),
        ('Non-owner cannot set db_res or db_res_type',
         dict(test_method='test_nonowner_db_res_blocked')),
        ('Owner can set passexec_cmd',
         dict(test_method='test_owner_passexec_allowed')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    @patch(SRV_MODULE + '.get_crypt_key',
           return_value=(True, b'key'))
    @patch(SRV_MODULE + '.current_user')
    def test_nonowner_passexec_blocked(self, mock_cu, mock_ck):
        mock_cu.id = 200  # Non-owner
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server()
        ss = _make_shared_server()
        node = ServerNode.__new__(ServerNode)
        node.delete_shared_server = MagicMock()

        data = {
            'passexec_cmd': '/evil/cmd',
            'post_connection_sql': 'SET role reader;',
        }
        config_map = {
            'passexec_cmd': 'passexec_cmd',
            'post_connection_sql': 'post_connection_sql',
        }

        node._set_valid_attr_value(
            1, data, config_map, server, ss)

        # passexec_cmd should be blocked for non-owners
        self.assertIsNone(ss.passexec_cmd)
        # post_connection_sql is allowed for non-owners
        self.assertEqual(ss.post_connection_sql,
                         'SET role reader;')

    @patch(SRV_MODULE + '.get_crypt_key',
           return_value=(True, b'key'))
    @patch(SRV_MODULE + '.current_user')
    def test_nonowner_db_res_blocked(self, mock_cu, mock_ck):
        mock_cu.id = 200  # Non-owner
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server()
        ss = _make_shared_server()
        node = ServerNode.__new__(ServerNode)
        node.delete_shared_server = MagicMock()

        data = {
            'db_res': 'secret_db',
            'db_res_type': 'databases',
        }
        config_map = {
            'db_res': 'db_res',
            'db_res_type': 'db_res_type',
        }

        node._set_valid_attr_value(
            1, data, config_map, server, ss)

        # Neither server nor sharedserver should be modified
        self.assertIsNone(server.db_res)
        self.assertIsNone(server.db_res_type)

    @patch(SRV_MODULE + '.get_crypt_key',
           return_value=(True, b'key'))
    @patch(SRV_MODULE + '.current_user')
    def test_owner_passexec_allowed(self, mock_cu, mock_ck):
        mock_cu.id = 100  # Owner
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server()
        node = ServerNode.__new__(ServerNode)
        node.delete_shared_server = MagicMock()

        data = {
            'passexec_cmd': '/usr/bin/new-cmd',
            'post_connection_sql': 'SET role dba;',
        }
        config_map = {
            'passexec_cmd': 'passexec_cmd',
            'post_connection_sql': 'post_connection_sql',
        }

        node._set_valid_attr_value(
            1, data, config_map, server, None)

        # Owner should have these set
        self.assertEqual(server.passexec_cmd, '/usr/bin/new-cmd')
        self.assertEqual(
            server.post_connection_sql, 'SET role dba;')


class TestUpdateTagsBase(BaseTestGenerator):
    """Verify update_tags reads from the correct base object."""

    scenarios = [
        ('Non-owner tag delta uses sharedserver tags',
         dict(test_method='test_nonowner_tags_base')),
        ('Owner tag delta uses server tags',
         dict(test_method='test_owner_tags_base')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def test_nonowner_tags_base(self):
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server(
            tags=[{'text': 'owner-tag', 'color': '#000'}])
        ss = _make_shared_server(
            tags=[{'text': 'my-tag', 'color': '#f00'}])

        data = {'tags': {
            'deleted': [{'old_text': 'my-tag'}],
        }}

        # Non-owner: should delete from sharedserver's tags,
        # not from server's (owner's) tags.
        ServerNode.update_tags(data, ss)

        # sharedserver had 'my-tag' which was deleted → empty
        self.assertEqual(data['tags'], [])

    def test_owner_tags_base(self):
        from pgadmin.browser.server_groups.servers import \
            ServerNode

        server = _make_server(
            tags=[{'text': 'owner-tag', 'color': '#000'}])

        data = {'tags': {
            'added': [{'text': 'new-tag', 'color': '#0f0'}],
        }}

        ServerNode.update_tags(data, server)

        # owner had 'owner-tag', added 'new-tag' → 2 tags
        self.assertEqual(len(data['tags']), 2)
        texts = {t['text'] for t in data['tags']}
        self.assertIn('owner-tag', texts)
        self.assertIn('new-tag', texts)


class TestGetSharedServerRaisesOnNone(BaseTestGenerator):
    """Verify get_shared_server() raises if SharedServer
    cannot be created."""

    scenarios = [
        ('Raises when SharedServer is None after create',
         dict(test_method='test_raises_on_none')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    @patch(SRV_MODULE + '.SharedServer')
    @patch(SRV_MODULE + '.current_user')
    def test_raises_on_none(self, mock_cu, mock_ss):
        mock_cu.id = 200
        # Both queries return None
        mock_ss.query.filter_by.return_value \
            .first.return_value = None

        from pgadmin.browser.server_groups.servers import \
            ServerModule

        server = _make_server()

        with patch.object(ServerModule, 'create_shared_server'):
            with self.assertRaises(Exception) as ctx:
                ServerModule.get_shared_server(server, 1)

        self.assertIn(
            'Failed to create shared server',
            str(ctx.exception))
