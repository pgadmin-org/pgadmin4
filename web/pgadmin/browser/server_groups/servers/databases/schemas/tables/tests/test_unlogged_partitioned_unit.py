##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for BaseTableView._unlogged_unsupported(), which stops
UNLOGGED being generated for a partitioned table on PostgreSQL 18 and
later, where the server rejects it (#9057).
"""

from pgadmin.browser.server_groups.servers.databases.schemas.tables.utils \
    import BaseTableView
from pgadmin.utils.route import BaseTestGenerator


class TestUnloggedUnsupported(BaseTestGenerator):
    """Unit tests for BaseTableView._unlogged_unsupported()."""

    scenarios = [
        ('Partitioned table on PostgreSQL 18',
         dict(data={'is_partitioned': True}, version=180000,
              expected=True)),
        ('Partitioned table on a later release',
         dict(data={'is_partitioned': True}, version=190000,
              expected=True)),
        ('Partitioned table on PostgreSQL 17',
         dict(data={'is_partitioned': True}, version=170000,
              expected=False)),
        ('Leaf partition or plain table on PostgreSQL 18',
         dict(data={'is_partitioned': False}, version=180000,
              expected=False)),
        ('Table data without is_partitioned on PostgreSQL 18',
         dict(data={}, version=180000, expected=False)),
    ]

    def runTest(self):
        self.assertEqual(
            BaseTableView._unlogged_unsupported(self.data, self.version),
            self.expected)
