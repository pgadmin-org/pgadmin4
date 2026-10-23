##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for utility_conninfo(), the --dbname value passed to the utilities.

libpq ranks a pg_service.conf entry above the PG* environment variables, so
in server mode the client credential files have to be in the connection
string itself, which ranks above the service file.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from psycopg.conninfo import conninfo_to_dict

from pgadmin.utils import (
    utility_conninfo, connection_params_to_env, NO_CLIENT_FILE)
from pgadmin.utils.route import BaseTestGenerator

CREDENTIAL_FILES = ('passfile', 'sslcert', 'sslkey')


class UtilityConninfoTestCase(BaseTestGenerator):
    """utility_conninfo() must name the database, and in server mode also
    give each credential file, whatever the database is called."""

    scenarios = [
        ('Server mode, no files: every credential file is disabled',
         dict(server_mode=True, database='postgres', params={},
              expected={'dbname': 'postgres',
                        'passfile': NO_CLIENT_FILE,
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode, no connection parameters at all',
         dict(server_mode=True, database='postgres', params=None,
              expected={'dbname': 'postgres',
                        'passfile': NO_CLIENT_FILE,
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode, the user\'s own password file is used',
         dict(server_mode=True, database='postgres',
              params={'passfile': '.pgpass'},
              expected={'dbname': 'postgres',
                        'passfile': '<storage>/.pgpass',
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode, a configured file that does not exist is passed on '
         'as the env translation gives it',
         dict(server_mode=True, database='postgres',
              params={'sslcert': 'missing.crt'},
              expected={'dbname': 'postgres',
                        'passfile': NO_CLIENT_FILE,
                        'sslcert': '<storage>/missing.crt',
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode, no database given',
         dict(server_mode=True, database=None, params={},
              expected={'passfile': NO_CLIENT_FILE,
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode, a database name that looks like a connection string',
         dict(server_mode=True, database='host=evil dbname=x', params={},
              expected={'dbname': 'host=evil dbname=x',
                        'passfile': NO_CLIENT_FILE,
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode, a database name that looks like a URI',
         dict(server_mode=True, database='postgresql://evil/x', params={},
              expected={'dbname': 'postgresql://evil/x',
                        'passfile': NO_CLIENT_FILE,
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode, a path escaping the storage directory falls back '
         'to disabling the file',
         dict(server_mode=True, database='postgres',
              params={'passfile': '../x', 'sslkey': '../../y'},
              expected={'dbname': 'postgres',
                        'passfile': NO_CLIENT_FILE,
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Desktop mode: the database name only',
         dict(server_mode=False, database='postgres',
              params={'passfile': '.pgpass'},
              expected={'dbname': 'postgres'})),
        ('Desktop mode, no database given',
         dict(server_mode=False, database=None, params={},
              expected={})),
        ('Desktop mode, a database name that looks like a URI',
         dict(server_mode=False, database='postgresql://evil/x', params={},
              expected={'dbname': 'postgresql://evil/x'})),
    ]

    def setUp(self):
        # Filesystem-only tests: skip BaseTestGenerator's server setup.
        unittest.TestCase.setUp(self)
        self.storage = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_utility_conninfo_'))
        with open(os.path.join(self.storage, '.pgpass'), 'w') as f:
            f.write('*:*:*:*:secret\n')

    def tearDown(self):
        shutil.rmtree(self.storage, ignore_errors=True)

    def _patches(self):
        return [
            patch.dict(self.app.config, {'SERVER_MODE': self.server_mode}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.storage),
        ]

    def runTest(self):
        patches = self._patches()
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                result = conninfo_to_dict(
                    utility_conninfo(self.database, self.params))
            finally:
                for p in reversed(patches):
                    p.stop()

        expected = {k: v.replace('<storage>', self.storage)
                    for k, v in self.expected.items()}
        self.assertEqual(result, expected)


class UtilityConninfoMatchesEnvTestCase(BaseTestGenerator):
    """The files in the connection string and in the environment are the
    same, so the environment variables are only a second layer."""

    scenarios = [('Server mode', dict())]

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.storage = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_utility_conninfo_'))

    def tearDown(self):
        shutil.rmtree(self.storage, ignore_errors=True)

    def runTest(self):
        params = {'passfile': 'a', 'sslcert': 'b'}
        patches = [
            patch.dict(self.app.config, {'SERVER_MODE': True}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.storage),
        ]
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                env = connection_params_to_env(params)
                info = conninfo_to_dict(utility_conninfo('d', params))
            finally:
                for p in reversed(patches):
                    p.stop()

        self.assertEqual(info['passfile'], env['PGPASSFILE'])
        self.assertEqual(info['sslcert'], env['PGSSLCERT'])
        self.assertEqual(info['sslkey'], env['PGSSLKEY'])
