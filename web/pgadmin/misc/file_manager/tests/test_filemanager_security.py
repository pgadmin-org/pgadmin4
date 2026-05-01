##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the Filemanager symlink-escape fix (CWE-61 / CWE-22).

These tests validate that `check_access_permission` resolves symbolic links
via `os.path.realpath` before checking sandbox containment, closing the gap
between path-string semantics and kernel filesystem semantics.

The `O_NOFOLLOW` upload-leaf protection is tested in a separate class.
"""

import errno
import os
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

import config
from pgadmin.misc.file_manager import Filemanager
from pgadmin.utils.route import BaseTestGenerator


class _CheckAccessPermissionMixin:
    """Mixin (NOT a TestCase) — provides setUp/tearDown for symlink tests.

    Used in MRO with BaseTestGenerator on concrete test classes only, so the
    mixin doesn't get auto-registered as a runnable test.
    """

    def setUp(self):
        # Skip BaseTestGenerator.setUp's server connection — filesystem-only
        # unit tests don't need a database.
        unittest.TestCase.setUp(self)
        # Outer tempdir holds both the sandbox and the "outside" target.
        self.outer = tempfile.mkdtemp(prefix="pga_filemgr_test_")
        # The user's storage root.
        self.in_dir = os.path.join(self.outer, "storage", "alice")
        os.makedirs(self.in_dir)
        # An "outside" directory the attacker wants to escape to.
        self.outside_dir = os.path.join(self.outer, "secrets")
        os.makedirs(self.outside_dir)
        with open(os.path.join(self.outside_dir, "victim.txt"), "w") as f:
            f.write("VICTIM_DATA")

        # Force SERVER_MODE=True for the check to actually fire.
        self._prev_server_mode = config.SERVER_MODE
        config.SERVER_MODE = True

    def tearDown(self):
        config.SERVER_MODE = self._prev_server_mode
        shutil.rmtree(self.outer, ignore_errors=True)

    def make_symlink(self, link_name: str, target: str) -> str:
        """Create a symlink at in_dir/link_name pointing at target.

        Returns the path to the link (relative-to-in_dir notation expected
        by check_access_permission, i.e. starting with '/').
        """
        link_path = os.path.join(self.in_dir, link_name)
        os.symlink(target, link_path)
        return "/" + link_name


# ---------------------------------------------------------------------------
# Positive — legitimate paths must continue to be allowed.
# ---------------------------------------------------------------------------

class TestLegitPathInsideStorage(_CheckAccessPermissionMixin, BaseTestGenerator):
    """A path entirely inside the storage dir must pass."""

    scenarios = [('default', dict())]

    def runTest(self):
        # No exception → access granted.
        Filemanager.check_access_permission(self.in_dir, "/myfile.txt")


class TestRelativeNotationResolvingInside(_CheckAccessPermissionMixin, BaseTestGenerator):
    """A path with .. that resolves inside the sandbox must pass."""

    scenarios = [('default', dict())]

    def runTest(self):
        os.makedirs(os.path.join(self.in_dir, "subdir"))
        # subdir/../myfile.txt resolves to in_dir/myfile.txt → inside.
        Filemanager.check_access_permission(
            self.in_dir, "/subdir/../myfile.txt")


class TestSymlinkedStorageRootPassesForRealChild(_CheckAccessPermissionMixin, BaseTestGenerator):
    """If the storage root itself is a symlink, legitimate access still works.

    Without realpath()ing in_dir, a symlinked storage root would compare
    unequal to a resolved target path and break legit access.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        real_root = os.path.join(self.outer, "real_storage", "alice")
        os.makedirs(real_root)
        symlinked_root = os.path.join(self.outer, "linked_storage_alice")
        os.symlink(real_root, symlinked_root)
        # in_dir is the symlinked path; the real file lives under the target.
        with open(os.path.join(real_root, "legit.txt"), "w") as f:
            f.write("hi")
        # A real file via the symlinked root must be accessible.
        Filemanager.check_access_permission(symlinked_root, "/legit.txt")


