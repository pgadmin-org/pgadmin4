##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Run the real psql and pg_dump against a fake PostgreSQL server to show
that, in server mode, a pg_service.conf entry cannot make a utility
authenticate with a password file the user did not choose.

libpq ranks the connection string above the service file, and the service
file above the PG* environment variables, so setting PGPASSFILE alone does
not stop a service entry's passfile from being used. The server here asks
for a cleartext password and records whatever the client sends, so the
result does not depend on how the real test server authenticates.
"""

import glob
import os
import shutil
import socket
import struct
import subprocess
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from pgadmin.utils import (
    utility_conninfo, database_conninfo, connection_params_to_env)
from pgadmin.utils.route import BaseTestGenerator

SSL_REQUEST = 80877103
GSSENC_REQUEST = 80877104
SERVICE_PASSWORD = 'svcsecret'


def _read_exactly(sock, size):
    data = b''
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise EOFError()
        data += chunk
    return data


class _FakeServer(threading.Thread):
    """Asks every client for a cleartext password, records the password
    messages it receives (None for a client that sent none) and then
    rejects the login."""

    def __init__(self):
        super().__init__(daemon=True)
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.bind(('127.0.0.1', 0))
        self.sock.listen(5)
        self.sock.settimeout(0.2)
        self.port = self.sock.getsockname()[1]
        self.passwords = []
        self._stop_event = threading.Event()

    def stop(self):
        self._stop_event.set()
        self.join(10)
        self.sock.close()

    def run(self):
        while not self._stop_event.is_set():
            try:
                conn, _ = self.sock.accept()
            except socket.timeout:
                continue
            except OSError:
                return
            try:
                self._handle(conn)
            except (OSError, EOFError, struct.error):
                pass
            finally:
                conn.close()

    def _handle(self, conn):
        conn.settimeout(5)
        while True:
            length, code = struct.unpack('!ii', _read_exactly(conn, 8))
            _read_exactly(conn, length - 8)
            if code in (SSL_REQUEST, GSSENC_REQUEST):
                conn.sendall(b'N')
                continue
            break

        # AuthenticationCleartextPassword
        conn.sendall(b'R' + struct.pack('!ii', 8, 3))

        conn.settimeout(3)
        password = None
        try:
            kind = _read_exactly(conn, 1)
            length, = struct.unpack('!i', _read_exactly(conn, 4))
            body = _read_exactly(conn, length - 4)
            if kind == b'p':
                password = body.rstrip(b'\0').decode()
        except (socket.timeout, EOFError, OSError):
            pass
        self.passwords.append(password)

        fields = b'SFATAL\0VFATAL\0C28P01\0Mpassword rejected\0\0'
        try:
            conn.sendall(b'E' + struct.pack('!i', len(fields) + 4) + fields)
        except OSError:
            pass


def _find_utility(name, server):
    """The utility from the test server's configured binary path, else the
    PATH, else a Homebrew install."""
    candidates = []
    paths = (server or {}).get('default_binary_paths') or {}
    path = paths.get((server or {}).get('type'))
    if path:
        candidates.append(os.path.join(path, name))
    found = shutil.which(name)
    if found:
        candidates.append(found)
    candidates.extend(sorted(
        glob.glob('/opt/homebrew/opt/postgresql@*/bin/' + name),
        reverse=True))
    for candidate in candidates:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


class UtilityServicePassfileTestCase(BaseTestGenerator):
    """A service file entry names a password file; the utility must not
    use it when given the connection string from utility_conninfo()."""

    scenarios = [
        ('psql: the connection string beats the service file entry',
         dict(utility='psql', fixed=True)),
        ('pg_dump: the connection string beats the service file entry',
         dict(utility='pg_dump', fixed=True)),
        ('psql control: with the environment only, the service file '
         'entry wins',
         dict(utility='psql', fixed=False)),
        ('pg_dump control: with the environment only, the service file '
         'entry wins',
         dict(utility='pg_dump', fixed=False)),
    ]

    def setUp(self):
        # Needs no database server: skip BaseTestGenerator's setup.
        unittest.TestCase.setUp(self)
        self.tmp = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_service_passfile_'))
        self.fake = None

    def tearDown(self):
        if self.fake is not None:
            self.fake.stop()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _dbname(self):
        patches = [
            patch.dict(self.app.config, {'SERVER_MODE': True}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.tmp),
        ]
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                env = connection_params_to_env({})
                if self.fixed:
                    return utility_conninfo('postgres', {}), env
                return database_conninfo('postgres'), env
            finally:
                for p in reversed(patches):
                    p.stop()

    def runTest(self):
        binary = _find_utility(self.utility, getattr(self, 'server', None))
        if binary is None:
            self.skipTest('{0} was not found'.format(self.utility))

        home = os.path.join(self.tmp, 'home')
        os.makedirs(home)
        service_passfile = os.path.join(self.tmp, 'svc.pgpass')
        with open(service_passfile, 'w') as f:
            f.write('*:*:*:*:{0}\n'.format(SERVICE_PASSWORD))
        os.chmod(service_passfile, 0o600)
        service_file = os.path.join(self.tmp, 'pg_service.conf')
        with open(service_file, 'w') as f:
            f.write('[pgadmin_probe]\npassfile={0}\n'.format(service_passfile))

        dbname, server_env = self._dbname()
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        env.update(server_env)
        env.update({
            'PGSERVICEFILE': service_file,
            'PGSERVICE': 'pgadmin_probe',
            'HOME': home,
            'PGSSLMODE': 'disable',
            'PGGSSENCMODE': 'disable',
        })

        self.fake = _FakeServer()
        self.fake.start()

        cmd = [binary, '--host', '127.0.0.1', '--port', str(self.fake.port),
               '--username', 'alice', '--no-password', '--dbname', dbname]
        if self.utility == 'psql':
            cmd.extend(['--command', 'select 1'])
        else:
            cmd.append('--schema-only')

        try:
            result = subprocess.run(cmd, env=env, capture_output=True,
                                    text=True, timeout=20)
        except subprocess.TimeoutExpired:
            self.fail('{0} did not finish'.format(self.utility))
        output = result.stdout + result.stderr

        # The server records a connection after the client has gone.
        deadline = time.monotonic() + 5
        while not self.fake.passwords and time.monotonic() < deadline:
            time.sleep(0.05)

        self.assertNotEqual(result.returncode, 0, output)
        if self.fixed:
            self.assertEqual(self.fake.passwords, [None], output)
            self.assertIn('no password supplied', output)
        else:
            # The reviewer's case: the service file's passfile was used.
            self.assertEqual(self.fake.passwords[:1], [SERVICE_PASSWORD],
                             output)


class PgDumpallMaintenanceDatabaseTestCase(BaseTestGenerator):
    """pg_dumpall expands a --database value containing "=" into a
    connection string, whose keywords beat the passfile given in --dbname.
    The maintenance database wrapped by database_conninfo() cannot."""

    scenarios = [
        ('wrapped: the hostile name cannot name a password file',
         dict(fixed=True)),
        ('control: the raw hostile name is expanded and its passfile used',
         dict(fixed=False)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.tmp = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_dumpall_passfile_'))
        self.fake = None

    def tearDown(self):
        if self.fake is not None:
            self.fake.stop()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _utility_dbname(self):
        patches = [
            patch.dict(self.app.config, {'SERVER_MODE': True}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.tmp),
        ]
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                return (utility_conninfo(None, {}),
                        connection_params_to_env({}))
            finally:
                for p in reversed(patches):
                    p.stop()

    def runTest(self):
        server = getattr(self, 'server', None)
        psql = _find_utility('psql', server)
        binary = _find_utility('pg_dumpall', server)
        if binary is None and psql is not None:
            candidate = os.path.join(os.path.dirname(psql), 'pg_dumpall')
            if os.access(candidate, os.X_OK):
                binary = candidate
        if binary is None:
            self.skipTest('pg_dumpall was not found')

        home = os.path.join(self.tmp, 'home')
        os.makedirs(home)
        service_passfile = os.path.join(self.tmp, 'svc.pgpass')
        with open(service_passfile, 'w') as f:
            f.write('*:*:*:*:{0}\n'.format(SERVICE_PASSWORD))
        os.chmod(service_passfile, 0o600)
        service_file = os.path.join(self.tmp, 'pg_service.conf')
        with open(service_file, 'w') as f:
            f.write('[pgadmin_probe]\npassfile={0}\n'.format(
                service_passfile))

        hostile = 'dbname=postgres passfile={0}'.format(service_passfile)
        database = database_conninfo(hostile) if self.fixed else hostile
        dbname, server_env = self._utility_dbname()
        env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
        env.update(server_env)
        env.update({
            'PGSERVICEFILE': service_file,
            'HOME': home,
            'PGSSLMODE': 'disable',
            'PGGSSENCMODE': 'disable',
        })

        self.fake = _FakeServer()
        self.fake.start()

        cmd = [binary, '--globals-only', '--host', '127.0.0.1',
               '--port', str(self.fake.port), '--username', 'alice',
               '--no-password', '--database', database,
               '--dbname', dbname]
        try:
            result = subprocess.run(cmd, env=env, capture_output=True,
                                    text=True, timeout=20)
        except subprocess.TimeoutExpired:
            self.fail('pg_dumpall did not finish')
        output = result.stdout + result.stderr

        deadline = time.monotonic() + 5
        while not self.fake.passwords and time.monotonic() < deadline:
            time.sleep(0.05)
        # pg_dumpall may make several connection attempts.
        time.sleep(0.5)

        self.assertNotEqual(result.returncode, 0, output)
        self.assertTrue(self.fake.passwords, output)
        if self.fixed:
            # Every attempt reached the server without a password.
            # (pg_dumpall does not relay libpq's "no password supplied".)
            self.assertEqual(set(self.fake.passwords), {None}, output)
        else:
            self.assertIn(SERVICE_PASSWORD, self.fake.passwords, output)
