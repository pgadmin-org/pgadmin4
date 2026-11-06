##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import glob
import logging
import os
import subprocess
import sys
import tempfile
import time
from unittest.mock import patch, MagicMock

import config
from pgadmin.misc.bgprocess import processes
from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils.route import BaseTestGenerator

STORED_ARGS = ['--file', 'stored_file', '--no-password']
LAUNCH_ARGS = ['--file', '/dev/fd/7', '--no-password']


def _make_process():
    """Build a BatchProcess without touching the database."""
    p = BatchProcess.__new__(BatchProcess)
    p.id = 'test-process-id'
    p.cmd = 'pg_dump'
    p.args = list(STORED_ARGS)
    p.log_dir = '/nonexistent/log/dir'
    p.stime = p.etime = None
    p.env = dict()
    p.kerberos_conn = False
    return p


class BatchProcessLaunchArgsTest(BaseTestGenerator):
    """BatchProcess.start() accepts launch-only args and pass_fds."""

    scenarios = [('When starting a BatchProcess with mocks', dict())]

    def _start(self, p, popen_mock, **kwargs):
        with patch.object(processes, 'Process'), \
                patch.object(processes, 'db'), \
                patch.object(processes, 'Popen', popen_mock), \
                patch.object(BatchProcess, '_get_python_interpreter',
                             return_value='python'):
            popen_mock.return_value.poll.return_value = 0
            with self.app.test_request_context('/'):
                p.start(**kwargs)

    def runTest(self):
        if os.name == 'nt':
            self.skipTest('pass_fds is POSIX only')

        # Launch-only args and pass_fds reach Popen; stored args untouched.
        p = _make_process()
        popen_mock = MagicMock()
        self._start(p, popen_mock, args=list(LAUNCH_ARGS), pass_fds=(7,))
        cmd = popen_mock.call_args[0][0]
        kwargs = popen_mock.call_args[1]
        self.assertEqual(cmd[3:], LAUNCH_ARGS)
        self.assertEqual(kwargs['pass_fds'], (7,))
        self.assertTrue(kwargs['close_fds'])
        self.assertEqual(p.args, STORED_ARGS)

        # Backwards compatible: no new parameters.
        p = _make_process()
        popen_mock = MagicMock()
        self._start(p, popen_mock)
        cmd = popen_mock.call_args[0][0]
        self.assertEqual(cmd[3:], STORED_ARGS)
        self.assertEqual(popen_mock.call_args[1]['pass_fds'], ())

        # Debug path forwards pass_fds too.
        old_level = config.CONSOLE_LOG_LEVEL
        config.CONSOLE_LOG_LEVEL = logging.DEBUG
        try:
            p = _make_process()
            popen_mock = MagicMock()
            popen_mock.return_value.communicate.return_value = (b'', b'')
            self._start(p, popen_mock, args=list(LAUNCH_ARGS),
                        pass_fds=(7,))
        finally:
            config.CONSOLE_LOG_LEVEL = old_level
        self.assertEqual(popen_mock.call_args[0][0][3:], LAUNCH_ARGS)
        self.assertEqual(popen_mock.call_args[1]['pass_fds'], (7,))
        self.assertTrue(popen_mock.call_args[1]['close_fds'])


class PassFdsEndToEndTest(BaseTestGenerator):
    """A descriptor passed to the executor reaches the utility."""

    scenarios = [('When running the real process executor', dict())]

    def runTest(self):
        if sys.platform == 'win32':
            self.skipTest('pass_fds is POSIX only')

        marker = 'obviously fake descriptor content'
        executor = os.path.join(
            os.path.dirname(processes.__file__), 'process_executor.py')

        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, 'source.txt')
            with open(src, 'w') as f:
                f.write(marker)
            outdir = os.path.join(tmp, 'out')
            os.mkdir(outdir)

            # Non-inheritable by default, as with open_utility_file().
            fd = os.open(src, os.O_RDONLY | os.O_CLOEXEC)
            try:
                env = os.environ.copy()
                env['PROCID'] = 'test-process-id'
                env['OUTDIR'] = outdir
                env['PGA_BGP_FOREGROUND'] = '1'
                cmd = [sys.executable, executor, '/bin/cat',
                       '/dev/fd/%d' % fd]
                launcher = subprocess.Popen(
                    cmd, close_fds=True, pass_fds=(fd,), env=env,
                    start_new_session=True)
            finally:
                os.close(fd)

            launcher.wait(timeout=30)
            out_file = os.path.join(outdir, 'out')
            status_file = os.path.join(outdir, 'status')
            content = ''
            deadline = time.time() + 30
            while time.time() < deadline:
                if os.path.exists(out_file):
                    with open(out_file, errors='replace') as f:
                        content = f.read()
                # Wait for the executor to finish writing before the
                # temporary directory is removed.
                if marker in content and os.path.exists(status_file):
                    with open(status_file, errors='replace') as f:
                        if 'end_time' in f.read():
                            break
                time.sleep(0.2)

            logs = ''
            for name in glob.glob(os.path.join(outdir, '*')):
                if os.path.basename(name) != 'out':
                    with open(name, errors='replace') as f:
                        logs += f.read()
            self.assertIn(marker, content, 'out=%r other=%r' % (
                content, logs))
