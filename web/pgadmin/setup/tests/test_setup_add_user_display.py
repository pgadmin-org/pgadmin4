##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that setup.py add-user and add-external-user show the account
they have just added, and only that account, and that they give it the
right role.

setup.py is run in a separate process against a copy of the test
database, so the accounts in the test database are not changed.
"""

import os
import re
import shutil
import sqlite3
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

    def _run_setup(self, args, role_args=('--role', 'User')):
        # In testing mode create_app() uses the test database whatever
        # --sqlite-path says, so leave it to work on the copy.
        env = dict(os.environ)
        env.pop('PGADMIN_TESTING_MODE', None)
        # Keep rich from wrapping the table columns.
        env['COLUMNS'] = '200'
        result = subprocess.run(
            [sys.executable, SETUP_PY] + args + list(role_args) +
            ['--sqlite-path', self.sqlite_path],
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


class SetupAddUserRoleTestCase(SetupAddUserDisplayTestCase):
    """Without --role or --admin the user must get the 'User' role."""

    scenarios = [
        ('add-user without a role',
         dict(args=['add-user', 'cli_role_new@example.com', 'cli_role_pass'],
              role_args=[],
              username='cli_role_new@example.com', auth_source='internal',
              expected_role='User')),
        ('add-external-user without a role',
         dict(args=['add-external-user', 'cli_role_new',
                    '--auth-source', 'ldap'],
              role_args=[],
              username='cli_role_new', auth_source='ldap',
              expected_role='User')),
        ('add-user with --admin',
         dict(args=['add-user', 'cli_role_new@example.com', 'cli_role_pass'],
              role_args=['--admin'],
              username='cli_role_new@example.com', auth_source='internal',
              expected_role='Administrator')),
        ('add-external-user with --admin',
         dict(args=['add-external-user', 'cli_role_new',
                    '--auth-source', 'ldap'],
              role_args=['--admin'],
              username='cli_role_new', auth_source='ldap',
              expected_role='Administrator')),
        ('add-user with an unknown role',
         dict(args=['add-user', 'cli_role_new@example.com', 'cli_role_pass'],
              role_args=['--role', 'Nonexistent'],
              username='cli_role_new@example.com', auth_source='internal',
              expected_role=None)),
        ('add-external-user with an unknown role',
         dict(args=['add-external-user', 'cli_role_new',
                    '--auth-source', 'ldap'],
              role_args=['--role', 'Nonexistent'],
              username='cli_role_new', auth_source='ldap',
              expected_role=None)),
    ]

    def _roles(self):
        conn = sqlite3.connect(self.sqlite_path)
        try:
            return [r[0] for r in conn.execute(
                'SELECT r.name FROM user u '
                'LEFT JOIN roles_users ru ON ru.user_id = u.id '
                'LEFT JOIN role r ON r.id = ru.role_id '
                'WHERE u.username = ? AND u.auth_source = ?',
                (self.username, self.auth_source))]
        finally:
            conn.close()

    def runTest(self):
        output = self._run_setup(self.args, self.role_args)

        if self.expected_role is None:
            self.assertIn("Role 'Nonexistent' does not exists.", output)
            self.assertEqual(self._roles(), [], output)
        else:
            self.assertEqual(self._roles(), [self.expected_role], output)
