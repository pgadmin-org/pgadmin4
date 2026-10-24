##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that setup.py add-user and add-external-user show the account
they have just added, and only that account.

setup.py is run in a separate process against a copy of the test
database, so the accounts in the test database are not changed.
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile

import config
from pgadmin.utils.route import BaseTestGenerator

SETUP_PY = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'setup.py')


class SetupAddUserDisplayTestCase(BaseTestGenerator):
    """The "User Details" shown must be those of the user just added."""

    scenarios = [
        ('add-external-user without --email',
         dict(args=['add-external-user', 'cli_display_new',
                    '--auth-source', 'ldap'],
              expected=('cli_display_new', 'ldap'))),
        ('add-external-user with --email',
         dict(args=['add-external-user', 'cli_display_new',
                    '--auth-source', 'ldap',
                    '--email', 'cli_display_new@example.com'],
              expected=('cli_display_new', 'ldap'))),
        ('add-external-user with another user of the same source',
         dict(existing=['add-external-user', 'cli_display_other',
                        '--auth-source', 'ldap'],
              args=['add-external-user', 'cli_display_new',
                    '--auth-source', 'ldap'],
              expected=('cli_display_new', 'ldap'))),
        ('add-user',
         dict(args=['add-user', 'cli_display_new@example.com',
                    'cli_display_pass'],
              expected=('cli_display_new@example.com', 'internal'))),
    ]

    existing = None

    def setUp(self):
        if config.CONFIG_DATABASE_URI:
            self.skipTest('Needs the SQLite configuration database.')
        self.tmp_dir = tempfile.mkdtemp()
        self.sqlite_path = os.path.join(self.tmp_dir, 'pgadmin4.db')
        shutil.copy(config.SQLITE_PATH, self.sqlite_path)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _run_setup(self, args):
        # In testing mode create_app() uses the test database whatever
        # --sqlite-path says, so leave it to work on the copy.
        env = dict(os.environ)
        env.pop('PGADMIN_TESTING_MODE', None)
        # Keep rich from wrapping the table columns.
        env['COLUMNS'] = '200'
        result = subprocess.run(
            [sys.executable, SETUP_PY] + args +
            ['--role', 'User', '--sqlite-path', self.sqlite_path],
            capture_output=True, text=True, timeout=120,
            cwd=os.path.dirname(SETUP_PY), env=env)
        output = result.stdout + result.stderr
        self.assertNotIn('Traceback', output)
        return output

    @staticmethod
    def _field(output, name):
        return re.findall(r'^\|\s*{0}\s*\|\s*(\S+)\s*\|'.format(name),
                          output, re.MULTILINE)

    def runTest(self):
        if self.existing:
            self._run_setup(self.existing)

        output = self._run_setup(self.args)

        username, auth_source = self.expected
        self.assertEqual(output.count('User Details'), 1, output)
        self.assertEqual(self._field(output, 'Username'), [username], output)
        self.assertEqual(self._field(output, 'auth_source'), [auth_source],
                         output)
