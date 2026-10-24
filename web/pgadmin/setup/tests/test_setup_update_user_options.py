##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that setup.py update-user and update-external-user can change an
account without --role or --admin, e.g. to deactivate it as the LDAP
documentation describes.

setup.py is run in a separate process against a copy of the test
database, so the accounts in the test database are not changed.
"""

import os
import shutil
import subprocess
import sys
import sqlite3
import tempfile

import config
from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data

SETUP_PY = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'setup.py')


class SetupUpdateUserOptionsTestCase(BaseTestGenerator):
    """--inactive alone must not fail for want of a role."""

    scenarios = [
        ('update-user --inactive',
         dict(args=['update-user', 'no-such-user@example.com',
                    '--inactive'])),
        ('update-external-user --inactive',
         dict(args=['update-external-user', 'no-such-user', '--auth-source',
                    'ldap', '--inactive'])),
        # The account is the test login account in server mode and the
        # desktop user in desktop mode, the only internal account there.
        ('update-user --inactive deactivates the account',
         dict(args=['update-user', None, '--inactive'], deactivates=True)),
    ]

    deactivates = False

    def setUp(self):
        if config.CONFIG_DATABASE_URI:
            self.skipTest('Needs the SQLite configuration database.')
        self.tmp_dir = tempfile.mkdtemp()
        self.sqlite_path = os.path.join(self.tmp_dir, 'pgadmin4.db')
        shutil.copy(config.SQLITE_PATH, self.sqlite_path)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def runTest(self):
        if self.deactivates:
            self.args = list(self.args)
            self.args[1] = (
                config_data['pgAdmin4_login_credentials']['login_username']
                if config.SERVER_MODE else config.DESKTOP_USER)
        # In testing mode create_app() uses the test database whatever
        # --sqlite-path says, so leave it to work on the copy.
        env = dict(os.environ)
        env.pop('PGADMIN_TESTING_MODE', None)
        result = subprocess.run(
            [sys.executable, SETUP_PY] + self.args +
            ['--sqlite-path', self.sqlite_path],
            capture_output=True, text=True, timeout=120,
            cwd=os.path.dirname(SETUP_PY), env=env)

        output = result.stdout + result.stderr
        self.assertNotIn('Traceback', output)
        if not self.deactivates:
            self.assertIn('User not found', output)
            return

        with sqlite3.connect(self.sqlite_path) as conn:
            active, = conn.execute(
                "SELECT active FROM user WHERE username = ? AND "
                "auth_source = 'internal'", (self.args[1],)).fetchone()
        self.assertFalse(active, output)
