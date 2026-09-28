##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import tempfile
from unittest.mock import patch

import psycopg
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from pgadmin.utils import database_conninfo
from pgadmin.utils.route import BaseTestGenerator


class DatabaseConninfoTestCase(BaseTestGenerator):
    """
    database_conninfo() must produce a connection string that libpq parses
    back to exactly the given database name, and nothing else, whatever
    characters the name contains.
    """

    scenarios = [
        ('Plain name', dict(database='postgres')),
        ('Name with a space', dict(database='my db')),
        ('Name with a single quote', dict(database="o'neil")),
        ('Name with a backslash', dict(database='a\\b')),
        ('Name that looks like a connection string',
         dict(database='host=192.0.2.1 port=5433 dbname=postgres')),
        ('Name that looks like a URI',
         dict(database='postgresql://user@192.0.2.1:5433/postgres')),
    ]

    def runTest(self):
        self.assertEqual(conninfo_to_dict(database_conninfo(self.database)),
                         {'dbname': self.database})


class DatabaseConninfoServiceFileTestCase(BaseTestGenerator):
    """
    The database given via database_conninfo() must take precedence over a
    dbname set in the server's service file, as the utilities receive it on
    --dbname alongside PGSERVICE.
    """

    scenarios = [
        ('Chosen database wins over service file dbname', dict()),
    ]

    def runTest(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            service_file = os.path.join(tmpdir, 'pg_service.conf')
            with open(service_file, 'w') as f:
                f.write('[pgadmin_test]\ndbname=template1\n')

            conninfo = make_conninfo(
                database_conninfo(self.server['db']),
                user=self.server['username'],
                password=self.server['db_password'],
                host=self.server['host'],
                port=self.server['port'],
                sslmode=self.server.get('sslmode', 'prefer'))

            with patch.dict(os.environ, {'PGSERVICEFILE': service_file,
                                         'PGSERVICE': 'pgadmin_test'}):
                with psycopg.connect(conninfo) as conn:
                    db = conn.execute('SELECT current_database()').fetchone()

        self.assertEqual(db[0], self.server['db'])
