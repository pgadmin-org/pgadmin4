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

import contextlib
import errno
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from werkzeug.datastructures import FileStorage

import config
from pgadmin.misc.file_manager import Filemanager
from pgadmin.utils.constants import MY_STORAGE
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

class TestLegitPathInsideStorage(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
    """A path entirely inside the storage dir must pass."""

    scenarios = [('default', dict())]

    def runTest(self):
        # No exception → access granted.
        Filemanager.check_access_permission(self.in_dir, "/myfile.txt")


class TestRelativeNotationResolvingInside(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
    """A path with .. that resolves inside the sandbox must pass."""

    scenarios = [('default', dict())]

    def runTest(self):
        os.makedirs(os.path.join(self.in_dir, "subdir"))
        # subdir/../myfile.txt resolves to in_dir/myfile.txt → inside.
        Filemanager.check_access_permission(
            self.in_dir, "/subdir/../myfile.txt")


class TestSymlinkedStorageRootPassesForRealChild(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
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


class TestServerModeFalseSkipsCheck(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
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

class TestSymlinkPointingOutsideRejected(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
    """The core Vuln 2 fix: a symlink whose target is outside in_dir blocks."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        evil_path = self.make_symlink("escape", self.outside_dir)
        with self.assertRaises(PermissionError):
            Filemanager.check_access_permission(
                self.in_dir, evil_path + "/victim.txt")


class TestSymlinkAtLeafRejected(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
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

class TestRenameTargetSymlinkRejected(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
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


class TestDeleteTargetSymlinkRejected(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
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


class TestDownloadTargetSymlinkRejected(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
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


class TestAddfolderTargetSymlinkRejected(
        _CheckAccessPermissionMixin, BaseTestGenerator
):
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
    """Mixin for upload-syscall hardening tests.

    The hardening only applies in server mode, so pin SERVER_MODE rather
    than inheriting whatever the harness was started with. Desktop-mode
    subclasses override `server_mode`.
    """

    server_mode = True

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.tmpdir = tempfile.mkdtemp(prefix="pga_filemgr_open_")
        self._prev_server_mode = config.SERVER_MODE
        config.SERVER_MODE = self.server_mode

    def tearDown(self):
        config.SERVER_MODE = self._prev_server_mode
        shutil.rmtree(self.tmpdir, ignore_errors=True)


class TestOpenUploadTargetCreatesNewFile(
        _OpenUploadTargetMixin, BaseTestGenerator
):
    """Positive: opening a non-existent path creates a regular file."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.file_manager import _open_upload_target
        target = os.path.join(self.tmpdir, "uploaded.txt")
        with _open_upload_target(target, self.tmpdir) as f:
            f.write(b"hello")
        self.assertTrue(os.path.isfile(target))
        with open(target, "rb") as f:
            self.assertEqual(f.read(), b"hello")


class TestOpenUploadTargetOverwritesRegularFile(
        _OpenUploadTargetMixin, BaseTestGenerator
):
    """Positive: opening over an existing regular file truncates and
    rewrites.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.file_manager import _open_upload_target
        target = os.path.join(self.tmpdir, "existing.txt")
        with open(target, "wb") as f:
            f.write(b"OLD CONTENT" * 100)  # ensure truncate is observable
        with _open_upload_target(target, self.tmpdir) as f:
            f.write(b"NEW")
        with open(target, "rb") as f:
            self.assertEqual(f.read(), b"NEW")


class TestOpenUploadTargetMode0600(_OpenUploadTargetMixin, BaseTestGenerator):
    """Positive: newly-created upload files are mode 0o600.

    Documented behavior change vs. the umask-default 0o644 of the prior
    open(name, 'wb'). Release notes call this out.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("POSIX mode bits not meaningful on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        target = os.path.join(self.tmpdir, "private.txt")
        with _open_upload_target(target, self.tmpdir) as f:
            f.write(b"x")
        mode = os.stat(target).st_mode & 0o777
        self.assertEqual(
            mode, 0o600,
            "Expected 0o600 (owner-only), got 0o%o" % mode)


class TestOpenUploadTargetRejectsLeafSymlink(
        _OpenUploadTargetMixin, BaseTestGenerator
):
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
            with _open_upload_target(link_path, self.tmpdir) as f:
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
            with _open_upload_target(link_path, self.tmpdir) as f:
                f.write(b"OWNED")
        self.assertIn(
            cm.exception.errno,
            (errno.ELOOP, errno.EMLINK),
            "Expected ELOOP/EMLINK, got errno=%d" % cm.exception.errno)
        # No file must have been created at the symlink's target.
        self.assertFalse(os.path.exists(outside_path))


class TestOpenUploadTargetRejectsParentSymlink(
        _OpenUploadTargetMixin, BaseTestGenerator):
    """Negative: a parent directory swapped for a symlink to a directory
    outside the storage root is refused, not followed.

    Checking the leaf alone leaves this open: every component below the
    root must be opened without following a symlink.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        storage = os.path.join(self.tmpdir, "storage")
        outside_dir = os.path.join(self.tmpdir, "outside")
        os.makedirs(outside_dir)
        os.makedirs(storage)
        victim = os.path.join(outside_dir, "file.sql")
        with open(victim, "wb") as f:
            f.write(b"victim")
        os.symlink(outside_dir, os.path.join(storage, "sub"))

        with self.assertRaises(OSError) as cm:
            with _open_upload_target(
                    os.path.join(storage, "sub", "file.sql"), storage) as f:
                f.write(b"OWNED")
        self.assertIn(cm.exception.errno, (errno.ELOOP, errno.EMLINK))
        with open(victim, "rb") as f:
            self.assertEqual(f.read(), b"victim")


class TestOpenUploadTargetDesktopFollowsLeafSymlink(
        _OpenUploadTargetMixin, BaseTestGenerator):
    """Desktop mode: a leaf symlink is followed, not refused.

    There is no storage sandbox in desktop mode, so O_NOFOLLOW protects
    nothing there, and it breaks saves on filesystems that return ELOOP
    for it on regular files (Flatpak's document portal, issue #10482).
    """

    scenarios = [('default', dict())]
    server_mode = False

    def runTest(self):
        from pgadmin.misc.file_manager import _open_upload_target
        real_target = os.path.join(self.tmpdir, "real.sql")
        with open(real_target, "wb") as f:
            f.write(b"OLD")
        link_path = os.path.join(self.tmpdir, "link.sql")
        try:
            os.symlink(real_target, link_path)
        except (OSError, NotImplementedError):
            self.skipTest("Cannot create symlinks on this platform")

        with _open_upload_target(link_path, self.tmpdir) as f:
            f.write(b"NEW")

        self.assertTrue(os.path.islink(link_path))
        with open(real_target, "rb") as f:
            self.assertEqual(f.read(), b"NEW")


class TestOpenUploadTargetDesktopUsesUmask(
        _OpenUploadTargetMixin, BaseTestGenerator):
    """Desktop mode: new files get the umask default, not 0o600."""

    scenarios = [('default', dict())]
    server_mode = False

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("POSIX mode bits not meaningful on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        umask = os.umask(0o022)
        try:
            target = os.path.join(self.tmpdir, "desktop.sql")
            with _open_upload_target(target, self.tmpdir) as f:
                f.write(b"x")
        finally:
            os.umask(umask)
        self.assertEqual(os.stat(target).st_mode & 0o777, 0o644)


class TestOpenUploadTargetRejectsHardLink(
        _OpenUploadTargetMixin, BaseTestGenerator):
    """A hard link is refused on upload, and its target is left intact.

    O_NOFOLLOW cannot detect a hard link - it is an ordinary directory entry
    for an existing inode - so the open succeeds and the st_nlink check is
    what refuses a second name that could point at a file outside storage.
    O_TRUNC is deferred until after that check, so the target is never
    emptied. On the base commit the upload truncates and overwrites it.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("hard-link semantics differ on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        victim = os.path.join(self.tmpdir, "victim.txt")
        with open(victim, "wb") as f:
            f.write(b"VICTIM")
        link_path = os.path.join(self.tmpdir, "hardlink.txt")
        os.link(victim, link_path)

        with self.assertRaises(OSError) as ctx:
            with _open_upload_target(link_path, self.tmpdir) as f:
                f.write(b"EVIL")
        self.assertEqual(ctx.exception.errno, errno.EPERM)
        with open(victim, "rb") as f:
            self.assertEqual(f.read(), b"VICTIM")


class TestOpenUploadTargetRejectsFifo(
        _OpenUploadTargetMixin, BaseTestGenerator):
    """A FIFO at the upload path is refused with a path-free
    'Not a regular file', and the non-blocking open does not hang waiting for
    a reader. The ENXIO translation lives in _open_beneath(), so the upload
    path gets it without its own handling.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("POSIX FIFOs unavailable on Windows")
        from pgadmin.misc.file_manager import _open_upload_target
        fifo = os.path.join(self.tmpdir, "pipe")
        os.mkfifo(fifo)
        with self.assertRaises(OSError) as ctx:
            _open_upload_target(fifo, self.tmpdir).close()
        self.assertEqual(ctx.exception.strerror, "Not a regular file")


# ---------------------------------------------------------------------------
# save_file() must use the same O_NOFOLLOW-protected open as uploads.
#
# check_access_permission() resolves symlinks and validates containment, but
# save_file() re-joins the path afterwards and, before this fix, wrote through
# a bare open() that would follow a leaf symlink planted *after* the check
# ran. A symlink already present at check time is rejected by the check, so
# the only interesting case is the race, which the negative test below
# reproduces deterministically by planting the symlink from inside the check
# itself.
#
# These drive the real endpoint through the harness's already-authenticated
# test client, so the whole decorator stack and request path are exercised.
# ---------------------------------------------------------------------------

SAVE_FILE_URL = '/file_manager/save_file/'


class _SaveFileMixin:
    """Mixin (NOT a TestCase) — storage sandbox setup for save_file tests."""

    def setUp(self):
        # Pure request/filesystem logic: no Postgres connection needed, so
        # BaseTestGenerator.setUp()'s connect_server() is deliberately skipped.
        unittest.TestCase.setUp(self)
        if sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        self.tmpdir = tempfile.mkdtemp(prefix="pga_filemgr_savefile_")
        self.storage_dir = os.path.join(self.tmpdir, "storage")
        os.makedirs(self.storage_dir)

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _save_file(self, file_name, file_content, check_side_effect=None):
        """POST to save_file with storage confined to self.storage_dir.

        `check_side_effect`, when given, replaces check_access_permission —
        used to simulate an attacker winning the check-to-open race.
        """
        payload = json.dumps({
            "file_name": file_name,
            "file_content": file_content,
        })

        patches = [
            patch('pgadmin.misc.file_manager.get_storage_directory',
                  return_value=self.storage_dir),
            patch('pgadmin.misc.file_manager.Preferences.module'),
        ]
        if check_side_effect is not None:
            patches.append(
                patch('pgadmin.misc.file_manager.Filemanager.'
                      'check_access_permission',
                      side_effect=check_side_effect))

        with contextlib.ExitStack() as stack:
            mocks = [stack.enter_context(p) for p in patches]
            mocks[1].return_value.preference.return_value.get \
                .return_value = MY_STORAGE
            return self.tester.post(SAVE_FILE_URL, data=payload,
                                    content_type='application/json')


class TestSaveFileRejectsLeafSymlink(_SaveFileMixin, BaseTestGenerator):
    """save_file() must not follow a symlink raced in after the check."""

    scenarios = [('default', dict())]

    def runTest(self):
        # SERVER_MODE can't be flipped for an endpoint test: it also
        # changes the authentication path the request takes, which the
        # harness's session was not set up for.
        if not config.SERVER_MODE:
            self.skipTest("Leaf-symlink hardening only applies in server "
                          "mode")
        outside_target = os.path.join(self.tmpdir, "outside.txt")
        with open(outside_target, "wb") as f:
            f.write(b"VICTIM")

        link_path = os.path.join(self.storage_dir, "evil.sql")
        real_check = Filemanager.check_access_permission

        def check_then_lose_the_race(*args, **kwargs):
            # The real containment check runs and passes: at this instant
            # the leaf is absent, so nothing escapes the storage root.
            checked_path = real_check(*args, **kwargs)
            # T+0: the attacker swaps a symlink into the leaf, exactly the
            # window the bare open() used to write through.
            os.symlink(outside_target, link_path)
            return checked_path

        response = self._save_file(
            "/evil.sql", "OWNED",
            check_side_effect=check_then_lose_the_race)

        self.assertEqual(response.status_code, 500)
        # Assert on *why* it failed. A bare status check would also pass if
        # the write never happened for some unrelated reason.
        self.assertIn(
            "symbolic link",
            response.json['errormsg'],
            "Expected the symlink-specific error, got: %s"
            % response.json['errormsg'])
        # The property that actually matters: nothing was written outside.
        with open(outside_target, "rb") as f:
            self.assertEqual(f.read(), b"VICTIM")


class TestSaveFileWritesRegularFile(_SaveFileMixin, BaseTestGenerator):
    """Positive control: an ordinary save must still succeed.

    Without this, a broken _open_upload_target() would leave the negative
    test above green while every Query Tool / ERD save in the product fails.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        target = os.path.join(self.storage_dir, "ok.sql")
        # In desktop mode there is no storage directory and a path is
        # absolute.
        response = self._save_file(
            "/ok.sql" if config.SERVER_MODE else target, "SELECT 1;")

        self.assertEqual(response.status_code, 200)
        with open(target, "rb") as f:
            self.assertEqual(f.read(), b"SELECT 1;")
        # In server mode the helper opens with mode 0o600; pin it so the
        # documented behavioral change cannot regress silently.
        if config.SERVER_MODE:
            self.assertEqual(os.stat(target).st_mode & 0o777, 0o600)


class _SaveFileEloopMixin(_SaveFileMixin):
    """Drive save_file() into an ELOOP from the open, with the symlink
    refusal switched on or off, independently of the harness's SERVER_MODE.

    `_refuses_leaf_symlinks()` is the single condition that both sets
    O_NOFOLLOW and selects the symlink-specific error message, so patching
    it is enough to exercise either side of the branch.
    """

    refuses = None

    def _save_with_eloop(self):
        eloop = OSError(errno.ELOOP, os.strerror(errno.ELOOP))
        with patch('pgadmin.misc.file_manager._open_upload_target',
                   side_effect=eloop), \
                patch('pgadmin.misc.file_manager._refuses_leaf_symlinks',
                      return_value=self.refuses):
            return self._save_file("/looped.sql", "SELECT 1;")


class TestSaveFileEloopReportsSymlinkRefusal(
        _SaveFileEloopMixin, BaseTestGenerator):
    """With O_NOFOLLOW in play, ELOOP means the refusal was deliberate."""

    scenarios = [('default', dict())]
    refuses = True

    def runTest(self):
        response = self._save_with_eloop()

        self.assertEqual(response.status_code, 500)
        self.assertIn("symbolic link", response.json['errormsg'])


class TestSaveFileEloopReportsRawErrorWithoutNofollow(
        _SaveFileEloopMixin, BaseTestGenerator):
    """Without O_NOFOLLOW (desktop mode), ELOOP is a real filesystem error
    and must be reported as such, not as a refusal pgAdmin never made."""

    scenarios = [('default', dict())]
    refuses = False

    def runTest(self):
        response = self._save_with_eloop()

        self.assertEqual(response.status_code, 500)
        # The raw strerror ("Too many levels of symbolic links") shares a
        # substring with the refusal message, so assert on whole messages.
        self.assertEqual(response.json['errormsg'],
                         "Error: %s" % os.strerror(errno.ELOOP))


# ---------------------------------------------------------------------------
# download() — the path checked must be the path served.
# ---------------------------------------------------------------------------

def _skip_check(in_dir, path, skip_permission_check=False):
    """Stand-in for check_access_permission() that skips the check but,
    like it, returns the path to act on: simulates an attacker who wins
    the race between the check and the file operation."""
    return Filemanager.get_abs_path(in_dir, path)


class _DownloadMixin:
    """Mixin (NOT a TestCase) — storage layout for download() tests.

    The user's storage directory ends in a repeated name
    (.../storage/storage), as it does for a user called "storage", next to
    another user's directory holding a file they must not be able to read.
    """

    def setUp(self):
        # Filesystem and request logic only: no Postgres connection needed.
        unittest.TestCase.setUp(self)
        self.outer = tempfile.mkdtemp(prefix="pga_filemgr_download_")
        self.storage_dir = os.path.join(self.outer, "storage", "storage")
        os.makedirs(self.storage_dir)
        other_dir = os.path.join(self.outer, "storage", "alice")
        os.makedirs(other_dir)
        with open(os.path.join(other_dir, "secret.sql"), "w") as f:
            f.write("ALICE_SECRET")
        with open(os.path.join(self.storage_dir, "mine.sql"), "w") as f:
            f.write("MY_DATA")

        self._prev_server_mode = config.SERVER_MODE
        config.SERVER_MODE = True

    def tearDown(self):
        config.SERVER_MODE = self._prev_server_mode
        shutil.rmtree(self.outer, ignore_errors=True)

    def _download(self, path, storage_dir=None, headers=False):
        """Call download() for `path` with the storage directory confined
        to `storage_dir` (self.storage_dir by default), and return
        (status code, response body), plus the headers if asked."""
        fm = Filemanager.__new__(Filemanager)
        fm.trans_id = 0
        fm.dir = self.storage_dir if storage_dir is None else storage_dir
        fm.shared_dir = None
        with self.app.test_request_context(), \
                patch.object(fm, 'validate_request', return_value=True):
            response = fm.download(path)
            response.direct_passthrough = False
            body = response.get_data()
            response.close()
            if headers:
                return response.status_code, body, response.headers
            return response.status_code, body


class TestDownloadServesFileInsideStorage(_DownloadMixin, BaseTestGenerator):
    """A file inside the user's storage directory is downloaded."""

    scenarios = [('default', dict())]

    def runTest(self):
        status, body, headers = self._download("/mine.sql", headers=True)
        self.assertEqual((status, body), (200, b"MY_DATA"))
        self.assertEqual(headers['Content-Length'], str(len(b"MY_DATA")))
        self.assertIn('Last-Modified', headers)
        # The file object gives no way to serve a range, so none is offered.
        self.assertNotIn('Accept-Ranges', headers)


class TestDownloadRejectsEscapeThroughRepeatedName(
        _DownloadMixin, BaseTestGenerator):
    """A path that leaves the storage directory is refused, even when the
    storage directory's name repeats the one above it, so that the path
    appended to itself would land back inside."""

    scenarios = [
        # As on Windows: the file is opened by name, so only the check
        # stands between the path and the other user's file.
        ('check', dict(check=True, beneath=False)),
        # The descriptor-relative open refuses it on its own too.
        ('descriptor-relative open', dict(check=False, beneath=True)),
    ]

    def runTest(self):
        if self.beneath and sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        path = "/../../storage/alice/secret.sql"
        with patch('pgadmin.misc.file_manager._refuses_leaf_symlinks',
                   return_value=self.beneath):
            if self.check:
                with self.assertRaises(PermissionError):
                    self._download(path)
                return
            with patch('pgadmin.misc.file_manager.Filemanager.'
                       'check_access_permission', side_effect=_skip_check):
                status, body = self._download(path)
        self.assertEqual(status, 500)
        self.assertNotIn(b"ALICE_SECRET", body)


class TestDownloadRejectsLeafSymlinkSwappedInAfterCheck(
        _DownloadMixin, BaseTestGenerator):
    """A symbolic link swapped in after the check is not followed out of
    the storage directory."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        os.symlink(os.path.join(self.outer, "storage", "alice", "secret.sql"),
                   os.path.join(self.storage_dir, "link.sql"))
        # Simulate the attacker winning the check-to-open race.
        with patch('pgadmin.misc.file_manager.Filemanager.'
                   'check_access_permission', side_effect=_skip_check):
            status, body = self._download("/link.sql")
        self.assertEqual(status, 500)
        self.assertEqual(json.loads(body)['errormsg'],
                         "Refusing to read through a symbolic link.")
        self.assertNotIn(b"ALICE_SECRET", body)


class TestDownloadMissingFileReportsNotFound(
        _DownloadMixin, BaseTestGenerator):
    """A missing file is reported as not found, without the storage
    directory's path."""

    scenarios = [('default', dict())]

    def runTest(self):
        status, body = self._download("/missing.sql")
        self.assertEqual(status, 404)
        self.assertIn("/missing.sql", json.loads(body)['errormsg'])
        self.assertNotIn(self.storage_dir.encode(), body)


class TestDownloadDesktopModeServesAbsolutePath(
        _DownloadMixin, BaseTestGenerator):
    """In desktop mode there is no storage directory and the path is
    absolute; the file is served as before."""

    scenarios = [('default', dict())]

    def runTest(self):
        config.SERVER_MODE = False
        self.assertEqual(
            self._download(os.path.join(self.storage_dir, "mine.sql"), ''),
            (200, b"MY_DATA"))


class _PrefixSiblingMixin(_DownloadMixin):
    """Mixin (NOT a TestCase) — another user's storage directory whose name
    is this user's followed by more characters (bob and bobx), so the path
    "x/secret.sql", appended to the storage directory as a plain string,
    would land in the other user's directory instead of bob/x/."""

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.outer = tempfile.mkdtemp(prefix="pga_filemgr_prefix_")
        self.storage_dir = os.path.join(self.outer, "storage", "bob")
        self.victim_dir = os.path.join(self.outer, "storage", "bobx")
        os.makedirs(os.path.join(self.storage_dir, "x"))
        os.makedirs(self.victim_dir)
        self.victim = os.path.join(self.victim_dir, "secret.sql")
        with open(self.victim, "w") as f:
            f.write("BOBBY_SECRET")
        # The user's own file of the same name, which is the one meant.
        self.own = os.path.join(self.storage_dir, "x", "secret.sql")
        with open(self.own, "w") as f:
            f.write("BOB_DATA")

        self._prev_server_mode = config.SERVER_MODE
        config.SERVER_MODE = True

    def _fm(self):
        fm = Filemanager.__new__(Filemanager)
        fm.trans_id = 0
        fm.dir = self.storage_dir
        fm.shared_dir = None
        return fm

    def _call(self, method, *args):
        fm = self._fm()
        with self.app.test_request_context(), \
                patch.object(fm, 'validate_request', return_value=True):
            return getattr(fm, method)(*args)


class TestDownloadWithoutLeadingSeparatorStaysInStorage(
        _PrefixSiblingMixin, BaseTestGenerator):
    """A download path without a leading separator does not reach a
    sibling directory whose name starts with the storage directory's."""

    scenarios = [
        ('check', dict(beneath=False)),
        ('descriptor-relative open', dict(beneath=True)),
    ]

    def runTest(self):
        if self.beneath and sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        with patch('pgadmin.misc.file_manager._refuses_leaf_symlinks',
                   return_value=self.beneath):
            self.assertEqual(self._download("x/secret.sql"),
                             (200, b"BOB_DATA"))


class TestDeleteWithoutLeadingSeparatorStaysInStorage(
        _PrefixSiblingMixin, BaseTestGenerator):
    """delete() removes the path it checked, not a file in a sibling
    directory whose name starts with the storage directory's."""

    scenarios = [('default', dict())]

    def runTest(self):
        self._call('delete', "x/secret.sql")
        self.assertTrue(os.path.exists(self.victim))
        self.assertFalse(os.path.exists(self.own))


class TestRenameWithoutLeadingSeparatorStaysInStorage(
        _PrefixSiblingMixin, BaseTestGenerator):
    """rename() moves the path it checked, not a file in a sibling
    directory whose name starts with the storage directory's."""

    scenarios = [('default', dict())]

    def runTest(self):
        self._call('rename', "x/secret.sql", "renamed.sql")
        self.assertTrue(os.path.exists(self.victim))
        self.assertTrue(os.path.exists(
            os.path.join(self.storage_dir, "x", "renamed.sql")))


class TestRenameChecksNewNameAgainstItsDirectory(
        _PrefixSiblingMixin, BaseTestGenerator):
    """The new name is relative to the old file's directory, so it is
    checked there: moving a file up from a subdirectory to the storage
    directory is allowed, and going further up is not."""

    scenarios = [('default', dict())]

    def runTest(self):
        self._call('rename', "/x/secret.sql", "../moved.sql")
        self.assertTrue(os.path.exists(
            os.path.join(self.storage_dir, "moved.sql")))
        with self.assertRaises(PermissionError):
            self._call('rename', "/moved.sql", "../bobx/moved.sql")


class TestRenameWithinStorageStillWorks(
        _PrefixSiblingMixin, BaseTestGenerator):
    """A file in a subdirectory of the storage directory is renamed."""

    scenarios = [('default', dict())]

    def runTest(self):
        with open(os.path.join(self.storage_dir, "x", "mine.sql"), "w") as f:
            f.write("MY_DATA")
        self._call('rename', "/x/mine.sql", "renamed.sql")
        self.assertTrue(os.path.exists(
            os.path.join(self.storage_dir, "x", "renamed.sql")))


class TestIsFileExistWithoutLeadingSeparatorStaysInStorage(
        _PrefixSiblingMixin, BaseTestGenerator):
    """is_file_exist() looks at the path it checked, so it does not report
    files in a sibling directory whose name starts with the storage
    directory's."""

    scenarios = [('default', dict())]

    def runTest(self):
        self.assertEqual(
            self._call('is_file_exist', "x/", "secret.sql")['Code'], 1)
        os.remove(self.own)
        self.assertEqual(
            self._call('is_file_exist', "x/", "secret.sql")['Code'], 0)


class TestFileOperationsRefusePathsOutsideStorage(
        _PrefixSiblingMixin, BaseTestGenerator):
    """download(), delete(), rename() and is_file_exist() refuse a path
    that leaves the storage directory, with or without a leading
    separator, and leave the other user's file alone."""

    scenarios = [
        ('download, leading separator',
         dict(method='download', args=("/../bobx/secret.sql",))),
        ('download, no leading separator',
         dict(method='download', args=("../bobx/secret.sql",))),
        ('delete, leading separator',
         dict(method='delete', args=("/../bobx/secret.sql",))),
        ('delete, no leading separator',
         dict(method='delete', args=("../bobx/secret.sql",))),
        ('rename from outside',
         dict(method='rename', args=("/../bobx/secret.sql", "mine.sql"))),
        ('rename to outside',
         dict(method='rename', args=("/x/secret.sql",
                                     "../../bobx/secret.sql"))),
        ('is_file_exist, leading separator',
         dict(method='is_file_exist', args=("/../bobx/", "secret.sql"))),
        ('is_file_exist, no leading separator',
         dict(method='is_file_exist', args=("../bobx/", "secret.sql"))),
    ]

    def runTest(self):
        with self.assertRaises(PermissionError):
            self._call(self.method, *self.args)
        with open(self.victim) as f:
            self.assertEqual(f.read(), "BOBBY_SECRET")
        with open(self.own) as f:
            self.assertEqual(f.read(), "BOB_DATA")


# ---------------------------------------------------------------------------
# Every other File Manager entry point acts on the path that was checked.
# ---------------------------------------------------------------------------

LOAD_FILE_URL = '/file_manager/load_file/'


class _StorageOpsMixin(_PrefixSiblingMixin):
    """Mixin (NOT a TestCase) — bob's storage directory with a file of his
    own, another user's directory (alice) and a file outside the storage
    root altogether."""

    def setUp(self):
        super().setUp()
        with open(os.path.join(self.storage_dir, "mine.sql"), "w") as f:
            f.write("MY_DATA")
        self.alice_dir = os.path.join(self.outer, "storage", "alice")
        os.makedirs(self.alice_dir)
        self.outside = os.path.join(self.outer, "outside.txt")
        with open(self.outside, "w") as f:
            f.write("OUTSIDE")

    def _storage_patches(self):
        prefs = patch('pgadmin.misc.file_manager.Preferences.module')
        return [
            patch('pgadmin.misc.file_manager.get_storage_directory',
                  return_value=self.storage_dir),
            prefs,
        ]

    def _post(self, url, payload, extra_patches=()):
        # As for the save_file tests above: SERVER_MODE cannot be flipped
        # for an endpoint test, as it also changes how the request is
        # authenticated.
        if not self._prev_server_mode:
            self.skipTest("Endpoint test needs a server-mode run")
        with contextlib.ExitStack() as stack:
            mocks = [stack.enter_context(p) for p in
                     self._storage_patches() + list(extra_patches)]
            mocks[1].return_value.preference.return_value.get \
                .return_value = MY_STORAGE
            return self.tester.post(url, data=json.dumps(payload),
                                    content_type='application/json')

    def _load(self, file_name):
        return self._post(LOAD_FILE_URL,
                          {"file_name": file_name, "storage": MY_STORAGE})

    def _unchanged(self):
        with open(self.outside) as f:
            self.assertEqual(f.read(), "OUTSIDE")
        with open(self.victim) as f:
            self.assertEqual(f.read(), "BOBBY_SECRET")


class TestLoadFileReadsFileInsideStorage(_StorageOpsMixin, BaseTestGenerator):
    """load_file reads the user's own file."""

    scenarios = [
        ('leading separator', dict(path="/mine.sql", data=b"MY_DATA")),
        ('no leading separator', dict(path="mine.sql", data=b"MY_DATA")),
        # bob's own x/secret.sql, not the one in bobx.
        ('subdirectory, no leading separator',
         dict(path="x/secret.sql", data=b"BOB_DATA")),
    ]

    def runTest(self):
        response = self._load(self.path)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, self.data)


class TestLoadFileRefusesPathsOutsideStorage(
        _StorageOpsMixin, BaseTestGenerator):
    """load_file does not read a file outside the storage directory, even
    when stripping separators from the front of the path would turn it
    into an absolute path that the check never saw."""

    scenarios = [
        ('dot-dot', dict(path="/../../outside.txt", posix_only=False,
                         error="Access denied")),
        # On POSIX a backslash is an ordinary character, so the check sees
        # a directory named "\\" inside storage, which does not exist.
        ('separators stripped to an absolute path',
         dict(path=None, posix_only=True,
              error=os.strerror(errno.ENOENT))),
    ]

    def runTest(self):
        if self.posix_only and sys.platform == "win32":
            self.skipTest("A backslash is a separator on Windows")
        path = self.path if self.path is not None else "/\\" + self.outside
        response = self._load(path)
        # Refused by load_file itself, not by anything else on the way.
        self.assertEqual(response.status_code, 500)
        self.assertIn(self.error, response.json['errormsg'])
        self.assertNotIn(b"OUTSIDE", response.data)


class TestLoadFileReportsMissingFile(_StorageOpsMixin, BaseTestGenerator):
    """A missing file is reported as an error rather than failing while
    reading it."""

    scenarios = [('default', dict())]

    def runTest(self):
        response = self._load("/missing.sql")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json['errormsg'],
                         os.strerror(errno.ENOENT))


class TestSaveFileRefusesPathsOutsideStorage(
        _StorageOpsMixin, BaseTestGenerator):
    """save_file does not write outside the storage directory, including
    where the file is opened by name (as on Windows), so the check is the
    only guard."""

    scenarios = [
        ('dot-dot', dict(path="/../../outside.txt", posix_only=False)),
        ('separators stripped to an absolute path',
         dict(path=None, posix_only=True)),
    ]

    def runTest(self):
        if self.posix_only and sys.platform == "win32":
            self.skipTest("A backslash is a separator on Windows")
        path = self.path if self.path is not None else "/\\" + self.outside
        response = self._post(
            SAVE_FILE_URL, {"file_name": path, "file_content": "OWNED"},
            [patch('pgadmin.misc.file_manager._refuses_leaf_symlinks',
                   return_value=False)])
        # Refused by save_file itself, not by anything else on the way.
        self.assertEqual(response.status_code, 500)
        self.assertIn('errormsg', response.json)
        self._unchanged()


class TestFilenameWithFileManagerPathStaysInStorage(
        _StorageOpsMixin, BaseTestGenerator):
    """filename_with_file_manager_path(), behind Import/Export Data,
    Backup, Restore and the Google client secret, returns the path it
    checked."""

    scenarios = [('default', dict())]

    def _resolve(self, path):
        from pgadmin.utils import filename_with_file_manager_path
        with self.app.test_request_context(), \
                patch('pgadmin.utils.get_file_manager_storage_dir',
                      return_value=self.storage_dir):
            return filename_with_file_manager_path(path)

    def runTest(self):
        self.assertEqual(os.path.realpath(self._resolve("/mine.sql")),
                         os.path.realpath(
                             os.path.join(self.storage_dir, "mine.sql")))
        with self.assertRaises(PermissionError):
            self._resolve("/../../outside.txt")
        if sys.platform != "win32":
            resolved = os.path.realpath(self._resolve("/\\" + self.outside))
            self.assertTrue(resolved.startswith(
                os.path.realpath(self.storage_dir) + os.sep), resolved)


class TestListFilesystemStaysInStorage(_StorageOpsMixin, BaseTestGenerator):
    """getfolder lists the folder it checked. Folder names that look
    percent-encoded are not decoded a second time after the check."""

    scenarios = [('default', dict())]

    def _list(self, path):
        return Filemanager.list_filesystem(
            self.storage_dir, path, {}, '*', True)

    def runTest(self):
        names = [f['Filename'] for f in self._list("/")]
        self.assertIn("mine.sql", names)

        with self.assertRaises(PermissionError):
            self._list("/../")

        # Folders literally named "%2e%2e", which the user can create.
        os.makedirs(os.path.join(self.storage_dir, "%2e%2e", "%2e%2e"))
        listing = self._list("/%252e%252e/%252e%252e/")
        self.assertEqual(listing, [])


class TestAddFolder(_StorageOpsMixin, BaseTestGenerator):
    """addfolder creates a folder that does not exist yet inside storage,
    and refuses one that would be created outside it."""

    scenarios = [('default', dict())]

    def runTest(self):
        self._call('addfolder', "/", "newdir")
        self.assertTrue(os.path.isdir(
            os.path.join(self.storage_dir, "newdir")))

        self._call('addfolder', "/x/", "nested")
        self.assertTrue(os.path.isdir(
            os.path.join(self.storage_dir, "x", "nested")))

        # An existing name gets a suffix, still inside storage.
        res = self._call('addfolder', "/", "newdir")
        self.assertEqual(res['Name'], "newdir_1")
        self.assertTrue(os.path.isdir(
            os.path.join(self.storage_dir, "newdir_1")))

        # A parent that does not exist is an error, and nothing is created.
        res = self._call('addfolder', "/nodir/", "new")
        self.assertEqual(res.status_code, 500)
        self.assertFalse(os.path.exists(
            os.path.join(self.storage_dir, "nodir")))

        # Split across path and name, the check of the two joined as they
        # are would see a name inside storage; the folder would be created
        # in another user's directory.
        with self.assertRaises(PermissionError):
            self._call('addfolder', "/..", "alice/pwned")
        self.assertFalse(os.path.exists(
            os.path.join(self.alice_dir, "pwned")))

        with self.assertRaises(PermissionError):
            self._call('addfolder', "/", "../escape")
        self.assertFalse(os.path.exists(
            os.path.join(self.outer, "storage", "escape")))


class TestUpload(_StorageOpsMixin, BaseTestGenerator):
    """Upload writes a new file inside storage, and refuses one that would
    be written outside it."""

    scenarios = [('default', dict())]

    def _upload(self, currentpath, filename):
        req = SimpleNamespace(
            form={'currentpath': currentpath},
            files={'newfile': FileStorage(io.BytesIO(b"UPLOADED"),
                                          filename=filename)})
        return self._call('add', req)

    def runTest(self):
        self._upload("/", "new.sql")
        with open(os.path.join(self.storage_dir, "new.sql"), "rb") as f:
            self.assertEqual(f.read(), b"UPLOADED")

        # Without a leading separator: bob's own x/, not bobx.
        self._upload("x/", "new.sql")
        self.assertTrue(os.path.exists(
            os.path.join(self.storage_dir, "x", "new.sql")))
        self.assertFalse(os.path.exists(
            os.path.join(self.victim_dir, "new.sql")))

        # A folder that does not exist is an error, and nothing is created.
        res = self._upload("/nodir/", "new.sql")
        self.assertEqual(res.status_code, 500)
        self.assertFalse(os.path.exists(
            os.path.join(self.storage_dir, "nodir")))

        for currentpath, filename in (("/", "../escape.sql"),
                                      ("/../alice/", "escape.sql")):
            res = self._upload(currentpath, filename)
            self.assertEqual(res.status_code, 401)
        self.assertFalse(os.path.exists(
            os.path.join(self.outer, "storage", "escape.sql")))
        self.assertFalse(os.path.exists(
            os.path.join(self.alice_dir, "escape.sql")))


# ---------------------------------------------------------------------------
# Symbolic links swapped in after the check, and other related fixes.
# ---------------------------------------------------------------------------

class _SubdirMixin(_StorageOpsMixin):
    """Mixin (NOT a TestCase) — a subdirectory of the storage directory and
    a file outside the storage root, on every platform."""

    def setUp(self):
        super().setUp()
        self.sub = os.path.join(self.storage_dir, "sub")
        os.makedirs(self.sub)
        self.outside_dir = os.path.join(self.outer, "outside_dir")
        os.makedirs(self.outside_dir)
        self.outside_file = os.path.join(self.outside_dir, "f.sql")
        with open(self.outside_file, "w") as f:
            f.write("OUTSIDE")


class _SwapMixin(_StorageOpsMixin):
    """Mixin (NOT a TestCase) — a subdirectory of the storage directory
    that the tests replace with a symbolic link to a directory outside it,
    as an attacker winning the check-to-use race would."""

    def setUp(self):
        # Skip before the mixins change config.SERVER_MODE: tearDown() does
        # not run when setUp() raises, so nothing would restore it.
        if sys.platform == "win32":
            self.skipTest("O_NOFOLLOW unavailable on Windows")
        super().setUp()
        self.sub = os.path.join(self.storage_dir, "sub")
        os.makedirs(self.sub)
        self.outside_dir = os.path.join(self.outer, "outside_dir")
        os.makedirs(self.outside_dir)
        self.outside_file = os.path.join(self.outside_dir, "f.sql")
        with open(self.outside_file, "w") as f:
            f.write("OUTSIDE")

    def swap_sub(self):
        shutil.rmtree(self.sub)
        os.symlink(self.outside_dir, self.sub)

    def _call_racing(self, method, *args):
        with patch('pgadmin.misc.file_manager.Filemanager.'
                   'check_access_permission', side_effect=_skip_check):
            return self._call(method, *args)


class TestDeleteDoesNotFollowSwappedParent(_SwapMixin, BaseTestGenerator):
    """delete() refuses a parent directory swapped for a symbolic link."""

    scenarios = [('default', dict())]

    def runTest(self):
        self.swap_sub()
        res = self._call_racing('delete', "/sub/f.sql")
        self.assertEqual(res.status_code, 500)
        self.assertIn("symbolic link", res.json['errormsg'])
        self.assertTrue(os.path.exists(self.outside_file))


class TestDeleteRemovesLeafSymlinkItself(_SwapMixin, BaseTestGenerator):
    """A symbolic link at the leaf is removed, not what it names, even
    when it names a directory."""

    scenarios = [
        ('to a file', dict(directory=False)),
        ('to an empty directory', dict(directory=True)),
    ]

    def runTest(self):
        link = os.path.join(self.storage_dir, "link")
        if self.directory:
            target = os.path.join(self.outer, "empty_dir")
            os.makedirs(target)
        else:
            target = self.outside_file
        os.symlink(target, link)
        res = self._call_racing('delete', "/link")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(os.path.lexists(link))
        self.assertTrue(os.path.exists(target))


class TestDeleteStillDeletesFilesAndFolders(_SubdirMixin, BaseTestGenerator):
    """delete() removes a file and an empty folder inside storage."""

    scenarios = [('default', dict())]

    def runTest(self):
        with open(os.path.join(self.sub, "f.sql"), "w") as f:
            f.write("MINE")
        self._call('delete', "/sub/f.sql")
        self.assertFalse(os.path.exists(os.path.join(self.sub, "f.sql")))
        self._call('delete', "/sub")
        self.assertFalse(os.path.exists(self.sub))


class TestDeleteRefusesStorageDirectory(_StorageOpsMixin, BaseTestGenerator):
    """The storage directory itself cannot be deleted, whether or not the
    delete is done relative to directory descriptors (it is not on
    Windows, so only the explicit refusal stops it there)."""

    scenarios = [
        ('slash', dict(path="/", beneath=True)),
        ('dot', dict(path="/.", beneath=True)),
        ('slash, by name', dict(path="/", beneath=False)),
        ('dot, by name', dict(path="/.", beneath=False)),
    ]

    def runTest(self):
        for name in os.listdir(self.storage_dir):
            target = os.path.join(self.storage_dir, name)
            if os.path.isdir(target):
                shutil.rmtree(target)
            else:
                os.remove(target)
        with patch('pgadmin.misc.file_manager._acts_beneath',
                   return_value=self.beneath), \
                self.assertRaises(PermissionError):
            self._call('delete', self.path)
        self.assertTrue(os.path.isdir(self.storage_dir))


class TestRenameDoesNotFollowSwappedParent(_SwapMixin, BaseTestGenerator):
    """rename() refuses a parent directory of the source or the target
    swapped for a symbolic link, so files are neither moved in from nor
    out to the directory it names."""

    scenarios = [
        ('source', dict(old="/sub/f.sql", new="../stolen.sql")),
        ('target', dict(old="/mine.sql", new="sub/mine.sql")),
    ]

    def runTest(self):
        self.swap_sub()
        res = self._call_racing('rename', self.old, self.new)
        self.assertEqual(res.status_code, 500)
        self.assertIn("symbolic link", res.json['errormsg'])
        self.assertTrue(os.path.exists(self.outside_file))
        self.assertTrue(os.path.exists(
            os.path.join(self.storage_dir, "mine.sql")))
        self.assertFalse(os.path.exists(
            os.path.join(self.storage_dir, "stolen.sql")))
        self.assertFalse(os.path.exists(
            os.path.join(self.outside_dir, "mine.sql")))


class TestRenameStillMovesIntoSubfolder(_SubdirMixin, BaseTestGenerator):
    """rename() moves a file into a subfolder of storage."""

    scenarios = [('default', dict())]

    def runTest(self):
        self._call('rename', "/mine.sql", "sub/mine.sql")
        self.assertTrue(os.path.exists(os.path.join(self.sub, "mine.sql")))


class TestLoadFileDoesNotFollowSwappedSymlink(
        _SwapMixin, BaseTestGenerator):
    """load_file refuses a symbolic link swapped in after the check, at
    the leaf or for a parent directory."""

    scenarios = [
        ('leaf', dict(parent=False)),
        ('parent', dict(parent=True)),
    ]

    def runTest(self):
        if self.parent:
            self.swap_sub()
            path = "/sub/f.sql"
        else:
            os.symlink(self.outside_file,
                       os.path.join(self.storage_dir, "link.sql"))
            path = "/link.sql"
        response = self._post(
            LOAD_FILE_URL, {"file_name": path, "storage": MY_STORAGE},
            [patch('pgadmin.misc.file_manager.Filemanager.'
                   'check_access_permission', side_effect=_skip_check)])
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json['errormsg'],
                         "Refusing to read through a symbolic link.")
        self.assertNotIn(b"OUTSIDE", response.data)


class TestReadFileGeneratorWithStorageRoot(_SwapMixin, BaseTestGenerator):
    """read_file_generator() reads a file below its storage directory and
    refuses a symbolic link there."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.file_manager import read_file_generator
        mine = os.path.join(self.storage_dir, "mine.sql")
        self.assertEqual(
            "".join(read_file_generator(mine, 'utf-8', self.storage_dir)),
            "MY_DATA")
        link = os.path.join(self.storage_dir, "link.sql")
        os.symlink(self.outside_file, link)
        with self.assertRaises(OSError) as cm:
            list(read_file_generator(link, 'utf-8', self.storage_dir))
        self.assertIn(cm.exception.errno, (errno.ELOOP, errno.EMLINK))


class TestIsFileExistUsesSelectedSharedStorage(
        _StorageOpsMixin, BaseTestGenerator):
    """is_file_exist() looks in the shared storage that is selected, so
    the overwrite prompt sees files there."""

    scenarios = [('default', dict())]

    def runTest(self):
        shared = os.path.join(self.outer, "shared")
        os.makedirs(shared)
        with open(os.path.join(shared, "s.sql"), "w") as f:
            f.write("SHARED")
        fm = self._fm()
        fm.shared_dir = shared
        with self.app.test_request_context():
            self.assertEqual(fm.is_file_exist("/", "s.sql")['Code'], 1)
            self.assertEqual(fm.is_file_exist("/", "mine.sql")['Code'], 0)


class TestGetClosestParentStaysInStorage(_StorageOpsMixin, BaseTestGenerator):
    """The folder the File Manager opens in is the closest one that still
    exists inside storage; a remembered folder outside storage is never
    tested for existence or returned."""

    scenarios = [('default', dict())]

    def runTest(self):
        _closest = Filemanager.get_closest_parent

        # The File Manager uses forward-slash paths; normalise the separator
        # so the expectations hold on Windows, where os.path.join uses "\".
        def closest(*args):
            return _closest(*args).replace('\\', '/')

        os.makedirs(os.path.join(self.storage_dir, "a"))
        self.assertEqual(closest(self.storage_dir, "/a/"), "/a/")
        self.assertEqual(closest(self.storage_dir, "/a/gone/deeper/"), "/a/")
        self.assertEqual(closest(self.storage_dir, "/gone/"), "/")
        # The folder above storage exists, but is outside it.
        self.assertEqual(closest(self.storage_dir, "/../alice/"), "/")
        # A remembered folder that cannot be resolved is just missing.
        self.assertEqual(closest(self.storage_dir, "/a/\0bad/"), "/a/")
        # Without a separator there is no parent: not "a" for "ab".
        os.makedirs(os.path.join(self.storage_dir, "ab"))
        self.assertEqual(closest(self.storage_dir, "a"), "a/")
        self.assertEqual(closest(self.storage_dir, "abc"), "/")


class TestLoadFileDoesNotFollowSymlinkSwappedBeforeRead(
        _SwapMixin, BaseTestGenerator):
    """load_file opens the file twice, to look at its start and then to
    read it; a symbolic link swapped in between is not followed either."""

    scenarios = [('default', dict())]

    def runTest(self):
        link = os.path.join(self.storage_dir, "link.sql")
        os.symlink(self.outside_file, link)
        try:
            response = self._post(
                LOAD_FILE_URL, {"file_name": "/link.sql",
                                "storage": MY_STORAGE},
                [patch('pgadmin.misc.file_manager.Filemanager.'
                       'check_access_permission', side_effect=_skip_check),
                 # The first open saw a regular file.
                 patch('pgadmin.misc.file_manager.Filemanager.'
                       'check_file_for_bom_and_binary',
                       return_value=(True, None, False, False, 'utf-8'))])
            data = response.data
        except OSError as e:
            self.assertIn(e.errno, (errno.ELOOP, errno.EMLINK))
            return
        self.assertNotIn(b"OUTSIDE", data)


class TestDeleteAndRenameByName(_SubdirMixin, BaseTestGenerator):
    """Where delete and rename cannot act relative to directory
    descriptors (desktop mode, Windows), they act by name as before:
    files and folders are deleted and renamed, and a path outside storage
    is still refused by the check."""

    scenarios = [('default', dict())]

    def runTest(self):
        with patch('pgadmin.misc.file_manager._acts_beneath',
                   return_value=False):
            self._call('rename', "/mine.sql", "sub/mine.sql")
            self.assertTrue(os.path.exists(
                os.path.join(self.sub, "mine.sql")))
            self._call('rename', "/sub", "renamed")
            renamed = os.path.join(self.storage_dir, "renamed")
            self.assertTrue(os.path.exists(os.path.join(renamed,
                                                        "mine.sql")))
            self._call('delete', "/renamed/mine.sql")
            self.assertFalse(os.path.exists(os.path.join(renamed,
                                                         "mine.sql")))
            self._call('delete', "/renamed")
            self.assertFalse(os.path.exists(renamed))

            with self.assertRaises(PermissionError):
                self._call('delete', "/../../outside_dir/f.sql")
            with self.assertRaises(PermissionError):
                self._call('rename', "/../../outside_dir/f.sql", "f.sql")
        self.assertTrue(os.path.exists(self.outside_file))


class TestPermissionUsesSelectedSharedStorage(
        _StorageOpsMixin, BaseTestGenerator):
    """permission() checks the path against the shared storage that is
    selected, not the user's own storage directory."""

    scenarios = [('default', dict())]

    def runTest(self):
        # A shared storage next to the user's own: "/../bob/x" is inside
        # the user's own directory, but outside the shared one.
        shared = os.path.join(self.outer, "storage", "shared")
        os.makedirs(shared)
        fm = self._fm()
        fm.shared_dir = shared
        with self.app.test_request_context():
            self.assertEqual(fm.permission("/x")['Code'], 1)
            with self.assertRaises(PermissionError):
                fm.permission("/../bob/x")


class TestRenameReportsTooManyLinksOnLinux(_SubdirMixin, BaseTestGenerator):
    """EMLINK is a symbolic link refusal only on the BSDs that use it for
    O_NOFOLLOW; on Linux it is a real error (a directory at its link
    limit) and is reported as such."""

    scenarios = [
        ('linux', dict(platform='linux', refusal=False)),
        ('freebsd', dict(platform='freebsd14', refusal=True)),
    ]

    def runTest(self):
        with patch('pgadmin.misc.file_manager._platform', self.platform), \
                patch('pgadmin.misc.file_manager._acts_beneath',
                      return_value=True), \
                patch('pgadmin.misc.file_manager._rename_beneath',
                      side_effect=OSError(errno.EMLINK,
                                          os.strerror(errno.EMLINK))):
            res = self._call('rename', "/mine.sql", "sub/mine.sql")
        self.assertEqual(res.status_code, 500)
        if self.refusal:
            self.assertEqual(res.json['errormsg'],
                             "Refusing to rename through a symbolic link.")
        else:
            self.assertIn(os.strerror(errno.EMLINK), res.json['errormsg'])
            self.assertNotIn("symbolic link", res.json['errormsg'])
        # ELOOP is a refusal everywhere.
        from pgadmin.misc.file_manager import _is_nofollow_refusal
        with patch('pgadmin.misc.file_manager._platform', self.platform):
            self.assertTrue(_is_nofollow_refusal(OSError(errno.ELOOP, '')))


class TestDotDotAfterSymlinkIsNotCollapsed(_SwapMixin, BaseTestGenerator):
    """A ".." after a symbolic link inside storage is not collapsed in the
    path's text: the check resolves the link first and so names a
    different file. The path is refused rather than used on the file its
    text names."""

    scenarios = [
        ('delete', dict(method='delete', args=("/link/../mine.sql",))),
        ('rename', dict(method='rename', args=("/link/../mine.sql",
                                               "moved.sql"))),
        ('download', dict(method='download', args=("/link/../mine.sql",))),
    ]

    def setUp(self):
        super().setUp()
        deep = os.path.join(self.storage_dir, "inner", "deep")
        os.makedirs(deep)
        with open(os.path.join(self.storage_dir, "inner", "mine.sql"),
                  "w") as f:
            f.write("INNER_DATA")
        os.symlink(deep, os.path.join(self.storage_dir, "link"))

    def runTest(self):
        res = self._call(self.method, *self.args)
        self.assertEqual(res.status_code, 500)
        self.assertNotIn(b"MY_DATA", res.get_data())
        self.assertNotIn(b"INNER_DATA", res.get_data())
        with open(os.path.join(self.storage_dir, "mine.sql")) as f:
            self.assertEqual(f.read(), "MY_DATA")
        with open(os.path.join(self.storage_dir, "inner", "mine.sql")) as f:
            self.assertEqual(f.read(), "INNER_DATA")


class TestDotDotThroughRealFolderStillWorks(
        _SubdirMixin, BaseTestGenerator):
    """A ".." after a real folder is followed as before."""

    scenarios = [('default', dict())]

    def runTest(self):
        self._call('rename', "/sub/../mine.sql", "renamed.sql")
        self.assertTrue(os.path.exists(
            os.path.join(self.storage_dir, "renamed.sql")))
        self._call('delete', "/sub/../renamed.sql")
        self.assertFalse(os.path.exists(
            os.path.join(self.storage_dir, "renamed.sql")))


class TestDesktopDownloadRefusesFifo(_DownloadMixin, BaseTestGenerator):
    """In desktop mode a FIFO is refused rather than opened, which would
    block the request until something wrote to it."""

    scenarios = [('default', dict())]

    def runTest(self):
        if not hasattr(os, 'mkfifo'):
            self.skipTest("No FIFOs on this platform")
        import threading
        fifo = os.path.join(self.storage_dir, "pipe")
        os.mkfifo(fifo)
        config.SERVER_MODE = False

        result = {}

        def download():
            result['res'] = self._download(fifo, '')

        worker = threading.Thread(target=download, daemon=True)
        worker.start()
        worker.join(5)
        if worker.is_alive():
            # Release the blocked open so the worker can finish.
            os.close(os.open(fifo, os.O_WRONLY | os.O_NONBLOCK))
            worker.join(5)
            self.fail("download blocked on the FIFO")
        status, body = result['res']
        self.assertNotEqual(status, 200)


class TestDesktopDownloadFollowsSymlinkToFile(
        _DownloadMixin, BaseTestGenerator):
    """In desktop mode a symbolic link to a regular file is still
    downloaded."""

    scenarios = [('default', dict())]

    def runTest(self):
        if sys.platform == "win32":
            self.skipTest("Symlink semantics differ on Windows")
        link = os.path.join(self.storage_dir, "link.sql")
        os.symlink(os.path.join(self.storage_dir, "mine.sql"), link)
        config.SERVER_MODE = False
        self.assertEqual(self._download(link, ''), (200, b"MY_DATA"))


class TestOpenParentBeneathDescriptors(BaseTestGenerator):
    """_open_parent_beneath() keeps open only the ancestor directories a
    later ".." in the path can still need, so a deep path doesn't exhaust
    the process's file descriptors, and ".." still never goes above the
    storage directory."""

    scenarios = [
        ('deep path within a lowered descriptor limit',
         dict(check='rlimit')),
        ('at most two walker descriptors open at once',
         dict(check='bound')),
        ('".." near the end of a deep path', dict(check='dotdot')),
        ('".." above the storage directory after a deep walk',
         dict(check='above_root')),
        ('interleaved ".." segments', dict(check='interleaved')),
        ('".." after a trimmed directory', dict(check='trimmed_dotdot')),
        ('a very long path is refused in linear time',
         dict(check='linear')),
    ]

    DEPTH = 100

    def setUp(self):
        if not hasattr(os, 'O_DIRECTORY') or sys.platform == 'win32':
            self.skipTest("The descriptor walk is POSIX only")
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        self.names = ['d%d' % i for i in range(self.DEPTH)]
        os.makedirs(os.path.join(self.root, *self.names))

    def _walk(self, *parts):
        from pgadmin.misc.file_manager import _open_parent_beneath
        dir_fd, leaf = _open_parent_beneath(
            self.root, os.path.join(self.root, *parts))
        self.addCleanup(os.close, dir_fd)
        return dir_fd, leaf

    def runTest(self):
        getattr(self, '_check_' + self.check)()

    @staticmethod
    def _open_fds():
        for fd_dir in ('/proc/self/fd', '/dev/fd'):
            if os.path.isdir(fd_dir):
                return len(os.listdir(fd_dir))
        return None

    def _check_rlimit(self):
        import resource
        soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
        in_use = self._open_fds()
        if in_use is None:
            self.skipTest("Can't count open file descriptors here")
        self.addCleanup(resource.setrlimit, resource.RLIMIT_NOFILE,
                        (soft, hard))
        # Room for everything already open, but not for one descriptor
        # per directory of the path.
        limit = in_use + self.DEPTH // 2
        if hard != resource.RLIM_INFINITY and limit > hard:
            self.skipTest("The hard descriptor limit is too low")
        resource.setrlimit(resource.RLIMIT_NOFILE, (limit, hard))
        dir_fd, leaf = self._walk(*self.names, 'file.sql')
        self.assertEqual(leaf, 'file.sql')

    def _check_bound(self):
        opened, peak = set(), [0]
        real_open, real_close = os.open, os.close

        def tracking_open(*args, **kwargs):
            fd = real_open(*args, **kwargs)
            opened.add(fd)
            peak[0] = max(peak[0], len(opened))
            return fd

        def tracking_close(fd):
            opened.discard(fd)
            real_close(fd)

        with patch('os.open', tracking_open), \
                patch('os.close', tracking_close):
            self._walk(*self.names[:60], 'file.sql')
        self.assertLessEqual(peak[0], 2)

    def _check_dotdot(self):
        dir_fd, leaf = self._walk(*self.names, os.pardir, os.pardir,
                                  'file.sql')
        self.assertEqual(leaf, 'file.sql')
        self.assertEqual(
            os.fstat(dir_fd).st_ino,
            os.stat(os.path.join(self.root,
                                 *self.names[:-2])).st_ino)

    def _check_above_root(self):
        from pgadmin.misc.file_manager import _open_parent_beneath
        path = os.path.join(self.root, *self.names[:3],
                            *([os.pardir] * 4), 'file.sql')
        before = self._open_fds()
        with self.assertRaises(PermissionError):
            _open_parent_beneath(self.root, path)
        # Nothing the walk opened is left open.
        self.assertEqual(self._open_fds(), before)

    def _check_interleaved(self):
        # Going down, back up and down again through the same names ends
        # in the same directory as the path's text.
        dir_fd, leaf = self._walk('d0', 'd1', os.pardir, 'd1', 'd2',
                                  os.pardir, os.pardir, os.pardir, 'd0',
                                  'd1', 'file.sql')
        self.assertEqual(leaf, 'file.sql')
        self.assertEqual(os.fstat(dir_fd).st_ino,
                         os.stat(os.path.join(self.root, 'd0',
                                              'd1')).st_ino)

    def _check_trimmed_dotdot(self):
        # d0/d1/d2/d3/../d4/.. ends in d0/d1/d2. By the first "..", the
        # walk holds only d2 and d3, having let go of the storage
        # directory, d0 and d1, and by the second only d2 and d4.
        os.mkdir(os.path.join(self.root, 'd0', 'd1', 'd2', 'd4'))
        dir_fd, leaf = self._walk('d0', 'd1', 'd2', 'd3', os.pardir, 'd4',
                                  os.pardir, 'file.sql')
        self.assertEqual(leaf, 'file.sql')
        self.assertEqual(os.fstat(dir_fd).st_ino,
                         os.stat(os.path.join(self.root, 'd0', 'd1',
                                              'd2')).st_ino)

    def _check_linear(self):
        import time
        from pgadmin.misc.file_manager import _open_parent_beneath
        # A long path from a request is refused at its first missing
        # directory; working out which ancestors to keep must not cost
        # time proportional to the square of its length first.
        parts = ['missing'] + [os.pardir, 'x'] * 25000 + ['file.sql']
        start = time.monotonic()
        with self.assertRaises(FileNotFoundError):
            _open_parent_beneath(self.root, os.path.join(self.root, *parts))
        self.assertLess(time.monotonic() - start, 2)
