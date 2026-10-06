##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import passexec
from pgadmin.utils.passexec import (
    PasswordExec, ServerPasswordExec, get_server_passexec_commands,
    check_server_passexec_config)


class TestServerPassexecCommandsValidation(BaseTestGenerator):
    """Only well-formed allowlist entries are returned."""

    def runTest(self):
        cfg = {
            'vault': ['/bin/get-pass', '--ttl', '300'],
            'tuple': ('/bin/x',),
            '': ['/bin/empty-name'],
            '  ': ['/bin/blank-name'],
            '__none__': ['/bin/reserved'],
            '__x': ['/bin/reserved-prefix'],
            'empty': [],
            'str': '/bin/a-string-not-a-list',
            'mixed': ['/bin/x', 3],
            5: ['/bin/int-name'],
        }
        with patch.object(passexec.config, 'SERVER_PASSEXEC_COMMANDS',
                          cfg, create=True):
            cmds = get_server_passexec_commands()
            self.assertEqual(cmds, {
                'vault': ['/bin/get-pass', '--ttl', '300'],
                'tuple': ['/bin/x'],
            })
            # Returned lists are copies.
            cmds['vault'].append('evil')
            self.assertEqual(get_server_passexec_commands()['vault'],
                             ['/bin/get-pass', '--ttl', '300'])
            logger = MagicMock()
            check_server_passexec_config(logger)
            self.assertEqual(logger.error.call_count, 8)


class TestServerPassexecCommandsNotADict(BaseTestGenerator):
    """A non-dict setting yields no commands and one logged error."""

    def runTest(self):
        with patch.object(passexec.config, 'SERVER_PASSEXEC_COMMANDS',
                          ['/bin/x'], create=True):
            self.assertEqual(get_server_passexec_commands(), {})
            logger = MagicMock()
            check_server_passexec_config(logger)
            self.assertEqual(logger.error.call_count, 1)


class TestDeprecatedFlagWarning(BaseTestGenerator):
    def runTest(self):
        logger = MagicMock()
        with patch.object(passexec.config, 'SERVER_PASSEXEC_COMMANDS', {},
                          create=True), \
                patch.object(passexec.config,
                             'ENABLE_SERVER_PASS_EXEC_CMD', True):
            check_server_passexec_config(logger)
        logger.warning.assert_called_once()
        self.assertIn('SERVER_PASSEXEC_COMMANDS',
                      logger.warning.call_args[0][0])


class TestServerPasswordExecNoShell(BaseTestGenerator):
    """Values travel in env vars verbatim; argv is never altered."""

    def runTest(self):
        host = 'h;touch /tmp/x'
        user = '$(touch /tmp/y)`id`\nz'
        pexec = ServerPasswordExec(
            'vault', ['/bin/get-pass', '%USERNAME%'], host, 5432, user,
            'postgres', 'jane.doe@example.com', 'internal')
        fake_proc = MagicMock(stdout='secret\n')
        with self.app.app_context(), \
                patch('pgadmin.utils.passexec.subprocess.run',
                      return_value=fake_proc) as mock_run, \
                patch('pgadmin.utils.passexec.config.SERVER_MODE', True):
            self.assertEqual(pexec.get(), 'secret')
        args, kwargs = mock_run.call_args
        self.assertEqual(args[0], ['/bin/get-pass', '%USERNAME%'])
        self.assertFalse(kwargs.get('shell', False))
        env = kwargs['env']
        self.assertEqual(env['PGADMIN_PASSEXEC_HOST'], host)
        self.assertEqual(env['PGADMIN_PASSEXEC_PORT'], '5432')
        self.assertEqual(env['PGADMIN_PASSEXEC_USERNAME'], user)
        self.assertEqual(env['PGADMIN_PASSEXEC_DATABASE'], 'postgres')
        self.assertEqual(env['PGADMIN_PASSEXEC_PGADMIN_USER'],
                         'jane.doe@example.com')
        self.assertEqual(env['PGADMIN_PASSEXEC_AUTH_SOURCE'], 'internal')


class TestServerPasswordExecRealProcess(BaseTestGenerator):
    """End to end with a real child: metacharacters are inert."""

    def runTest(self):
        import os
        import sys
        import tempfile
        marker = os.path.join(tempfile.mkdtemp(), 'pwned')
        user = '$(touch {0})`touch {0}`;touch {0}'.format(marker)
        argv = [sys.executable, '-c',
                'import os;print(os.environ["PGADMIN_PASSEXEC_USERNAME"])']
        pexec = ServerPasswordExec('t', argv, 'h', None, user, None,
                                   'u', 'internal')
        with self.app.app_context(), \
                patch('pgadmin.utils.passexec.config.SERVER_MODE', True):
            self.assertEqual(pexec.get(), user)
        self.assertFalse(os.path.exists(marker))


class TestServerPasswordExecUnsetValues(BaseTestGenerator):
    def runTest(self):
        pexec = ServerPasswordExec('t', ['/bin/x'], None, None, None, None,
                                   None, None)
        with self.app.app_context(), \
                patch('pgadmin.utils.passexec.subprocess.run',
                      return_value=MagicMock(stdout='p')) as mock_run:
            pexec.get()
        env = mock_run.call_args[1]['env']
        for k in ('HOST', 'PORT', 'USERNAME', 'DATABASE', 'PGADMIN_USER',
                  'AUTH_SOURCE'):
            self.assertEqual(env['PGADMIN_PASSEXEC_' + k], '')


