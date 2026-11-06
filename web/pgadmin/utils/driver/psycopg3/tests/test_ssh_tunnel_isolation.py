##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Tests that, in server mode, the SSH tunnel never authenticates with the
ambient credentials (~/.ssh keys, ~/.ssh/config, ssh-agent) of the account
pgAdmin runs as. Plain unit tests: nothing connects to an SSH server or to
Postgres.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import paramiko

from pgadmin.utils import fs_short_path
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.driver.psycopg3 import server_manager as sm

SERVER_MODE_KWARGS = dict(
    host_pkey_directories=[],
    ssh_config_file=os.devnull,
    allow_agent=False,
)


class _PureUnitTestSetupMixin:
    """Skip BaseTestGenerator.setUp's Postgres connection."""

    def setUp(self):
        unittest.TestCase.setUp(self)


def _make_manager(auth, identity_file=None):
    manager = sm.ServerManager.__new__(sm.ServerManager)
    manager.host = 'db.internal'
    manager.port = 5432
    manager.tunnel_host = 'bastion'
    manager.tunnel_port = 22
    manager.tunnel_username = 'alice'
    manager.tunnel_authentication = auth
    manager.tunnel_identity_file = identity_file
    manager.tunnel_keep_alive = 0
    manager.tunnel_object = None
    manager.tunnel_created = False
    return manager


def _run(manager, server_mode, runtime=False, resolved=None,
         password=None):
    """Run create_ssh_tunnel with a mocked SSHTunnelForwarder; return
    (result, forwarder mock)."""
    forwarder = MagicMock()
    app = MagicMock()
    app.debug = False
    app.PGADMIN_RUNTIME = runtime
    with patch.object(sm, 'SSHTunnelForwarder', forwarder, create=True), \
            patch.object(sm, 'User'), \
            patch.object(sm, 'current_user'), \
            patch.object(sm, 'current_app', app), \
            patch.object(sm.config, 'SERVER_MODE', server_mode), \
            patch.object(sm, 'get_complete_file_path',
                         return_value=resolved):
        result = manager.create_ssh_tunnel(password)
    return result, forwarder


