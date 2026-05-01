##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for EnhancedRotatingFileHandler.

Guards the file-mode 0o600 and close-on-exec behavior added to keep
pgadmin4.log out of group/world reach and to match Python's built-in
open() default for fd inheritance.
"""

import logging
import os
import shutil
import tempfile
import unittest

from pgadmin.utils.enhanced_log_rotation import EnhancedRotatingFileHandler
from pgadmin.utils.route import BaseTestGenerator


def _emit_one(handler):
    rec = logging.LogRecord(
        'test', logging.INFO, '', 0, 'sample log line', None, None)
    handler.emit(rec)


class _LogRotationTestSetupMixin:
    """Mixin providing tempdir setup for log handler tests.

    Used in MRO with BaseTestGenerator on concrete classes only — the
    mixin itself is not a TestCase, so it does NOT get auto-registered
    by TestsGeneratorRegistry as a runnable test.
    """

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.tmpdir = tempfile.mkdtemp(prefix="pga_log_test_")
        self.log_path = os.path.join(self.tmpdir, 'pgadmin4.log')

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)


@unittest.skipIf(os.name == 'nt',
                 "POSIX file mode bits not enforced on Windows")
class TestNewLogFileMode(_LogRotationTestSetupMixin, BaseTestGenerator):
    """A freshly created log file must have mode 0o600."""

    scenarios = [('default', dict())]

    def runTest(self):
        fh = EnhancedRotatingFileHandler(self.log_path)
        try:
            _emit_one(fh)
        finally:
            fh.close()

        mode = os.stat(self.log_path).st_mode & 0o777
        self.assertEqual(
            mode, 0o600,
            "new log file should be 0o600, got %s" % oct(mode))


@unittest.skipIf(os.name == 'nt',
                 "POSIX file mode bits not enforced on Windows")
class TestRotatedLogFileMode(_LogRotationTestSetupMixin, BaseTestGenerator):
    """After rollover, BOTH the rotated archive and the new active file
    must be 0o600. The rotated archive inherits via os.rename; the new
    active file is freshly created via our overridden _open()."""

    scenarios = [('default', dict())]

    def runTest(self):
        fh = EnhancedRotatingFileHandler(self.log_path)
        try:
            _emit_one(fh)
            fh.doRollover()
            _emit_one(fh)
        finally:
            fh.close()

        # Find every file in tmpdir and assert mode 0o600.
        found = sorted(os.listdir(self.tmpdir))
        self.assertGreaterEqual(len(found), 2,
                                "rollover should have produced >=2 files")
        for name in found:
            full = os.path.join(self.tmpdir, name)
            mode = os.stat(full).st_mode & 0o777
            self.assertEqual(
                mode, 0o600,
                "%s should be 0o600, got %s" % (name, oct(mode)))


@unittest.skipIf(os.name == 'nt',
                 "POSIX file mode bits not enforced on Windows")
class TestPreExistingFileModeUnchanged(_LogRotationTestSetupMixin,
                                       BaseTestGenerator):
    """Opening a pre-existing file with wider perms must NOT silently
    tighten OR widen — _open() only sets mode at creation time. We
    deliberately leave existing perms alone so admins who chose 0o644
    aren't surprised by behavior changes mid-version."""

    scenarios = [('default', dict())]

    def runTest(self):
        with open(self.log_path, 'w') as f:
            f.write("seed\n")
        os.chmod(self.log_path, 0o644)

        fh = EnhancedRotatingFileHandler(self.log_path)
        try:
            _emit_one(fh)
        finally:
            fh.close()

        mode = os.stat(self.log_path).st_mode & 0o777
        self.assertEqual(
            mode, 0o644,
            "pre-existing file mode should not change, got %s" % oct(mode))


@unittest.skipIf(os.name == 'nt',
                 "fd inheritance semantics differ on Windows")
class TestLogFdNonInheritable(_LogRotationTestSetupMixin, BaseTestGenerator):
    """The opened log fd must be non-inheritable (close-on-exec) to match
    Python's built-in open() default (PEP 446). Without this, gunicorn
    workers and subprocess.Popen children would inherit the log fd."""

    scenarios = [('default', dict())]

    def runTest(self):
        fh = EnhancedRotatingFileHandler(self.log_path)
        try:
            _emit_one(fh)
            stream = fh.stream
            self.assertFalse(
                os.get_inheritable(stream.fileno()),
                "log fd must be non-inheritable (close-on-exec)")
        finally:
            fh.close()
