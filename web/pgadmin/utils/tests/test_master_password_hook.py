##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression tests for the MASTER_PASSWORD_HOOK OS command injection.

The hook substitutes the externally-supplied username for %u. The fix
tokenises the (trusted) hook string first and only then substitutes the
(untrusted) username into the individual arguments, executing the result
with shell=False. As a result, shell metacharacters in the username are
passed through as a single, literal argv element rather than being
interpreted by a shell."""

import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
import pgadmin.utils.master_password as mp


class _FakeProc:
    """Minimal stand-in for a subprocess.Popen result."""
    returncode = 0

    def communicate(self):
        return (b'secret-key', b'')


class TestMasterPasswordHookConfinesUsername(BaseTestGenerator):
    """The username, whatever shell syntax it contains, must reach the hook
    as exactly one argv element, and the hook must run with shell=False. This
    is verified by capturing the arguments passed to subprocess.Popen, so the
    check is deterministic and platform-independent (nothing is executed)."""

    scenarios = [
        ('semicolon command separator',
         dict(username='attacker; touch /tmp/x')),
        ('command substitution $()',
         dict(username='x$(touch /tmp/x)')),
        ('backtick command substitution',
         dict(username='x`touch /tmp/x`')),
        ('pipe to another command',
         dict(username='x | touch /tmp/x')),
        ('logical-and chain',
         dict(username='x && touch /tmp/x')),
        ('embedded newline',
         dict(username='x\ntouch /tmp/x')),
        ('embedded whitespace only',
         dict(username='first last')),
    ]

    def runTest(self):
        captured = {}

        def fake_popen(args, *a, **kw):
            captured['args'] = args
            captured['shell'] = kw.get('shell')
            return _FakeProc()

        fake_user = MagicMock()
        fake_user.username = self.username

        with patch.object(mp, 'current_user', fake_user), \
                patch.object(mp.config, 'MASTER_PASSWORD_HOOK',
                             '/opt/get-secret %u'), \
                patch('subprocess.Popen', side_effect=fake_popen):
            output = mp.get_master_password_from_master_hook()

        # A shell must never be involved.
        self.assertIs(captured.get('shell'), False)
        # The command must be passed as an argument vector, not a string.
        self.assertIsInstance(captured.get('args'), list)
        # The hook program token is preserved untouched as argv[0].
        self.assertEqual(captured['args'][0], '/opt/get-secret')
        # The entire username lands in a single argv element ...
        self.assertEqual(captured['args'][1], self.username)
        # ... and nothing was split out into extra tokens.
        self.assertEqual(len(captured['args']), 2)
        # The hook output is still returned to the caller.
        self.assertEqual(output, 'secret-key')


class TestMasterPasswordHookNoShellExecution(BaseTestGenerator):
    """End-to-end PoC regression (POSIX only): a username containing shell
    syntax must not cause command execution. Mirrors the reported proof of
    concept using a harmless marker file: if a shell were involved, the ';'
    would start a second command that creates the marker."""

    def runTest(self):
        if os.name == 'nt':
            self.skipTest('POSIX shell-injection PoC; skipped on Windows.')

        echo = shutil.which('echo')
        if echo is None:
            self.skipTest('echo binary not available on PATH.')

        tmpdir = tempfile.mkdtemp(prefix='pgadmin-hook-test-')
        marker = os.path.join(tmpdir, 'master_hook_rce')
        username = 'attacker; touch {0}; #'.format(marker)

        fake_user = MagicMock()
        fake_user.username = username

        try:
            with patch.object(mp, 'current_user', fake_user), \
                    patch.object(mp.config, 'MASTER_PASSWORD_HOOK',
                                 '{0} hook-%u'.format(echo)):
                output = mp.get_master_password_from_master_hook()

            self.assertFalse(
                os.path.exists(marker),
                'Injected command executed: the marker file was created, '
                'which means the username was interpreted by a shell.')
            # The username was handled as inert data and echoed verbatim.
            self.assertEqual(output, 'hook-' + username)
        finally:
            if os.path.exists(marker):
                os.remove(marker)
            os.rmdir(tmpdir)
