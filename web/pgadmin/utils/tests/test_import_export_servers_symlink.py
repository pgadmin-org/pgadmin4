##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Import/Export Servers must not follow a symbolic link swapped in at the leaf
of the servers.json path, or at one of its parent directories, between
filename_with_file_manager_path() validating it against the user's storage
directory and the file actually being opened.

A symlink already present at check time is refused by the check, so the
interesting case is the race, which these tests reproduce deterministically
by planting the symlink from inside the check itself.
"""

import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import config
from pgadmin.utils.route import BaseTestGenerator

PATH_CHECK = 'pgadmin.utils.filename_with_file_manager_path'
STORAGE_DIR = 'pgadmin.utils.get_file_manager_storage_dir'


class _SymlinkMixin:
    """Mixin (NOT a TestCase): a storage directory and an outside target."""

    def setUp(self):
        # Filesystem-only tests: BaseTestGenerator.setUp()'s connect_server()
        # is deliberately skipped.
        unittest.TestCase.setUp(self)
        if sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        # gettext needs a request context to pick a locale.
        self.ctx = self.app.test_request_context()
        self.ctx.push()
        from pgadmin.model import User
        self.user = User.query.first()

        self.tmpdir = tempfile.mkdtemp(prefix="pga_servers_symlink_")
        self.storage_dir = os.path.join(self.tmpdir, "storage")
        os.makedirs(self.storage_dir)
        self.link_path = os.path.join(self.storage_dir, "race.json")
        self.outside = os.path.join(self.tmpdir, "outside.json")
        # For the parent-directory swap: a subdirectory of the storage
        # directory, and a directory outside it holding a same-named file.
        self.parent = os.path.join(self.storage_dir, "sub")
        self.parent_path = os.path.join(self.parent, "race.json")
        self.outside_dir = os.path.join(self.tmpdir, "outside")
        self.outside_file = os.path.join(self.outside_dir, "race.json")
        os.makedirs(self.parent)
        os.makedirs(self.outside_dir)

        storage = patch(STORAGE_DIR, return_value=self.storage_dir)
        storage.start()
        self.addCleanup(storage.stop)

        self._prev_server_mode = config.SERVER_MODE
        config.SERVER_MODE = True

    def tearDown(self):
        config.SERVER_MODE = self._prev_server_mode
        shutil.rmtree(self.tmpdir, ignore_errors=True)
        self.ctx.pop()

    def _race(self, _file):
        """Stand-in for the path check that loses the race: the path was
        fine when checked, then became a symlink to the outside target."""
        os.symlink(self.outside, self.link_path)
        return self.link_path

    def _parent_race(self, _file):
        """As _race(), but it is a parent directory of the validated path
        that is swapped for a symlink to a directory outside storage."""
        os.rename(self.parent, self.parent + ".moved")
        os.symlink(self.outside_dir, self.parent)
        return self.parent_path


class TestExportServersRefusesLeafSymlink(_SymlinkMixin, BaseTestGenerator):
    """The export must not write through a symlink raced in after the
    check."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.utils import dump_database_servers
        with open(self.outside, "w") as f:
            f.write("VICTIM")

        with patch(PATH_CHECK, side_effect=self._race), \
                redirect_stdout(io.StringIO()):
            ok, msg = dump_database_servers("race.json", None, self.user)

        self.assertFalse(ok)
        self.assertEqual(msg, "Refusing to write through a symbolic link.")
        with open(self.outside) as f:
            self.assertEqual(f.read(), "VICTIM")


class TestExportServersRefusesParentSymlink(_SymlinkMixin,
                                            BaseTestGenerator):
    """The export must not write through a parent directory swapped for a
    symlink after the check."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.utils import dump_database_servers
        with open(self.outside_file, "w") as f:
            f.write("VICTIM")

        with patch(PATH_CHECK, side_effect=self._parent_race), \
                redirect_stdout(io.StringIO()):
            ok, msg = dump_database_servers("sub/race.json", None,
                                            self.user)

        self.assertFalse(ok)
        self.assertEqual(msg, "Refusing to write through a symbolic link.")
        with open(self.outside_file) as f:
            self.assertEqual(f.read(), "VICTIM")


class TestExportServersWritesRegularFile(_SymlinkMixin, BaseTestGenerator):
    """The protected open must still write an ordinary export, owner-only."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.utils import dump_database_servers
        target = os.path.join(self.storage_dir, "servers.json")

        with patch(PATH_CHECK, return_value=target), \
                redirect_stdout(io.StringIO()):
            ok, msg = dump_database_servers("servers.json", None, self.user)

        self.assertTrue(ok, msg)
        self.assertIn(target, msg)
        with open(target) as f:
            self.assertIn("Servers", json.load(f))
        self.assertEqual(os.stat(target).st_mode & 0o777, 0o600)


