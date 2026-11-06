##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Tests for open_utility_file(), which hands an external utility a file
without following a symbolic link below the storage directory, and for the
safe touch in filename_with_file_manager_path().
"""

import errno
import os
import shutil
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch

import config
from pgadmin.utils import open_utility_file, _is_refused_leaf_symlink, \
    filename_with_file_manager_path
from pgadmin.misc.file_manager import Filemanager
from pgadmin.utils.route import BaseTestGenerator


class _UtilityFileMixin:
    """Mixin (NOT a TestCase): shared set up for the concrete classes."""
    scenarios = [('default', dict())]

    def setUp(self):
        # Filesystem-only tests: skip the server connection.
        unittest.TestCase.setUp(self)
        if sys.platform == 'win32':
            self.skipTest('POSIX symbolic links and FIFOs')
        self.tmp = tempfile.mkdtemp(prefix='pga_utilfile_test_')
        self.storage = os.path.join(self.tmp, 'storage')
        self.outside = os.path.join(self.tmp, 'outside')
        os.makedirs(self.storage)
        os.makedirs(self.outside)
        self._prev_server_mode = config.SERVER_MODE
        config.SERVER_MODE = True
        self._fds = []
        # Exercise the /dev/fd/N path on any platform; the mixin below
        # covers platforms where it is not used.
        patcher = patch('pgadmin.utils._dev_fd_reopens', return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        patcher = patch('pgadmin.utils.get_file_manager_storage_dir',
                        return_value=self.storage)
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        if not hasattr(self, '_fds'):
            return
        config.SERVER_MODE = self._prev_server_mode
        for fd in self._fds:
            try:
                os.close(fd)
            except OSError:
                pass
        shutil.rmtree(self.tmp, ignore_errors=True)

    def open_ok(self, path, for_write, is_directory=False):
        result = open_utility_file(path, for_write, is_directory)
        if result[1] is not None:
            self._fds.append(result[1])
        return result

    def assert_refused_symlink(self, path, for_write, is_directory=False):
        with self.assertRaises(OSError) as ctx:
            self.open_ok(path, for_write, is_directory)
        self.assertTrue(_is_refused_leaf_symlink(ctx.exception))

    def read_file(self, path):
        with open(path, 'rb') as f:
            return f.read()

    def _call(self, name, plant_link_target=None):
        def plant(storage_dir, file, skip=False):
            # Stands in for check_access_permission(), so returns the path
            # to act on as it does.
            if plant_link_target is not None:
                os.symlink(plant_link_target,
                           os.path.join(storage_dir, file.lstrip('/')))
            return Filemanager.get_abs_path(storage_dir, file)

        with patch('pgadmin.utils.get_storage_directory',
                   return_value=self.storage), \
                patch('pgadmin.utils.Preferences.module',
                      side_effect=Exception('no preferences')), \
                patch('pgadmin.misc.file_manager.Filemanager.'
                      'check_access_permission', side_effect=plant), \
                self.app.test_request_context():
            return filename_with_file_manager_path(name, create_file=True)


class TestWriteNewFile(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        path = os.path.join(self.storage, 'new.bak')
        utility_path, fd = self.open_ok(path, True)
        self.assertEqual(utility_path, '/dev/fd/%d' % fd)
        self.assertGreaterEqual(fd, 3)
        os.write(fd, b'x')
        self.assertEqual(self.read_file(path), b'x')
        self.assertEqual(stat.S_IMODE(os.stat(path).st_mode), 0o600)


class TestWriteTruncatesExistingFile(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        path = os.path.join(self.storage, 'old.bak')
        with open(path, 'wb') as f:
            f.write(b'a much longer pre-existing content')
        _, fd = self.open_ok(path, True)
        self.assertEqual(os.path.getsize(path), 0)
        os.write(fd, b'y')
        self.assertEqual(self.read_file(path), b'y')


class TestRead(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        path = os.path.join(self.storage, 'in.sql')
        with open(path, 'wb') as f:
            f.write(b'select 1;')
        utility_path, fd = self.open_ok(path, False)
        self.assertEqual(utility_path, '/dev/fd/%d' % fd)
        self.assertGreaterEqual(fd, 3)
        # Not inherited by accident; BatchProcess passes it explicitly.
        self.assertFalse(os.get_inheritable(fd))
        self.assertEqual(os.read(fd, 100), b'select 1;')


class TestFdAboveStdioWhenLowDescriptorFree(
        _UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        path = os.path.join(self.storage, 'in.sql')
        with open(path, 'wb') as f:
            f.write(b'z')
        saved = os.dup(0)
        try:
            os.close(0)
            _, fd = self.open_ok(path, False)
            self.assertGreaterEqual(fd, 3)
            self.assertFalse(os.get_inheritable(fd))
        finally:
            os.dup2(saved, 0)
            os.close(saved)


class TestSymlinkToExistingOutsideFileRefused(
        _UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        victim = os.path.join(self.outside, 'victim.txt')
        with open(victim, 'wb') as f:
            f.write(b'VICTIM')
        link = os.path.join(self.storage, 'link')
        os.symlink(victim, link)
        self.assert_refused_symlink(link, False)
        self.assert_refused_symlink(link, True)
        self.assertEqual(self.read_file(victim), b'VICTIM')


class TestDanglingSymlinkWriteDoesNotCreateTarget(
        _UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        target = os.path.join(self.outside, 'created.txt')
        link = os.path.join(self.storage, 'link')
        os.symlink(target, link)
        self.assert_refused_symlink(link, True)
        self.assertFalse(os.path.lexists(target))


class TestFifoRefused(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        fifo = os.path.join(self.storage, 'fifo')
        os.mkfifo(fifo)
        for for_write in (False, True):
            with self.assertRaises(OSError):
                self.open_ok(fifo, for_write)


class TestFifoWriteReportsNotRegularFile(
        _UtilityFileMixin, BaseTestGenerator):
    """Writing to a reader-less FIFO is refused with a path-free
    'Not a regular file', not the raw ENXIO text ("Device not configured" /
    "No such device or address") that would otherwise reach the client. The
    translation lives in _open_beneath(), so it covers this utility-write path
    as well as uploads."""

    scenarios = [('default', dict())]

    def runTest(self):
        fifo = os.path.join(self.storage, 'fifo')
        os.mkfifo(fifo)
        # The write open is non-blocking (O_NONBLOCK), so a reader-less FIFO
        # fails at once with ENXIO rather than hanging; _open_beneath()
        # translates that to a path-free "Not a regular file".
        with self.assertRaises(OSError) as ctx:
            self.open_ok(fifo, True)
        self.assertEqual(ctx.exception.strerror, 'Not a regular file')


class TestHardLinkRefused(_UtilityFileMixin, BaseTestGenerator):
    """A hard link to a file outside the storage directory is refused, and
    the target is left intact. O_NOFOLLOW cannot see a hard link, so the open
    succeeds and the st_nlink check is what catches it."""

    scenarios = [('default', dict())]

    def runTest(self):
        victim = os.path.join(self.outside, 'victim.txt')
        with open(victim, 'wb') as f:
            f.write(b'VICTIM')
        link = os.path.join(self.storage, 'hardlink')
        os.link(victim, link)
        for for_write in (False, True):
            with self.assertRaises(OSError) as ctx:
                self.open_ok(link, for_write)
            self.assertEqual(ctx.exception.errno, errno.EPERM)
        self.assertEqual(self.read_file(victim), b'VICTIM')


class TestDirectoryWriteCreates(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        path = os.path.join(self.storage, 'dumpdir')
        self.assertEqual(self.open_ok(path, True, True), (path, None))
        self.assertTrue(os.path.isdir(path))
        self.assertEqual(stat.S_IMODE(os.stat(path).st_mode), 0o700)


class TestDirectoryWriteExistingEmpty(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        path = os.path.join(self.storage, 'dumpdir')
        os.mkdir(path)
        self.assertEqual(self.open_ok(path, True, True), (path, None))


class TestDirectoryWriteSymlinkRefused(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        link = os.path.join(self.storage, 'linkdir')
        os.symlink(self.outside, link)
        self.assert_refused_symlink(link, True, True)
        self.assertEqual(os.listdir(self.outside), [])


class TestDirectoryWriteDanglingSymlinkCreatesNothing(
        _UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        target = os.path.join(self.outside, 'newdir')
        link = os.path.join(self.storage, 'linkdir')
        os.symlink(target, link)
        self.assert_refused_symlink(link, True, True)
        self.assertFalse(os.path.lexists(target))


class TestDirectoryRead(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        path = os.path.join(self.storage, 'dumpdir')
        os.mkdir(path)
        self.assertEqual(self.open_ok(path, False, True), (path, None))


class TestDirectoryReadSymlinkRefused(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        link = os.path.join(self.storage, 'linkdir')
        os.symlink(self.outside, link)
        self.assert_refused_symlink(link, False, True)


class _NoDevFdReopenMixin(_UtilityFileMixin):
    """As on macOS and the BSDs, where /dev/fd/N shares the file offset."""
    def setUp(self):
        super().setUp()
        patcher = patch('pgadmin.utils._dev_fd_reopens', return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)

    def open_fds(self):
        return set(os.listdir('/dev/fd'))


class TestNoDevFdRegularFile(_NoDevFdReopenMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        before = self.open_fds()
        new_path = os.path.join(self.storage, 'new.bak')
        self.assertEqual(self.open_ok(new_path, True), (new_path, None))
        self.assertEqual(os.path.getsize(new_path), 0)
        self.assertEqual(stat.S_IMODE(os.stat(new_path).st_mode), 0o600)

        old_path = os.path.join(self.storage, 'old.bak')
        with open(old_path, 'wb') as f:
            f.write(b'pre-existing content')
        self.assertEqual(self.open_ok(old_path, True), (old_path, None))
        self.assertEqual(os.path.getsize(old_path), 0)

        self.assertEqual(self.open_ok(old_path, False), (old_path, None))
        self.assertEqual(self.open_fds(), before)


class TestNoDevFdSymlinkRefused(_NoDevFdReopenMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        before = self.open_fds()
        victim = os.path.join(self.outside, 'victim.txt')
        with open(victim, 'wb') as f:
            f.write(b'VICTIM')
        link = os.path.join(self.storage, 'link')
        os.symlink(victim, link)
        self.assert_refused_symlink(link, False)
        self.assert_refused_symlink(link, True)
        self.assertEqual(self.read_file(victim), b'VICTIM')
        self.assertEqual(self.open_fds(), before)


class TestNoDevFdFifoRefused(_NoDevFdReopenMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        before = self.open_fds()
        fifo = os.path.join(self.storage, 'fifo')
        os.mkfifo(fifo)
        # Returning at all shows the open did not block on the FIFO.
        for for_write in (False, True):
            with self.assertRaises(OSError):
                self.open_ok(fifo, for_write)
        self.assertEqual(self.open_fds(), before)


class _DesktopModeMixin(_UtilityFileMixin):
    def setUp(self):
        super().setUp()
        config.SERVER_MODE = False


class TestDesktopPathReturnedUnchanged(_DesktopModeMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        file_path = os.path.join(self.storage, 'absent.bak')
        dir_path = os.path.join(self.storage, 'absent_dir')
        for is_directory, path in ((False, file_path), (True, dir_path)):
            for for_write in (False, True):
                self.assertEqual(
                    open_utility_file(path, for_write, is_directory),
                    (path, None))
        self.assertEqual(os.listdir(self.storage), [])


class TestDesktopSymlinkNotRefused(_DesktopModeMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        link = os.path.join(self.storage, 'link')
        os.symlink(self.outside, link)
        self.assertEqual(open_utility_file(link, True), (link, None))
        self.assertFalse(_is_refused_leaf_symlink(OSError(40, 'loop')))


class TestDanglingLeafSymlinkNotFollowed(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        target = os.path.join(self.outside, 'created.txt')
        with self.assertRaises(OSError) as ctx:
            self._call('/out.bak', plant_link_target=target)
        self.assertTrue(_is_refused_leaf_symlink(ctx.exception))
        self.assertFalse(os.path.lexists(target))


class TestRegularFileTouched(_UtilityFileMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def runTest(self):
        result = self._call('/plain.bak')
        self.assertTrue(result.endswith('plain.bak'))
        path = os.path.join(self.storage, 'plain.bak')
        self.assertTrue(os.path.isfile(path))
        self.assertEqual(stat.S_IMODE(os.stat(path).st_mode), 0o600)


class TestParentSymlinkRefused(_UtilityFileMixin, BaseTestGenerator):
    """A parent directory that is a symbolic link out of the storage
    directory is refused for a file and for a directory, reading or
    writing, and nothing is created through it."""
    scenarios = [('default', dict())]

    def runTest(self):
        os.symlink(self.outside, os.path.join(self.storage, 'sub'))
        for name, is_directory in (('f.bak', False), ('d.bak', True)):
            path = os.path.join(self.storage, 'sub', name)
            for for_write in (True, False):
                self.assert_refused_symlink(path, for_write, is_directory)
            self.assertFalse(os.path.lexists(
                os.path.join(self.outside, name)))


class TestNestedFileOpened(_UtilityFileMixin, BaseTestGenerator):
    """A file and a directory in a real subdirectory still open."""
    scenarios = [('default', dict())]

    def runTest(self):
        os.makedirs(os.path.join(self.storage, 'sub'))
        path = os.path.join(self.storage, 'sub', 'f.bak')
        utility_path, fd = self.open_ok(path, True)
        self.assertEqual(utility_path, '/dev/fd/{0}'.format(fd))
        self.assertTrue(os.path.isfile(path))
        path = os.path.join(self.storage, 'sub', 'd.bak')
        self.assertEqual(self.open_ok(path, True, True), (path, None))
        self.assertTrue(os.path.isdir(path))


class TestOutsideStorageRefused(_UtilityFileMixin, BaseTestGenerator):
    """A path outside the storage directory is refused outright."""
    scenarios = [('default', dict())]

    def runTest(self):
        with self.assertRaises(PermissionError):
            self.open_ok(os.path.join(self.outside, 'f.bak'), True)
        self.assertFalse(os.path.lexists(
            os.path.join(self.outside, 'f.bak')))


class TestParentSymlinkTouchRefused(_UtilityFileMixin, BaseTestGenerator):
    """The create_file touch refuses a parent directory swapped for a
    symbolic link after the check."""
    scenarios = [('default', dict())]

    def runTest(self):
        sub = os.path.join(self.storage, 'sub')
        os.makedirs(sub)

        def swap(storage_dir, file, skip=False):
            os.rename(sub, sub + '.moved')
            os.symlink(self.outside, sub)
            return Filemanager.get_abs_path(storage_dir, file)

        with patch('pgadmin.misc.file_manager.Filemanager.'
                   'check_access_permission', side_effect=swap), \
                self.app.test_request_context():
            with self.assertRaises(OSError) as ctx:
                filename_with_file_manager_path('/sub/x.bak',
                                                create_file=True)
        self.assertTrue(_is_refused_leaf_symlink(ctx.exception))
        self.assertFalse(os.path.lexists(os.path.join(self.outside,
                                                      'x.bak')))
