##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that get_complete_file_path() keeps a path inside the storage
directory in server mode.

The path is the user's to choose, and it is what libpq is given as the
password file, SSL key and so on, so a path that climbs out of the user's
storage directory would let them connect with another user's credentials.
"""

import os
import shutil
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import flask

import config
from pgadmin.utils import (
    connection_params_to_env, fs_short_path, get_complete_file_path)
from pgadmin.utils.route import BaseTestGenerator

import pgadmin.utils.driver.psycopg3.server_manager as server_manager


def _canon(path):
    """Compare paths as get_complete_file_path() returns them: on Windows the
    short (8.3) form libpq is given, so an expected long path matches;
    fs_short_path() is the identity on POSIX."""
    return os.path.normpath(fs_short_path(path))


class _StorageMixin:
    """Builds a storage root holding two users and a shared directory."""

    def setUp(self):
        # Filesystem-only tests: skip BaseTestGenerator's server setup.
        unittest.TestCase.setUp(self)
        self.outer = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_complete_path_'))
        self.alice = os.path.join(self.outer, 'storage', 'alice')
        self.bob = os.path.join(self.outer, 'storage', 'bob')
        self.shared = os.path.join(self.outer, 'shared')
        for d in (self.alice, self.bob, self.shared):
            os.makedirs(d)
        os.makedirs(os.path.join(self.alice, 'sub'))
        for d in (self.alice, self.bob, self.shared):
            with open(os.path.join(d, '.pgpass'), 'w') as f:
                f.write('*:*:*:*:secret\n')
        self.shared_storage = [{'name': 'Team', 'path': self.shared,
                                'restricted_access': False}]

    def tearDown(self):
        shutil.rmtree(self.outer, ignore_errors=True)

    def _storage_dir(self, user=None, shared_storage=''):
        if shared_storage:
            for sdir in self.shared_storage:
                if sdir['name'] == shared_storage:
                    return sdir['path']
            return None
        return self.alice

    def _resolve(self, path, validate=True, server_mode=True):
        with self.app.test_request_context(), \
                patch.dict(self.app.config, {'SERVER_MODE': server_mode}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch.object(config, 'SERVER_MODE', True), \
                patch.object(config, 'SHARED_STORAGE', self.shared_storage), \
                patch('pgadmin.utils.get_storage_directory',
                      side_effect=self._storage_dir):
            return get_complete_file_path(path, validate=validate)


class CompleteFilePathContainmentTestCase(_StorageMixin, BaseTestGenerator):
    """Paths that stay inside the storage directory resolve; any that
    escape it are refused rather than resolved or silently dropped."""

    scenarios = [
        ('A file in the user\'s own storage resolves',
         dict(path='/.pgpass', expected='storage/alice/.pgpass')),
        ('A leading slash is relative to the storage directory',
         dict(path='.pgpass', expected='storage/alice/.pgpass')),
        ('A missing file in the user\'s own storage is None',
         dict(path='/missing', expected=None)),
        ('A missing file resolves when not validated',
         dict(path='/missing', validate=False,
              expected='storage/alice/missing')),
        ('".." inside the storage directory is harmless',
         dict(path='/sub/../.pgpass', expected='storage/alice/.pgpass')),
        ('A file in the named shared storage resolves',
         dict(path='Team:/.pgpass', expected='shared/.pgpass')),
        ('Another user\'s file is refused',
         dict(path='../bob/.pgpass', denied=True)),
        ('Another user\'s file is refused with a leading slash',
         dict(path='/../bob/.pgpass', denied=True)),
        ('Another user\'s missing file is refused, not None',
         dict(path='../bob/missing', denied=True)),
        ('Another user\'s file is refused even unvalidated',
         dict(path='../bob/.pgpass', validate=False, denied=True)),
        ('Climbing out of shared storage is refused',
         dict(path='Team:/../storage/bob/.pgpass', denied=True)),
        ('A drive name not at the start of the path is refused',
         dict(path='x/Team:/.pgpass', denied=True)),
        ('A symbolic link out of the storage directory is refused',
         dict(path='/link-to-bob/.pgpass', link=('link-to-bob', 'bob'),
              denied=True)),
        ('A symbolic link within the storage directory resolves',
         dict(path='/link-to-sub/f', link=('link-to-sub', 'alice/sub'),
              expected='storage/alice/link-to-sub/f')),
    ]

    validate = True
    denied = False
    link = None

    def runTest(self):
        if self.link:
            if not hasattr(os, 'symlink'):
                self.skipTest('Symbolic links are not supported here.')
            name, target = self.link
            target = os.path.join(self.outer, 'storage', target)
            os.makedirs(target, exist_ok=True)
            with open(os.path.join(target, 'f'), 'w') as f:
                f.write('x')
            os.symlink(target, os.path.join(self.alice, name))

        if self.denied:
            with self.assertRaises(PermissionError):
                self._resolve(self.path, validate=self.validate)
            return

        result = self._resolve(self.path, validate=self.validate)
        if self.expected is None:
            self.assertIsNone(result)
        else:
            # Expected paths are given relative to the temporary root.
            expected = os.path.join(self.outer, *self.expected.split('/'))
            self.assertEqual(_canon(result), _canon(expected))


class CompleteFilePathDesktopTestCase(_StorageMixin, BaseTestGenerator):
    """Desktop mode has no storage directory, so the path is used as is."""

    scenarios = [
        ('Desktop mode uses the path as given', dict()),
    ]

    def runTest(self):
        path = os.path.join(self.alice, '..', 'bob', '.pgpass')
        self.assertEqual(self._resolve(path, server_mode=False), path)


class ConnectionStringPathRefusalTestCase(_StorageMixin, BaseTestGenerator):
    """A refused connection file path stops the connection string being
    built, so libpq never falls back to its default file in its place, but
    the display string is still available for the server's properties."""

    scenarios = [
        ('A refused passfile', dict(param='passfile')),
        ('A refused SSL key', dict(param='sslkey')),
        ('A refused SSL certificate', dict(param='sslcert')),
        ('A refused SSL key log file', dict(param='sslkeylogfile')),
        ('A refused root certificate', dict(param='sslrootcert')),
        ('A refused CRL', dict(param='sslcrl')),
        ('A refused CRL directory', dict(param='sslcrldir')),
    ]

    # The libpq version that first knows each connection keyword; on an
    # older libpq make_conninfo() rejects it before the containment check,
    # so there is nothing to confine.
    min_libpq = {'sslkeylogfile': 180000, 'sslcrldir': 140000}

    def runTest(self):
        if self.param in self.min_libpq:
            import psycopg
            if psycopg.pq.version() < self.min_libpq[self.param]:
                self.skipTest('{0} needs libpq {1} or later'.format(
                    self.param, self.min_libpq[self.param]))
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.host = 'db.example.com'
        manager.port = 5432
        manager.use_ssh_tunnel = False
        manager.service = None
        manager.connection_params = {
            'sslmode': 'require', self.param: '../bob/.pgpass'}

        with self.app.test_request_context(), \
                patch.dict(self.app.config, {'SERVER_MODE': True}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch('pgadmin.utils.get_storage_directory',
                      side_effect=self._storage_dir):
            with self.assertRaises(PermissionError):
                manager.create_connection_string('postgres', 'alice')

        self.assertIn('../bob/.pgpass', manager.display_connection_string)


class ConnectionParamsToEnvPathRefusalTestCase(_StorageMixin,
                                               BaseTestGenerator):
    """connection_params_to_env() refuses a connection file path that
    leaves the storage directory, and accepts the rest."""

    scenarios = [
        ('A refused passfile',
         dict(param='passfile', value='../bob/.pgpass', denied=True)),
        ('A refused SSL certificate',
         dict(param='sslcert', value='../bob/.pgpass', denied=True)),
        ('A refused SSL key',
         dict(param='sslkey', value='../bob/.pgpass', denied=True)),
        ('A refused CRL',
         dict(param='sslcrl', value='../bob/.pgpass', denied=True)),
        ('A refused root certificate',
         dict(param='sslrootcert', value='../bob/.pgpass', denied=True)),
        ('A refused CRL directory',
         dict(param='sslcrldir', value='../bob', denied=True)),
        ('The system root certificate is not a path',
         dict(param='sslrootcert', value='system', denied=False)),
        ('A passfile in storage is accepted',
         dict(param='passfile', value='/.pgpass', denied=False)),
    ]

    def runTest(self):
        with self.app.test_request_context(), \
                patch.dict(self.app.config, {'SERVER_MODE': True}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch.object(config, 'SERVER_MODE', True), \
                patch.object(config, 'SHARED_STORAGE', self.shared_storage), \
                patch('pgadmin.utils.get_storage_directory',
                      side_effect=self._storage_dir):
            if self.denied:
                with self.assertRaises(PermissionError):
                    connection_params_to_env({self.param: self.value})
            else:
                connection_params_to_env({self.param: self.value})


class CompleteFilePathRealStorageDirTestCase(_StorageMixin,
                                             BaseTestGenerator):
    """get_complete_file_path() against the real get_storage_directory(),
    so the user's directory and the shared storage lookup are exercised
    rather than mocked."""

    scenarios = [
        ('A file in the user\'s storage resolves', dict()),
    ]

    def _resolve_real(self, path):
        with patch.object(config, 'SERVER_MODE', True), \
                patch.object(config, 'STORAGE_DIR',
                             os.path.join(self.outer, 'storage')), \
                patch.object(config, 'SHARED_STORAGE', self.shared_storage), \
                patch.dict(self.app.config, {'SERVER_MODE': True}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                self.app.test_request_context():
            # current_user is a proxy for flask.g._login_user.
            flask.g._login_user = SimpleNamespace(username='alice')
            return get_complete_file_path(path)

    def runTest(self):
        self.assertEqual(
            _canon(self._resolve_real('/.pgpass')),
            _canon(os.path.join(self.alice, '.pgpass')))

        with self.assertRaises(PermissionError) as cm:
            self._resolve_real('../bob/.pgpass')
        self.assertIn('resolves outside your storage directory',
                      str(cm.exception))

        self.assertEqual(
            _canon(self._resolve_real('Team:/.pgpass')),
            _canon(os.path.join(self.shared, '.pgpass')))

        # A name that is not configured is just part of a relative path.
        self.assertIsNone(self._resolve_real('Nope:/.pgpass'))

        # A shared storage entry without a usable path has no directory.
        self.shared_storage.append(
            {'name': 'Gone', 'path': None, 'restricted_access': False})
        with self.assertRaises(PermissionError) as cm:
            self._resolve_real('Gone:/.pgpass')
        self.assertIn('could not be found', str(cm.exception))

        self.assertIsNone(self._resolve_real('/etc/passwd'))


class SSHTunnelIdentityFileRefusalTestCase(_StorageMixin, BaseTestGenerator):
    """A refused tunnel identity file is reported, not used or raised."""

    scenarios = [
        ('A refused identity file', dict()),
    ]

    def runTest(self):
        if not config.SUPPORT_SSH_TUNNEL:
            self.skipTest('SSH tunnelling is disabled in this configuration.')

        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.tunnel_authentication = 1
        manager.tunnel_host = 'tunnel.example.com'
        manager.tunnel_port = 22
        manager.tunnel_username = 'tunneluser'
        manager.tunnel_identity_file = '../bob/.pgpass'
        manager.tunnel_keep_alive = 0
        manager.host = 'db.example.com'
        manager.port = 5432
        manager.tunnel_object = None
        manager.tunnel_created = False
        forwarder = MagicMock()

        with self.app.test_request_context(), \
                patch.dict(self.app.config, {'SERVER_MODE': True}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch('pgadmin.utils.get_storage_directory',
                      side_effect=self._storage_dir), \
                patch.object(server_manager, 'SSHTunnelForwarder',
                             forwarder), \
                patch.object(server_manager, 'User', MagicMock()), \
                patch.object(server_manager, 'current_user', MagicMock()):
            success, error = manager.create_ssh_tunnel(None)

        self.assertFalse(success)
        self.assertIn('../bob/.pgpass', error)
        forwarder.assert_not_called()


class ConnectionStringInvalidKeyTestCase(_StorageMixin, BaseTestGenerator):
    """make_conninfo() quotes values but not keys, so a connection
    parameter whose key is not an exact libpq keyword (e.g. one carrying
    its own "keyword=value" pairs) is refused when the connection string
    is built, since rows already in the database are never re-validated."""

    scenarios = [
        ('A key smuggling a keyword via "="',
         dict(bad_key='sslmode=require passfile')),
        ('A key with a leading space',
         dict(bad_key=' passfile')),
        ('A key with a trailing space',
         dict(bad_key='passfile ')),
        ('A key that is not a libpq keyword at all',
         dict(bad_key='not_a_real_keyword')),
    ]

    def runTest(self):
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.host = 'db.example.com'
        manager.port = 5432
        manager.use_ssh_tunnel = False
        manager.service = None
        manager.connection_params = {
            'sslmode': 'require', self.bad_key: '/../bob/.pgpass'}

        with self.app.test_request_context(), \
                patch.dict(self.app.config, {'SERVER_MODE': True}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch('pgadmin.utils.get_storage_directory',
                      side_effect=self._storage_dir):
            with self.assertRaises(PermissionError):
                manager.create_connection_string('postgres', 'alice')

        # The injected key must not reach the connection string's display
        # copy either.
        self.assertNotIn(self.bad_key, manager.display_connection_string)


class CompleteFilePathWriteTargetTestCase(_StorageMixin, BaseTestGenerator):
    """A write target (sslkeylogfile) must additionally refuse a shared
    storage directory that is read-only for non-administrators, which an
    ordinary read path does not check."""

    scenarios = [
        ('A non-admin cannot write into a read-only shared directory',
         dict(restricted=True, admin=False, denied=True)),
        ('An administrator can write into a read-only shared directory',
         dict(restricted=True, admin=True, denied=False)),
        ('Anyone can write into an unrestricted shared directory',
         dict(restricted=False, admin=False, denied=False)),
    ]

    def runTest(self):
        self.shared_storage = [{'name': 'Team', 'path': self.shared,
                                'restricted_access': self.restricted}]
        user = _user(self.admin)

        with self.app.test_request_context(), \
                patch.dict(self.app.config, {'SERVER_MODE': True,
                                             'SHARED_STORAGE':
                                             self.shared_storage}), \
                patch.object(self.app, 'PGADMIN_RUNTIME', False), \
                patch.object(config, 'SERVER_MODE', True), \
                patch.object(config, 'SHARED_STORAGE', self.shared_storage), \
                patch('pgadmin.utils.get_storage_directory',
                      side_effect=self._storage_dir):
            flask.g._login_user = user
            if self.denied:
                with self.assertRaises(PermissionError):
                    get_complete_file_path('Team:/keylog', validate=False,
                                           for_write=True)
            else:
                result = get_complete_file_path('Team:/keylog', validate=False,
                                                for_write=True)
                self.assertEqual(_canon(result),
                                 _canon(os.path.join(self.shared, 'keylog')))


def _user(is_admin):
    """A minimal current_user stand-in with a has_role() method."""
    return SimpleNamespace(username='alice',
                           has_role=lambda role: is_admin)