class TestImportServersRefusesLeafSymlink(_SymlinkMixin, BaseTestGenerator):
    """The import must not read through a symlink raced in after the
    check."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.utils import load_database_servers
        with open(self.outside, "w") as f:
            json.dump({"Servers": {}}, f)

        with patch(PATH_CHECK, side_effect=self._race), \
                redirect_stdout(io.StringIO()):
            ok, msg = load_database_servers("race.json", None, self.user)

        self.assertFalse(ok)
        self.assertEqual(msg, "Refusing to read through a symbolic link.")


class TestImportServersRefusesParentSymlink(_SymlinkMixin,
                                            BaseTestGenerator):
    """The import must not read through a parent directory swapped for a
    symlink after the check."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.utils import load_database_servers
        with open(self.outside_file, "w") as f:
            json.dump({"Servers": {}}, f)

        with patch(PATH_CHECK, side_effect=self._parent_race), \
                redirect_stdout(io.StringIO()):
            ok, msg = load_database_servers("sub/race.json", None,
                                            self.user)

        self.assertFalse(ok)
        self.assertEqual(msg, "Refusing to read through a symbolic link.")


class TestImportServersRejectsNonUtf8(_SymlinkMixin, BaseTestGenerator):
    """A non-UTF-8 servers.json is reported cleanly rather than crashing. The
    catch-all handler must not assume errno/strerror on the UnicodeDecodeError
    json.load raises, and the message must not leak the storage path. On the
    base commit the handler reads e.errno on a UnicodeDecodeError and raises
    AttributeError (a 500)."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.utils import load_database_servers
        bad = os.path.join(self.storage_dir, "bad.json")
        with open(bad, "wb") as f:
            f.write(b"\x80abc")

        with patch(PATH_CHECK, return_value=bad), \
                redirect_stdout(io.StringIO()):
            ok, msg = load_database_servers("bad.json", None, self.user)

        self.assertFalse(ok)
        self.assertNotIn(self.storage_dir, msg)


class TestOpenBeneath(_SymlinkMixin, BaseTestGenerator):
    """_open_beneath() opens paths inside the root, including in nested
    directories, and refuses anything that leaves it."""

    scenarios = [('default', dict())]

    def runTest(self):
        import errno
        from pgadmin.misc.file_manager import _open_beneath
        nested = os.path.join(self.parent, "nested")
        os.makedirs(nested)
        target = os.path.join(nested, "ok.json")

        fd = _open_beneath(self.storage_dir, target,
                           os.O_WRONLY | os.O_CREAT, 0o600)
        os.close(fd)
        self.assertTrue(os.path.isfile(target))

        # A symlinked storage root is trusted and followed.
        root_link = os.path.join(self.tmpdir, "root_link")
        os.symlink(self.storage_dir, root_link)
        fd = _open_beneath(root_link, os.path.join(root_link, "sub",
                                                   "nested", "ok.json"),
                           os.O_RDONLY)
        os.close(fd)

        for bad in (self.outside,
                    os.path.join(self.storage_dir, "..", "outside.json"),
                    self.storage_dir):
            with self.assertRaises(PermissionError):
                _open_beneath(self.storage_dir, bad, os.O_RDONLY)
        with self.assertRaises(PermissionError):
            _open_beneath(None, target, os.O_RDONLY)

        # A symlink below the root is refused even when it points inside.
        os.symlink(nested, os.path.join(self.storage_dir, "inner_link"))
        with self.assertRaises(OSError) as cm:
            _open_beneath(self.storage_dir,
                          os.path.join(self.storage_dir, "inner_link",
                                       "ok.json"), os.O_RDONLY)
        self.assertIn(cm.exception.errno, (errno.ELOOP, errno.EMLINK))


class TestOpenReadTarget(_SymlinkMixin, BaseTestGenerator):
    """_open_read_target(), used by the import's file-listing endpoint,
    refuses a leaf symlink in server mode and follows it in desktop mode."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.file_manager import _open_read_target
        with open(self.outside, "w") as f:
            f.write("OUTSIDE")
        os.symlink(self.outside, self.link_path)

        with self.assertRaises(OSError):
            _open_read_target(self.link_path, self.storage_dir).close()

        # Desktop mode has no storage sandbox, so symlinks are followed.
        config.SERVER_MODE = False
        with _open_read_target(self.link_path, None) as f:
            self.assertEqual(f.read(), b"OUTSIDE")

        # A FIFO must be refused without blocking on a writer.
        config.SERVER_MODE = True
        fifo = os.path.join(self.storage_dir, "fifo.json")
        os.mkfifo(fifo)
        with self.assertRaises(OSError):
            _open_read_target(fifo, self.storage_dir).close()
