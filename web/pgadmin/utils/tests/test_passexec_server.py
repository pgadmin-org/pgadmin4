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