class TestSSHTunnelServerModeKwargs(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Server mode disables ~/.ssh keys, ~/.ssh/config and the agent for
    both authentication types."""

    scenarios = [('default', dict())]

    def runTest(self):
        cases = (
            (0, None, None),
            (1, 'key', '/storage/alice/key'),
        )
        for auth, name, resolved in cases:
            result, forwarder = _run(
                _make_manager(auth, name), True, resolved=resolved)
            self.assertEqual(result, (True, None))
            forwarder.assert_called_once()
            kwargs = forwarder.call_args.kwargs
            for key, value in SERVER_MODE_KWARGS.items():
                self.assertEqual(kwargs[key], value, (auth, key))
            self.assertIs(kwargs['allow_agent'], False)


class TestSSHTunnelDesktopModeUnchanged(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Desktop mode (and the runtime) keeps sshtunnel's defaults."""

    scenarios = [
        ('desktop', dict(server_mode=False, runtime=False)),
        ('runtime', dict(server_mode=True, runtime=True)),
    ]

    def runTest(self):
        result, forwarder = _run(
            _make_manager(1, 'key'), self.server_mode, self.runtime,
            resolved='/home/alice/key')
        self.assertEqual(result, (True, None))
        kwargs = forwarder.call_args.kwargs
        self.assertNotIn('host_pkey_directories', kwargs)
        self.assertNotIn('ssh_config_file', kwargs)
        self.assertIs(kwargs['allow_agent'], False)

        result, forwarder = _run(_make_manager(0), self.server_mode,
                                 self.runtime)
        kwargs = forwarder.call_args.kwargs
        self.assertNotIn('host_pkey_directories', kwargs)
        self.assertNotIn('ssh_config_file', kwargs)
        # No password configured: the agent stays enabled, as before.
        self.assertIs(kwargs['allow_agent'], True)


class TestSSHTunnelServerModeMissingIdentityFile(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A missing or unset identity file is an error, never a fallback to
    the service account's keys."""

    scenarios = [
        ('missing', dict(name='nokey')),
        ('unset', dict(name=None)),
    ]

    def runTest(self):
        result, forwarder = _run(
            _make_manager(1, self.name), True, resolved=None)
        forwarder.assert_not_called()
        self.assertFalse(result[0])
        self.assertIn('identity file', result[1])
        self.assertNotIn(os.sep + 'storage', result[1])
        if self.name:
            self.assertIn(self.name, result[1])


class TestSSHTunnelIdentityFileConfinement(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """The identity file is resolved by the real get_complete_file_path():
    a path that climbs out of the user's storage directory, is absolute,
    or goes through a symlink to the service account's key is refused and
    never reaches sshtunnel (which would load it through ssh_pkey)."""

    scenarios = [
        ('inside the storage directory', dict(
            name='mykey', refused=False)),
        ('parent directory', dict(name='../outside_key', refused=True)),
        ('deep traversal', dict(
            name='../../../../../../../../' + 'outside_key', refused=True)),
        ('absolute path of a file outside', dict(
            name='@OUTSIDE@', refused=True)),
        ('symlink inside storage to a file outside', dict(
            name='link', refused=True)),
    ]

    def setUp(self):
        super().setUp()
        self.outer = os.path.realpath(tempfile.mkdtemp(prefix='pga_ssh_'))
        self.addCleanup(shutil.rmtree, self.outer, True)
        self.alice = os.path.join(self.outer, 'storage', 'alice')
        os.makedirs(self.alice)
        self.outside = os.path.join(self.outer, 'outside_key')
        for path in (self.outside, os.path.join(self.alice, 'mykey')):
            with open(path, 'w') as f:
                f.write('not a real key')
        os.symlink(self.outside, os.path.join(self.alice, 'link'))

    def runTest(self):
        name = self.name.replace('@OUTSIDE@', self.outside)
        forwarder = MagicMock()
        app = MagicMock()
        app.debug = False
        app.PGADMIN_RUNTIME = False
        manager = _make_manager(1, name)
        with self.app.test_request_context(), \
                patch.dict(self.app.config, {'SERVER_MODE': True}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch('pgadmin.utils.get_storage_directory',
                      return_value=self.alice), \
                patch.object(sm, 'SSHTunnelForwarder', forwarder,
                             create=True), \
                patch.object(sm, 'User'), \
                patch.object(sm, 'current_user'), \
                patch.object(sm, 'current_app', app), \
                patch.object(sm.config, 'SERVER_MODE', True):
            result = manager.create_ssh_tunnel(None)

        if self.refused:
            forwarder.assert_not_called()
            self.assertFalse(result[0])
            # The message names the file as the user typed it, never the
            # resolved storage directory.
            self.assertNotIn(self.alice, result[1])
        else:
            self.assertEqual(result, (True, None))
            # get_complete_file_path() returns the short (8.3) form with
            # forward slashes on Windows, unchanged on POSIX.
            self.assertEqual(
                forwarder.call_args.kwargs['ssh_pkey'],
                fs_short_path(
                    os.path.join(self.alice, 'mykey')).replace('\\', '/'))


class TestSSHTunnelRealSSHTunnelForwarder(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Use the real sshtunnel (constructing the forwarder does not
    connect) with a fake service-account HOME."""

    scenarios = [('default', dict())]

    def setUp(self):
        super().setUp()
        self.home = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.home, True)
        ssh_dir = os.path.join(self.home, '.ssh')
        os.makedirs(ssh_dir)
        paramiko.RSAKey.generate(2048).write_private_key_file(
            os.path.join(ssh_dir, 'id_rsa'))
        with open(os.path.join(ssh_dir, 'config'), 'w') as f:
            f.write('Host bastion\n  User deploy\n'
                    '  IdentityFile ~/.ssh/id_rsa\n')

    def _build(self, **kwargs):
        from sshtunnel import SSHTunnelForwarder
        with patch.dict(os.environ, {'HOME': self.home,
                                     'USERPROFILE': self.home}):
            kw = dict(kwargs)
            if 'ssh_config_file' not in kw:
                # sshtunnel's default is bound at import time, so name the
                # file of the fake account explicitly.
                kw['ssh_config_file'] = os.path.join(
                    self.home, '.ssh', 'config')
            return SSHTunnelForwarder(
                ('bastion', 22), ssh_username='alice', ssh_password='x',
                remote_bind_address=('127.0.0.1', 5432), **kw)

    def runTest(self):
        # Old behaviour: the service account's key and ssh config apply.
        old = self._build(allow_agent=False)
        self.assertGreaterEqual(len(old.ssh_pkeys), 1)

        # Server mode: nothing from the service account is loaded.
        new = self._build(**SERVER_MODE_KWARGS)
        self.assertEqual(new.ssh_pkeys, [])
        self.assertEqual(new.ssh_username, 'alice')
        self.assertEqual(new.ssh_password, 'x')
        self.assertEqual(new.ssh_host, 'bastion')

        # And with no credential at all it fails cleanly.
        from sshtunnel import SSHTunnelForwarder
        with patch.dict(os.environ, {'HOME': self.home,
                                     'USERPROFILE': self.home}), \
                self.assertRaises(ValueError):
            SSHTunnelForwarder(
                ('bastion', 22), ssh_username='alice',
                ssh_pkey=os.path.join(self.home, 'missing'),
                remote_bind_address=('127.0.0.1', 5432),
                **SERVER_MODE_KWARGS)
