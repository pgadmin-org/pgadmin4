##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Run a real psql in a real Windows pseudo-terminal, through the same
spawn_windows_pty() that the PSQL tool uses.

The other PSQL tests mock PtyProcess.spawn, so they cannot see a change in
how pywinpty turns argv into a command line, and both the 2.0.x and 3.1.1
behaviour broke the tool for users (#10714): 2.0.x left argv[0] off, so
psql could not find its own executable, and 3.1.1 did not quote it, so a
psql under a path containing a space would not start. These tests only run
on Windows, where the CI installs a real PostgreSQL server and puts its bin
directory on PATH.
"""

import glob
import os
import re
import shutil
import sys
import tempfile
import threading
import time

from psycopg.conninfo import make_conninfo

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools import psql

# Seconds to wait for psql to start, answer a query or exit. Generous,
# because CI runners are slow and shared.
TIMEOUT = 60

# Escape sequences the terminal emits for cursor movement, colour and the
# window title, none of which are wanted when looking for text.
ANSI_ESCAPE = re.compile(
    r'\x1b(\[[0-9;?]*[ -/]*[@-~]|\][^\x07]*\x07|[@-Z\\-_])')


def find_psql():
    """
    Return the path to psql.exe, or None. CI puts the PostgreSQL bin
    directory on PATH; default_binary_paths is not used because the CI
    test_config.json does not point it at the installed binaries.
    """
    return shutil.which('psql')


class PtySession:
    """
    A psql process in a pseudo-terminal, with a thread collecting its
    output, since pywinpty's reads block.
    """

    def __init__(self, argv, env):
        self.process = psql.spawn_windows_pty(argv, env)
        self._chunks = []
        self._lock = threading.Lock()
        self._reader = threading.Thread(target=self._read, daemon=True)
        self._reader.start()

    def _read(self):
        while True:
            try:
                data = self.process.read(4096)
            except EOFError:
                return
            except Exception:
                return
            if data:
                with self._lock:
                    self._chunks.append(data)

    def output(self):
        with self._lock:
            return ANSI_ESCAPE.sub('', ''.join(self._chunks))

    def wait_for(self, predicate, timeout=TIMEOUT):
        """
        Wait until predicate(output) is true, returning the time taken, or
        None on timeout.
        """
        start = time.monotonic()
        while time.monotonic() - start < timeout:
            if predicate(self.output()):
                return time.monotonic() - start
            time.sleep(0.05)
        return None

    def wait_for_exit(self, timeout=TIMEOUT):
        start = time.monotonic()
        while time.monotonic() - start < timeout:
            if not self.process.isalive():
                return True
            time.sleep(0.1)
        return False

    def type(self, text):
        # The PSQL tool's frontend sends each keystroke as it is typed, and
        # xterm.js sends a carriage return for Enter.
        for char in text:
            self.process.write(char)

    def close(self):
        try:
            self.process.close(force=True)
        except Exception:
            pass


class PSQLWindowsPtyMixin:
    """
    Shared set-up: find psql and build the argv and environment that the
    PSQL tool would give it for the test server. Not a BaseTestGenerator
    itself, since the runner would otherwise collect it as a test.
    """

    def setUp(self):
        if sys.platform != 'win32':
            self.skipTest('Windows pseudo-terminals exist only on Windows')
        super().setUp()

        self.psql_path = find_psql()
        if self.psql_path is None:
            # Never skip in CI, where a missing psql would quietly turn
            # these tests off.
            if os.environ.get('GITHUB_ACTIONS') == 'true':
                self.fail('psql is not on PATH')
            self.skipTest('psql is not on PATH')

        self.db = self.server['db']
        self.session = None
        self.temp_dir = None

    def start_psql(self, psql_path):
        # The same shape of argv as get_connection_str() gives the PSQL
        # tool: the executable and a single connection string, which
        # contains spaces and so must be quoted on the command line too.
        conninfo = make_conninfo(host=self.server['host'],
                                 port=self.server['port'],
                                 dbname=self.db,
                                 user=self.server['username'])
        argv = [psql_path, conninfo]

        env = os.environ.copy()
        env['TERM'] = 'xterm'
        env['PGPASSWORD'] = self.server['db_password']
        # An empty value turns the pager off, which would otherwise take
        # the \q typed after a long enough result.
        env['PSQL_PAGER'] = ''

        self.session = PtySession(argv, env)
        return self.session

    def assert_at_prompt(self, session):
        # A superuser gets 'db=#' and anyone else 'db=>'.
        prompt = re.compile(re.escape(self.db) + r'=[#>]')
        taken = session.wait_for(lambda out: prompt.search(out))
        self.assertIsNotNone(
            taken, 'psql did not reach its prompt. Output:\n' +
            session.output())

    def run_query_and_quit(self, session):
        self.assert_at_prompt(session)

        # The result is built by the server, so it cannot be mistaken for
        # the echo of what was typed.
        session.type("SELECT 'pgadmin' || '-' || current_database();\r")
        expected = 'pgadmin-' + self.db
        self.assertIsNotNone(
            session.wait_for(lambda out: expected in out),
            'psql did not answer the query. Output:\n' + session.output())

        session.type('\\q\r')
        self.assertTrue(
            session.wait_for_exit(),
            'psql did not exit after \\q. Output:\n' + session.output())

    def tearDown(self):
        if self.session is not None:
            self.session.close()
        if self.temp_dir is not None:
            shutil.rmtree(self.temp_dir, ignore_errors=True)
        super().tearDown()


class PSQLWindowsPtyConnect(PSQLWindowsPtyMixin, BaseTestGenerator):
    """
    psql must start, connect to the requested database, run a query and
    exit. If argv[0] is dropped from the command line, psql cannot find its
    own executable; if it is repeated, psql reads its own path as the
    database name. Either way it never reaches the prompt.
    """
    scenarios = [
        ('psql from the PostgreSQL installation', dict(in_spaced_dir=False)),
        ('psql from a directory whose path contains a space',
         dict(in_spaced_dir=True)),
    ]

    def runTest(self):
        psql_path = self.psql_path
        if self.in_spaced_dir:
            # Like an installation under C:\Program Files. psql.exe needs
            # the DLLs beside it, but nothing else from the installation.
            self.temp_dir = tempfile.mkdtemp(prefix='pgadmin psql test ')
            bin_dir = os.path.join(self.temp_dir, 'Program Files', 'bin')
            os.makedirs(bin_dir)
            source_dir = os.path.dirname(self.psql_path)
            for dll in glob.glob(os.path.join(source_dir, '*.dll')):
                shutil.copy2(dll, bin_dir)
            psql_path = shutil.copy2(self.psql_path, bin_dir)
            self.assertIn(' ', psql_path)

        self.run_query_and_quit(self.start_psql(psql_path))


class PSQLWindowsPtyTyping(PSQLWindowsPtyMixin, BaseTestGenerator):
    """
    Characters typed one at a time must be echoed back promptly. The limit
    is deliberately loose, as CI runners are shared, so this only catches
    the kind of lag reported in #9234, where typing visibly fell behind.
    """
    scenarios = [
        ('Typed characters are echoed promptly', dict(count=200, limit=30)),
    ]

    def runTest(self):
        session = self.start_psql(self.psql_path)
        self.assert_at_prompt(session)

        # The echo may be wrapped or redrawn, so count the characters
        # rather than looking for the whole string.
        before = session.output().count('x')
        # Each write blocks, so a slow terminal can hold up the typing
        # itself; the limit covers the typing as well as the echo.
        start = time.monotonic()
        session.type("SELECT '" + 'x' * self.count)
        remaining = self.limit - (time.monotonic() - start)
        taken = None
        if remaining > 0:
            taken = session.wait_for(
                lambda out: out.count('x') - before >= self.count,
                timeout=remaining)
        self.assertIsNotNone(
            taken,
            '{0} typed characters were not all echoed within {1} seconds. '
            'Output:\n{2}'.format(self.count, self.limit, session.output()))

        # Finish the statement so that \q is not taken as part of it.
        session.type("';\r")
        session.type('\\q\r')
        self.assertTrue(
            session.wait_for_exit(),
            'psql did not exit after \\q. Output:\n' + session.output())