class TestFreeTextRefusedInServerMode(BaseTestGenerator):
    def runTest(self):
        pexec = PasswordExec('echo x', 'h', 5432, 'u')
        with self.app.app_context(), \
                patch('pgadmin.utils.passexec.config.SERVER_MODE', True), \
                patch('pgadmin.utils.passexec.config.'
                      'ENABLE_SERVER_PASS_EXEC_CMD', True), \
                patch('pgadmin.utils.passexec.subprocess.run') as mock_run:
            with self.assertRaises(NotImplementedError):
                pexec.get()
        mock_run.assert_not_called()


class TestPasswordExecLockPerInstance(BaseTestGenerator):
    """A command running for one instance does not block another."""

    def runTest(self):
        a = ServerPasswordExec('a', ['/bin/a'], 'h', 5432, 'u', 'postgres',
                               'jane.doe@example.com', 'internal')
        b = ServerPasswordExec('b', ['/bin/b'], 'h', 5432, 'u', 'postgres',
                               'john.doe@example.com', 'internal')
        c = PasswordExec('echo x', 'h', 5432, 'u')
        d = PasswordExec('echo y', 'h', 5432, 'u')
        self.assertIsNot(a.lock, b.lock)
        self.assertIsNot(c.lock, d.lock)
        import threading
        result = []
        app = self.app

        def fetch():
            with app.app_context():
                result.append(b.get())

        with patch('pgadmin.utils.passexec.subprocess.run',
                   return_value=MagicMock(stdout='p')):
            # Holding a's lock, as a running command would, must not stop
            # b fetching its password in another thread.
            with a.lock:
                t = threading.Thread(target=fetch, daemon=True)
                t.start()
                t.join(timeout=10)
        self.assertFalse(t.is_alive())
        self.assertEqual(result, ['p'])


class TestServerPasswordExecReducedEnv(BaseTestGenerator):
    """The child gets a reduced environment: secrets in pgAdmin's
    environment stay out, PATH and configured passthrough names get in,
    and the PGADMIN_PASSEXEC_* values cannot be overridden."""

    def runTest(self):
        import json
        import sys
        fake_env = {
            'PATH': '/usr/bin:/bin',
            'PGPASSWORD': 'other-users-password',
            'PGADMIN_SETUP_PASSWORD': 'setup-password',
            'VAULT_ADDR': 'https://vault.example.com',
            'LC_ALL': 'C.UTF-8',
            'PGADMIN_PASSEXEC_HOST': 'spoofed.example.com',
        }
        argv = [sys.executable, '-c',
                'import json, os; print(json.dumps(dict(os.environ)))']
        with self.app.app_context(), \
                patch.dict('os.environ', fake_env, clear=True), \
                patch.object(passexec.config,
                             'SERVER_PASSEXEC_ENV_PASSTHROUGH',
                             ['VAULT_ADDR', 'NOT_SET_ANYWHERE'],
                             create=True), \
                patch('pgadmin.utils.passexec.config.SERVER_MODE', True):
            pexec = ServerPasswordExec('t', argv, 'db.example.com', 5432,
                                       'u', 'postgres',
                                       'jane.doe@example.com', 'internal')
            env = json.loads(pexec.get())
        self.assertNotIn('PGPASSWORD', env)
        self.assertNotIn('PGADMIN_SETUP_PASSWORD', env)
        self.assertNotIn('NOT_SET_ANYWHERE', env)
        self.assertEqual(env['PATH'], '/usr/bin:/bin')
        self.assertEqual(env['VAULT_ADDR'], 'https://vault.example.com')
        self.assertEqual(env['LC_ALL'], 'C.UTF-8')
        self.assertEqual(env['PGADMIN_PASSEXEC_HOST'], 'db.example.com')


class TestServerPasswordExecFailureHidesArgv(BaseTestGenerator):
    """Failures name the command but never reveal its arguments, in
    either the raised message or the log."""

    scenarios = [
        ('Non-zero exit', dict(kind='exit')),
        ('Missing executable', dict(kind='missing')),
        ('Timeout', dict(kind='timeout')),
    ]

    def runTest(self):
        import os
        import shutil
        import sys
        import tempfile
        secret = 'S3CRET-ARG'
        timeout = 60
        if self.kind == 'exit':
            argv = [sys.executable, '-c',
                    'import sys; sys.stderr.write("boom"); sys.exit(3)',
                    secret]
            expect_log = 'status 3'
        elif self.kind == 'missing':
            d = tempfile.mkdtemp()
            self.addCleanup(shutil.rmtree, d, ignore_errors=True)
            argv = [os.path.join(d, 'no-such-command'), secret]
            expect_log = 'could not be run'
        else:
            argv = [sys.executable, '-c', 'import time; time.sleep(30)',
                    secret]
            timeout = 1
            expect_log = 'timed out'
        pexec = ServerPasswordExec('vault-test', argv, 'h', 5432, 'u',
                                   'postgres', 'jane.doe@example.com',
                                   'internal', timeout=timeout)
        with self.app.app_context(), \
                patch('pgadmin.utils.passexec.config.SERVER_MODE', True), \
                self.assertLogs('passexec', level='INFO') as logs:
            with self.assertRaises(Exception) as ctx:
                pexec.get()
        exc = ctx.exception
        self.assertIs(type(exc), Exception)
        self.assertEqual(str(exc),
                         "Password exec command 'vault-test' failed.")
        self.assertTrue(exc.__suppress_context__)
        output = '\n'.join(logs.output)
        self.assertIn('vault-test', output)
        self.assertIn(expect_log, output)
        self.assertNotIn(secret, output)
        if self.kind == 'exit':
            self.assertIn('boom', output)