class TestServerModeFalseSkipsCheck(_CheckAccessPermissionMixin, BaseTestGenerator):
    """SERVER_MODE=False: check is a no-op, allowing any path."""

    scenarios = [('default', dict())]

    def runTest(self):
        config.SERVER_MODE = False
        # Even a clearly-outside path must NOT raise — desktop mode trusts
        # the local user.
        Filemanager.check_access_permission(
            self.in_dir, self.outside_dir + "/victim.txt")


# ---------------------------------------------------------------------------
# Negative — escapes (symlinks and ..) must be rejected.
# ---------------------------------------------------------------------------

class TestSymlinkPointingOutsideRejected(_CheckAccessPermissionMixin, BaseTestGenerator):
    """The core Vuln 2 fix: a symlink whose target is outside in_dir blocks."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        evil_path = self.make_symlink("escape", self.outside_dir)
        with self.assertRaises(PermissionError):
            Filemanager.check_access_permission(
                self.in_dir, evil_path + "/victim.txt")


class TestSymlinkAtLeafRejected(_CheckAccessPermissionMixin, BaseTestGenerator):
    """A symlink AS the leaf (not via intermediate) is also rejected."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        evil_path = self.make_symlink(
            "victim_link",
            os.path.join(self.outside_dir, "victim.txt"))
        with self.assertRaises(PermissionError):
            Filemanager.check_access_permission(self.in_dir, evil_path)


class TestDotDotEscapeRejected(_CheckAccessPermissionMixin, BaseTestGenerator):
    """A path with .. that escapes the sandbox (no symlink) is rejected.

    Pre-existing protection; this test guards against regression.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        # /../secrets/victim.txt → escapes to self.outer/secrets/victim.txt
        with self.assertRaises(PermissionError):
            Filemanager.check_access_permission(
                self.in_dir, "/../secrets/victim.txt")


# ---------------------------------------------------------------------------
# Coverage of the four other check_access_permission consumers.
# ---------------------------------------------------------------------------
#
# These verify the fix flows through to all callers of
# check_access_permission, not just the upload handler. They use the same
# static method so the assertions are about the function behavior, not the
# wiring — which is verified by reading the code in §4.2.3 / §4.2.4.

class TestRenameTargetSymlinkRejected(_CheckAccessPermissionMixin, BaseTestGenerator):
    """rename's target path through a symlink → access denied."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        evil_path = self.make_symlink("escape", self.outside_dir)
        with self.assertRaises(PermissionError):
            # rename calls check_access_permission(the_dir, new) where new
            # is the target relative path.
            Filemanager.check_access_permission(
                self.in_dir, evil_path + "/renamed.txt")


class TestDeleteTargetSymlinkRejected(_CheckAccessPermissionMixin, BaseTestGenerator):
    """delete's target path through a symlink → access denied."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        evil_path = self.make_symlink(
            "evil_link",
            os.path.join(self.outside_dir, "victim.txt"))
        with self.assertRaises(PermissionError):
            Filemanager.check_access_permission(self.in_dir, evil_path)


class TestDownloadTargetSymlinkRejected(_CheckAccessPermissionMixin, BaseTestGenerator):
    """download's target path through a symlink → access denied."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        evil_path = self.make_symlink(
            "evil_dl",
            os.path.join(self.outside_dir, "victim.txt"))
        with self.assertRaises(PermissionError):
            Filemanager.check_access_permission(self.in_dir, evil_path)


class TestAddfolderTargetSymlinkRejected(_CheckAccessPermissionMixin, BaseTestGenerator):
    """addfolder's target path through a symlink → access denied."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        evil_path = self.make_symlink("escape", self.outside_dir)
        with self.assertRaises(PermissionError):
            Filemanager.check_access_permission(
                self.in_dir, evil_path + "/newdir")


# ---------------------------------------------------------------------------
# Upload-syscall hardening tests — _open_upload_target() with O_NOFOLLOW.
#
# These cover the leaf-component TOCTOU between the access check and the
# actual file write: even if a symlink is planted at the target path
# between check time and open time, the kernel must refuse to follow it.
# ---------------------------------------------------------------------------

class _OpenUploadTargetMixin:
    """Mixin for upload-syscall hardening tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.tmpdir = tempfile.mkdtemp(prefix="pga_filemgr_open_")

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)


