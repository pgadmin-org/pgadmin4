##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression tests for the keyring-hang fix (Debian 13 / RDP D-Bus hang).

9.17 added a synchronous, unbounded keyring.get_password() probe at
config-import time. When the selected backend (e.g. SecretService) has no
live D-Bus/GNOME-Keyring session, that call - and even `import keyring`
itself - can block forever, freezing application startup outright.

The fix moves the probe into pgadmin.utils.keyring_probe, run from
create_app() in a background thread, isolated in a killable subprocess
(subprocess.Popen, not multiprocessing - see that module's docstring for
why) so a hang can be terminated instead of wedging the parent process.

Most tests below mock subprocess.Popen to verify _run_probe()'s
orchestration (timeout -> kill(), stdout parsing, config fallback)
quickly and deterministically - a real hang would have to actually wait
out the timeout, and a real keyring backend's behaviour differs per
machine/CI runner. TestProbeScriptRunsForReal is the exception: it
executes the real _PROBE_SCRIPT in a real subprocess (via
subprocess.Popen, unmocked) against a fake `keyring` module injected
over PYTHONPATH, so the script's actual body - never exercised by the
mocked tests - gets real coverage without depending on any real OS
keyring backend."""

import os
import sys
import tempfile
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import keyring_probe


class _FakeProcess:
    """Stand-in for subprocess.Popen. `communicate_result` is either a
    (stdout, stderr) tuple, or a subprocess.TimeoutExpired instance to be
    raised by the first communicate() call (mimicking a hung process)."""

    def __init__(self, communicate_result):
        self._communicate_result = communicate_result
        self._communicate_calls = 0
        self.killed = False

    def communicate(self, timeout=None):
        self._communicate_calls += 1
        if self._communicate_calls == 1 and isinstance(
                self._communicate_result, BaseException):
            raise self._communicate_result
        return ('', '')

    def kill(self):
        self.killed = True


class TestKeyringProbeRunsInKillableSubprocess(BaseTestGenerator):
    """_run_probe() must resolve USE_OS_SECRET_STORAGE / KEYRING_NAME from
    whatever the isolated subprocess reports on stdout, and must kill()
    it rather than wait forever when it hangs past the timeout."""

    scenarios = [
        ('healthy backend keeps OS secret storage enabled', dict(
            stdout='1\nSecretService Keyring\n',
            expect_use_os_secret_storage=True,
            expect_keyring_name='SecretService Keyring',
            expect_killed=False,
        )),
        ('backend raises disables OS secret storage', dict(
            stdout='0\n',
            expect_use_os_secret_storage=False,
            expect_keyring_name='',
            expect_killed=False,
        )),
    ]

    def runTest(self):
        fake_process = _FakeProcess((self.stdout, ''))
        fake_process.communicate = MagicMock(
            return_value=(self.stdout, ''))

        config = {'USE_OS_SECRET_STORAGE': True}

        with patch.object(keyring_probe.subprocess, 'Popen',
                          return_value=fake_process):
            keyring_probe._run_probe(config)

        self.assertEqual(config['USE_OS_SECRET_STORAGE'],
                         self.expect_use_os_secret_storage)
        self.assertEqual(config.get('KEYRING_NAME'),
                         self.expect_keyring_name)
        self.assertEqual(fake_process.killed, self.expect_killed)


class TestKeyringProbeTimeoutIsKilled(BaseTestGenerator):
    """When the subprocess hangs past the timeout, _run_probe() must
    kill() it and fall back to disabling OS secret storage, rather than
    waiting on communicate() forever."""

    def runTest(self):
        import subprocess as subprocess_module

        fake_process = _FakeProcess(
            subprocess_module.TimeoutExpired(cmd='probe', timeout=3))

        config = {'USE_OS_SECRET_STORAGE': True}

        with patch.object(keyring_probe.subprocess, 'Popen',
                          return_value=fake_process):
            keyring_probe._run_probe(config)

        self.assertTrue(fake_process.killed)
        self.assertFalse(config['USE_OS_SECRET_STORAGE'])
        self.assertEqual(config.get('KEYRING_NAME'), '')


class TestStartAsyncProbeIsNonBlockingAndServerModeAware(BaseTestGenerator):
    """start_async_probe() must never run the probe inline (it would
    reintroduce the startup hang), and must be a no-op in server mode,
    where OS secret storage doesn't apply."""

    scenarios = [
        ('server mode skips the probe entirely', dict(
            server_mode=True, expect_thread_started=False)),
        ('desktop mode backgrounds the probe', dict(
            server_mode=False, expect_thread_started=True)),
    ]

    def runTest(self):
        config = {'SERVER_MODE': self.server_mode}

        with patch.object(keyring_probe, 'threading') as mock_threading:
            mock_thread = MagicMock()
            mock_threading.Thread.return_value = mock_thread

            keyring_probe.start_async_probe(config)

            if self.expect_thread_started:
                mock_threading.Thread.assert_called_once()
                _, kwargs = mock_threading.Thread.call_args
                self.assertEqual(kwargs.get('target'),
                                 keyring_probe._run_probe)
                self.assertEqual(kwargs.get('args'), (config,))
                self.assertTrue(kwargs.get('daemon'))
                mock_thread.start.assert_called_once()
            else:
                mock_threading.Thread.assert_not_called()


class TestProbeScriptRunsForReal(BaseTestGenerator):
    """Runs the real _PROBE_SCRIPT in a real subprocess - the only test
    here that isn't mocked - against a fake `keyring` module so the
    script's actual body (never executed by the mocked tests above) is
    verified for real, without depending on this machine's OS keyring
    backend."""

    scenarios = [
        ('healthy backend', dict(
            fake_keyring="""
class _KR:
    name = 'FakeKeyring'


def get_keyring():
    return _KR()


def get_password(service, key):
    return None
""",
            expect_stdout='1\nFakeKeyring\n')),
        ('fail Keyring name disables storage', dict(
            fake_keyring="""
class _KR:
    name = 'fail Keyring'


def get_keyring():
    return _KR()


def get_password(service, key):
    return None
""",
            expect_stdout='0\n')),
        ('get_password raising disables storage', dict(
            fake_keyring="""
class _KR:
    name = 'FakeKeyring'


def get_keyring():
    return _KR()


def get_password(service, key):
    raise RuntimeError('backend unusable')
""",
            expect_stdout='0\n')),
        ('get_keyring raising disables storage', dict(
            fake_keyring="""
def get_keyring():
    raise RuntimeError('no backend available')


def get_password(service, key):
    return None
""",
            expect_stdout='0\n')),
    ]

    def runTest(self):
        with tempfile.TemporaryDirectory() as fake_site:
            with open(os.path.join(fake_site, 'keyring.py'), 'w') as f:
                f.write(self.fake_keyring)

            env = dict(os.environ)
            env['PYTHONPATH'] = fake_site + os.pathsep + \
                env.get('PYTHONPATH', '')

            proc = keyring_probe.subprocess.Popen(
                [sys.executable, '-c', keyring_probe._PROBE_SCRIPT],
                stdout=keyring_probe.subprocess.PIPE,
                stderr=keyring_probe.subprocess.PIPE, text=True, env=env)
            stdout, stderr = proc.communicate(
                timeout=keyring_probe.KEYRING_PROBE_TIMEOUT)

        self.assertEqual(stdout, self.expect_stdout, stderr)
