##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for pgadmin.utils.is_reserved_storage_path and
does_utility_exist's use of it.

Regression coverage for CWE-426 (untrusted search path): the utility
binary path guard originally rejected only a path under STORAGE_DIR, the
per-user upload directory, and never checked SHARED_STORAGE, an equally
admin-configurable directory tree that pgAdmin's own docs describe as
writable by ordinary, non-admin users whenever an entry is created with
restricted_access: False. An authenticated user with zero tool
permissions could point the pg_bin_dir preference (or
/misc/validate_binary_path directly) at a SHARED_STORAGE path and have
pgAdmin execute whatever file it found there as the pg_dump/pg_restore/
psql/pg_dumpall binary.

These are pure request/config-logic tests - no Postgres server or SQLite
database is required, so setUp() below skips
BaseTestGenerator.setUp()'s connect_server().
"""

import os
import sys
import tempfile
import unittest
from unittest.mock import patch, MagicMock

import pgadmin.utils as utils_module
from pgadmin.utils import does_utility_exist, is_reserved_storage_path, \
    get_binary_path_versions
from pgadmin.utils.route import BaseTestGenerator

STORAGE_DIR = '/var/lib/pgadmin/storage'

NON_RESTRICTED_SHARE = [
    {'name': 'Shared 1', 'path': '/shared_folder',
     'restricted_access': False}]

RESTRICTED_SHARE = [
    {'name': 'Shared 1', 'path': '/shared_folder',
     'restricted_access': True}]

TWO_SHARES = [
    {'name': 'Shared 1', 'path': '/shared_folder',
     'restricted_access': False},
    {'name': 'Shared 2', 'path': '/other_shared',
     'restricted_access': False}]


class _SkipServerSetUpMixin:
    """Bypass BaseTestGenerator's Postgres server setUp - these are pure
    logic tests that need no live server or HTTP infrastructure."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestIsReservedStoragePath(_SkipServerSetUpMixin, BaseTestGenerator):
    """is_reserved_storage_path() against STORAGE_DIR and every
    configured SHARED_STORAGE entry, restricted or not."""

    scenarios = [
        ('exact STORAGE_DIR path is reserved',
         dict(shared_storage=[], file=STORAGE_DIR, expected=True)),

        ('a file nested under STORAGE_DIR is reserved',
         dict(shared_storage=[],
              file=STORAGE_DIR + '/alice/pg_dump', expected=True)),

        ('an unrelated path is not reserved',
         dict(shared_storage=[],
              file='/usr/bin/pg_dump', expected=False)),

        ('a non-restricted SHARED_STORAGE entry is reserved',
         dict(shared_storage=NON_RESTRICTED_SHARE,
              file='/shared_folder/pg_dump', expected=True)),

        ('a restricted SHARED_STORAGE entry is reserved too',
         dict(shared_storage=RESTRICTED_SHARE,
              file='/shared_folder/pg_dump', expected=True)),

        ('the exact SHARED_STORAGE path itself is reserved',
         dict(shared_storage=NON_RESTRICTED_SHARE,
              file='/shared_folder', expected=True)),

        ('a second SHARED_STORAGE entry is reserved too',
         dict(shared_storage=TWO_SHARES,
              file='/other_shared/nested/pg_dump', expected=True)),

        ('a path sharing only a prefix with a shared dir is not reserved',
         dict(shared_storage=NON_RESTRICTED_SHARE,
              file='/shared_folder_evil/pg_dump', expected=False)),

        ('a ".." path that resolves into a shared dir is reserved',
         dict(shared_storage=NON_RESTRICTED_SHARE,
              file='/elsewhere/../shared_folder/pg_dump', expected=True)),

        ('a ".." path that resolves into STORAGE_DIR is reserved',
         dict(shared_storage=[],
              file='/elsewhere/../var/lib/pgadmin/storage/alice/pg_dump',
              expected=True)),

        ('a ".." path that escapes a shared dir is not reserved',
         dict(shared_storage=NON_RESTRICTED_SHARE,
              file='/shared_folder/../usr/bin/pg_dump', expected=False)),

        ('a None SHARED_STORAGE behaves like STORAGE_DIR-only',
         dict(shared_storage=None,
              file='/shared_folder/pg_dump', expected=False)),
    ]

    def runTest(self):
        with patch.object(utils_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(utils_module.config, 'SHARED_STORAGE',
                             self.shared_storage):
            self.assertEqual(
                is_reserved_storage_path(self.file), self.expected)


class TestDoesUtilityExistRejectsSharedStorage(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """does_utility_exist() surfaces the same rejection message for a
    SHARED_STORAGE path as it already did for STORAGE_DIR, regardless of
    whether a file happens to exist at that path."""

    scenarios = [('default', dict())]

    def runTest(self):
        with patch.object(utils_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(utils_module.config, 'SHARED_STORAGE',
                             NON_RESTRICTED_SHARE), \
                patch.object(utils_module.os.path, 'exists',
                             return_value=True):
            error_msg = does_utility_exist('/shared_folder/pg_dump')

        self.assertIsNotNone(error_msg)
        self.assertIn('Binary Path', error_msg)


class TestDoesUtilityExistAllowsOrdinaryPath(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """A binary path outside both STORAGE_DIR and every SHARED_STORAGE
    entry is not rejected by the reserved-path guard (the separate
    os.path.exists() check still applies)."""

    scenarios = [('default', dict())]

    def runTest(self):
        with patch.object(utils_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(utils_module.config, 'SHARED_STORAGE',
                             NON_RESTRICTED_SHARE), \
                patch.object(utils_module.os.path, 'exists',
                             return_value=True):
            error_msg = does_utility_exist('/usr/pgsql/bin/pg_dump')

        self.assertIsNone(error_msg)


class TestIsReservedStoragePathFollowsSymlinks(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """A symlink that points into a SHARED_STORAGE directory is reserved
    too, so it cannot be used to present the same directory under a
    different name."""

    scenarios = [('default', dict())]

    def runTest(self):
        with tempfile.TemporaryDirectory() as tmp:
            shared = os.path.join(tmp, 'shared')
            link = os.path.join(tmp, 'link')
            os.mkdir(shared)
            os.symlink(shared, link)
            share = [{'name': 'Shared 1', 'path': shared,
                      'restricted_access': False}]

            with patch.object(utils_module.config, 'STORAGE_DIR',
                              STORAGE_DIR), \
                    patch.object(utils_module.config, 'SHARED_STORAGE',
                                 share):
                self.assertTrue(
                    is_reserved_storage_path(link + '/pg_dump'))


class TestDoesUtilityExistRejectsDotDotIntoSharedStorage(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """does_utility_exist() refuses a path that only reaches a
    SHARED_STORAGE directory through '..' segments."""

    scenarios = [('default', dict())]

    def runTest(self):
        with patch.object(utils_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(utils_module.config, 'SHARED_STORAGE',
                             NON_RESTRICTED_SHARE), \
                patch.object(utils_module.os.path, 'exists',
                             return_value=True):
            error_msg = does_utility_exist(
                '/elsewhere/../shared_folder/pg_dump')

        self.assertIsNotNone(error_msg)
        self.assertIn('storage', error_msg)


class TestIsReservedStoragePathEdgeCases(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """'$DIR' expansion, an empty STORAGE_DIR, case-insensitive
    filesystems, and the guard inside get_binary_path_versions()."""

    scenarios = [('default', dict())]

    def runTest(self):
        shares = NON_RESTRICTED_SHARE
        main = sys.modules['__main__']

        # '$DIR/..' is expanded before it is resolved, so it cannot be
        # used to climb out of pgAdmin's install directory into a share.
        with patch.object(utils_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(utils_module.config, 'SHARED_STORAGE', shares), \
                patch.object(main, '__file__', '/opt/pgadmin/pgAdmin4.py',
                             create=True):
            self.assertTrue(
                is_reserved_storage_path('$DIR/../../shared_folder'))
            self.assertFalse(is_reserved_storage_path('$DIR/../bin'))

        # An empty STORAGE_DIR is not resolved against the working
        # directory: nothing is reserved on its account.
        with patch.object(utils_module.config, 'STORAGE_DIR', ''), \
                patch.object(utils_module.config, 'SHARED_STORAGE', []), \
                patch('os.getcwd', return_value='/'):
            self.assertFalse(is_reserved_storage_path('/usr/bin'))

        # A differently-cased spelling is reserved on a case-insensitive
        # filesystem (macOS), where normcase() does not fold case. The
        # filesystem is simulated by a samefile() that ignores case.
        def samefile(a, b):
            if str(a).lower() != str(b).lower():
                raise OSError('not found')
            return True

        with patch.object(utils_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(utils_module.config, 'SHARED_STORAGE', shares), \
                patch.object(utils_module.os.path, 'samefile',
                             side_effect=samefile):
            self.assertTrue(is_reserved_storage_path('/Shared_Folder/bin'))
            self.assertFalse(is_reserved_storage_path('/Usr/bin'))

        # The guard lives in get_binary_path_versions(), so no caller can
        # skip it: nothing is executed from a reserved directory.
        with patch.object(utils_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(utils_module.config, 'SHARED_STORAGE', shares), \
                patch.object(utils_module, 'current_app', new=MagicMock()), \
                patch.object(utils_module.os.path, 'isdir',
                             return_value=True), \
                patch.object(utils_module.subprocess, 'run') as run_mock:
            versions = get_binary_path_versions('/shared_folder')
        run_mock.assert_not_called()
        self.assertTrue(versions)
        self.assertTrue(all(v is None for v in versions.values()))

        # A path that is not a usable path at all is refused, not a 500.
        self.assertTrue(is_reserved_storage_path('/usr/bin\x00'))


class TestIsReservedStoragePathSymlinkThenDotDot(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """A path through a symlink followed by '..' is judged where the
    utilities will actually run from. abspath() collapses '..' as text
    before the path is used, whereas a bare realpath() would follow the
    symlink first and land in a different directory."""

    scenarios = [('default', dict())]

    def runTest(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = os.path.realpath(tmp)
            storage = os.path.join(tmp, 'storage')
            os.makedirs(os.path.join(storage, 'alice'))
            os.makedirs(os.path.join(tmp, 'a', 'b'))
            os.symlink(os.path.join(tmp, 'a', 'b'),
                       os.path.join(tmp, 'link'))
            # abspath: tmp/link/../storage/alice -> tmp/storage/alice
            # realpath alone: tmp/a/storage/alice (not reserved)
            path = os.path.join(tmp, 'link', '..', 'storage', 'alice')
            with patch.object(utils_module.config, 'STORAGE_DIR', storage), \
                    patch.object(utils_module.config, 'SHARED_STORAGE', []):
                self.assertTrue(is_reserved_storage_path(path))
