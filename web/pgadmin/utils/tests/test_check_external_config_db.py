##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for check_external_config_db().

The container entrypoint calls this to decide whether an external
configuration database has already been initialised, and treats anything
other than "True" as "no, so run first-launch setup". It therefore has to
answer False rather than raise when the database cannot be reached at all,
which the previous "finally: connection.close()" prevented: engine.connect()
failing left connection unbound and the NameError escaped in place of the
answer.

The module is imported the way the entrypoint imports it, as a top level
module from the directory it lives in, so that this also fails if that
arrangement is ever broken.
"""

import os
import sys
from urllib.parse import quote

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

UTILS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if UTILS_DIR not in sys.path:
    sys.path.append(UTILS_DIR)

from check_external_config_db import check_external_config_db  # noqa: E402


class CheckExternalConfigDBTestCase(BaseTestGenerator):
    """check_external_config_db() must answer, not raise."""

    scenarios = [
        ('An unreachable host answers False', dict(
            case='unreachable')),
        ('A malformed URI answers False', dict(
            case='malformed')),
        ('A reachable database with no server table answers False', dict(
            case='reachable_without_table')),
        ('A reachable database with a server table answers True', dict(
            case='reachable_with_table')),
    ]

    def setUp(self):
        self.created_table = False
        self.db_name = self.server['db']

    def _uri(self):
        username = quote(str(self.server['username']), safe='')
        password = quote(str(self.server['db_password']), safe='')
        host = self.server['host']
        port = self.server['port']

        # A Unix domain socket directory (as used on the Linux/macOS test
        # runners) can't be embedded in the URI's authority component: a
        # "/" there is parsed as the start of the path, not part of the
        # host, leaving the host/port undetermined and the database name
        # mangled. libpq's URI form for that case instead leaves the
        # authority's host empty and passes the socket directory as the
        # "host" query parameter.
        if '/' in str(host):
            return 'postgresql://{0}:{1}@/{2}?host={3}&port={4}'.format(
                username, password, self.db_name,
                quote(str(host), safe=''), port)

        return 'postgresql://{0}:{1}@{2}:{3}/{4}'.format(
            username, password, host, port, self.db_name)

    def _connect(self):
        return utils.get_db_connection(self.db_name,
                                       self.server['username'],
                                       self.server['db_password'],
                                       self.server['host'],
                                       self.server['port'],
                                       self.server['sslmode'])

    def runTest(self):
        if self.case == 'unreachable':
            # Port 1 is not something a PostgreSQL server listens on, so the
            # connection is refused rather than timing out.
            self.assertFalse(check_external_config_db(
                'postgresql://pgadmin:pgadmin@127.0.0.1:1/pgadmin'))
            return

        if self.case == 'malformed':
            self.assertFalse(check_external_config_db('not a uri at all'))
            return

        if self.case == 'reachable_without_table':
            self.assertFalse(check_external_config_db(self._uri()))
            return

        connection = self._connect()
        try:
            old_isolation_level = connection.isolation_level
            utils.set_isolation_level(connection, 0)
            cursor = connection.cursor()
            cursor.execute('CREATE TABLE public.server (id serial)')
            # Recorded as soon as the table exists, before the isolation
            # level restore and commit below, so tearDown still drops it
            # if either of those later steps were to fail.
            self.created_table = True
            utils.set_isolation_level(connection, old_isolation_level)
            connection.commit()
        finally:
            connection.close()

        self.assertTrue(check_external_config_db(self._uri()))

    def tearDown(self):
        if not self.created_table:
            return
        connection = self._connect()
        try:
            old_isolation_level = connection.isolation_level
            utils.set_isolation_level(connection, 0)
            cursor = connection.cursor()
            cursor.execute('DROP TABLE IF EXISTS public.server')
            utils.set_isolation_level(connection, old_isolation_level)
            connection.commit()
        finally:
            connection.close()
