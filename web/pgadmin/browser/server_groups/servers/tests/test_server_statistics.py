##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the WAL directory row in the server Statistics tab."""

import json
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.utils.server_utils import connect_server

STATS_URL = '/browser/server/stats/'
WAL_ROW_LABEL = 'WAL directory'
EXECUTE_SCALAR = \
    'pgadmin.utils.driver.psycopg3.connection.Connection.execute_scalar'


class ServerStatisticsWalTestCase(BaseTestGenerator):
    """The WAL row is shown only when pg_ls_waldir() may be called."""

    scenarios = [
        ('WAL row follows the privilege of the connected role',
         dict(force_unprivileged=False)),
        ('WAL row is omitted, without error, when the role lacks it',
         dict(force_unprivileged=True)),
    ]

    def get_wal_rows(self, server_id):
        response = self.tester.get(
            '{0}{1}/{2}'.format(STATS_URL, utils.SERVER_GROUP, server_id),
            follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        rows = json.loads(response.data.decode('utf-8'))['data']['rows']
        return [r for r in rows if r.get('Application') == WAL_ROW_LABEL]

    def runTest(self):
        server_id = parent_node_dict["server"][-1]["server_id"]
        connect_server(self, server_id)

        if self.force_unprivileged:
            # Only the privilege check uses execute_scalar in this view.
            with patch(EXECUTE_SCALAR, return_value=(True, False)):
                self.assertEqual(self.get_wal_rows(server_id), [])
            return

        conn = utils.get_db_connection(self.server['db'],
                                       self.server['username'],
                                       self.server['db_password'],
                                       self.server['host'],
                                       self.server['port'],
                                       self.server['sslmode'])
        cursor = conn.cursor()
        cursor.execute("SELECT pg_catalog.has_function_privilege("
                       "'pg_catalog.pg_ls_waldir()', 'EXECUTE')")
        privileged = cursor.fetchone()[0]
        conn.close()

        wal_rows = self.get_wal_rows(server_id)
        if privileged:
            self.assertEqual(len(wal_rows), 1)
            self.assertRegex(wal_rows[0]['Query'], r'^\S+ \S+ \(\d+ files\)$')
        else:
            self.assertEqual(wal_rows, [])