class TestOpenUploadTargetCreatesNewFile(_OpenUploadTargetMixin, BaseTestGenerator):
    """Positive: opening a non-existent path creates a regular file."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.file_manager import _open_upload_target
        target = os.path.join(self.tmpdir, "uploaded.txt")
        with _open_upload_target(target) as f:
            f.write(b"hello")
        self.assertTrue(os.path.isfile(target))
        with open(target, "rb") as f:
            self.assertEqual(f.read(), b"hello")


class TestOpenUploadTargetOverwritesRegularFile(_OpenUploadTargetMixin, BaseTestGenerator):
    """Positive: opening over an existing regular file truncates and rewrites."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.file_manager import _open_upload_target
        target = os.path.join(self.tmpdir, "existing.txt")
        with open(target, "wb") as f:
            f.write(b"OLD CONTENT" * 100)  # ensure truncate is observable
        with _open_upload_target(target) as f:
            f.write(b"NEW")
        with open(target, "rb") as f:
            self.assertEqual(f.read(), b"NEW")


class TestOpenUploadTargetMode0600(_OpenUploadTargetMixin, BaseTestGenerator):
    """Positive: newly-created upload files are mode 0o600 (intentional hardening).

    Documented behavior change vs. the umask-default 0o644 of the prior
    open(name, 'wb'). Release notes call this out.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("POSIX mode bits not meaningful on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        target = os.path.join(self.tmpdir, "private.txt")
        with _open_upload_target(target) as f:
            f.write(b"x")
        mode = os.stat(target).st_mode & 0o777
        self.assertEqual(
            mode, 0o600,
            "Expected 0o600 (owner-only), got 0o%o" % mode)


class TestOpenUploadTargetRejectsLeafSymlink(_OpenUploadTargetMixin, BaseTestGenerator):
    """Negative: a pre-planted symlink at the leaf path raises ELOOP/EMLINK.

    This is the TOCTOU-closing property: even if check_access_permission
    passed at T1 and a symlink was raced into place by T2, the kernel
    refuses to follow it via O_NOFOLLOW.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        outside_target = os.path.join(self.tmpdir, "outside.txt")
        with open(outside_target, "wb") as f:
            f.write(b"victim")
        link_path = os.path.join(self.tmpdir, "evil_link")
        os.symlink(outside_target, link_path)

        with self.assertRaises(OSError) as cm:
            with _open_upload_target(link_path) as f:
                f.write(b"OWNED")
        # Linux: ELOOP. macOS: ELOOP or EMLINK. Either is acceptable.
        self.assertIn(
            cm.exception.errno,
            (errno.ELOOP, errno.EMLINK),
            "Expected ELOOP/EMLINK, got errno=%d" % cm.exception.errno)
        # Critical: the outside target must not have been overwritten.
        with open(outside_target, "rb") as f:
            self.assertEqual(f.read(), b"victim")


class TestOpenUploadTargetRejectsLeafSymlinkPointingToNonexistent(
        _OpenUploadTargetMixin, BaseTestGenerator):
    """Negative: a leaf symlink to a non-existent target is also rejected.

    Without O_NOFOLLOW, a symlink to a non-existent path would be FOLLOWED
    by O_CREAT (creating the file at the symlink target). With O_NOFOLLOW,
    the open fails before any creation happens.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        outside_path = os.path.join(self.tmpdir, "would_be_created")
        link_path = os.path.join(self.tmpdir, "evil_link")
        os.symlink(outside_path, link_path)

        with self.assertRaises(OSError) as cm:
            with _open_upload_target(link_path) as f:
                f.write(b"OWNED")
        self.assertIn(
            cm.exception.errno,
            (errno.ELOOP, errno.EMLINK),
            "Expected ELOOP/EMLINK, got errno=%d" % cm.exception.errno)
        # No file must have been created at the symlink's target.
        self.assertFalse(os.path.exists(outside_path))
