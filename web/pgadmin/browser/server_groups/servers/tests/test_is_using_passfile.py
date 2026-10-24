##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for is_using_passfile(), which both check_pgpass and
change_password use to decide whether the current password is needed."""

from unittest.mock import MagicMock
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers import is_using_passfile

PASSFILE = '/home/user/.pgpass'


class TestIsUsingPassfile(BaseTestGenerator):
    """is_using_passfile() is True only when no password is saved or held
    for the session and the manager uses the server's passfile."""

    scenarios = [
        ('Passfile in use, no passwords', dict(
            server_password=None, manager_password=None,
            params={'passfile': PASSFILE}, manager_passfile=PASSFILE,
            expected=True)),
        ('Password entered at connect, not saved', dict(
            server_password=None, manager_password='secret',
            params={'passfile': PASSFILE}, manager_passfile=PASSFILE,
            expected=False)),
        ('Password saved on the server', dict(
            server_password=b'encrypted', manager_password=None,
            params={'passfile': PASSFILE}, manager_passfile=PASSFILE,
            expected=False)),
        ('No passfile configured', dict(
            server_password=None, manager_password=None,
            params={}, manager_passfile=None,
            expected=False)),
        ('No connection parameters', dict(
            server_password=None, manager_password=None,
            params=None, manager_passfile=PASSFILE,
            expected=False)),
        ('Manager uses a different passfile', dict(
            server_password=None, manager_password=None,
            params={'passfile': PASSFILE},
            manager_passfile='/home/user/other.pgpass',
            expected=False)),
    ]

    def runTest(self):
        server = MagicMock()
        server.password = self.server_password
        server.connection_params = self.params

        manager = MagicMock()
        manager.password = self.manager_password
        manager.get_connection_param_value.return_value = \
            self.manager_passfile

        self.assertEqual(is_using_passfile(server, manager), self.expected)
