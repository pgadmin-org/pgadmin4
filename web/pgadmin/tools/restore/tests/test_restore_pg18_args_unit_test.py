##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for the PostgreSQL 18 pg_restore options.

These call get_restore_util_args() with a mocked manager rather than going
through the API against a live server, so the version-gated behaviour is
covered whatever the test server happens to be.

pg_restore 18 rejects --statistics-only alongside -a/--data-only or
-s/--schema-only, --no-data alongside --data-only, --no-schema alongside
--schema-only and --no-statistics alongside --statistics-only, so pgAdmin
must not emit both halves of any of those pairs.
"""

from unittest.mock import MagicMock

from pgadmin.tools.restore import get_restore_util_args
from pgadmin.utils.route import BaseTestGenerator

V18 = 180000
V17 = 170000

ALL_V18_OPTS = ['--statistics-only', '--no-policies', '--no-data',
                '--no-schema', '--no-statistics']


class RestorePG18ArgsTestCase(BaseTestGenerator):
    """The v18 options must be emitted only when they are usable."""

    scenarios = [
        ('Do not restore options are emitted on v18', dict(
            version=V18,
            data=dict(no_policies=True, no_data=True, no_schema=True,
                      no_statistics=True),
            expected=['--no-policies', '--no-data', '--no-schema',
                      '--no-statistics'],
            not_expected=['--statistics-only'],
        )),
        ('Only statistics is emitted on v18', dict(
            version=V18,
            data=dict(only_statistics=True),
            expected=['--statistics-only'],
            not_expected=['--data-only', '--schema-only'],
        )),
        ('No v18 option is emitted on v17', dict(
            version=V17,
            data=dict(no_policies=True, no_data=True, no_schema=True,
                      no_statistics=True, only_statistics=True),
            expected=[],
            not_expected=ALL_V18_OPTS,
        )),
        ('Only data wins over only statistics and no data', dict(
            version=V18,
            data=dict(only_data=True, only_statistics=True, no_data=True),
            expected=['--data-only'],
            not_expected=['--statistics-only', '--no-data'],
        )),
        ('Only schema wins over only statistics and no schema', dict(
            version=V18,
            data=dict(only_schema=True, only_statistics=True, no_schema=True),
            expected=['--schema-only'],
            not_expected=['--statistics-only', '--no-schema'],
        )),
        ('Only statistics wins over no statistics', dict(
            version=V18,
            data=dict(only_statistics=True, no_statistics=True),
            expected=['--statistics-only'],
            not_expected=['--no-statistics'],
        )),
    ]

    def setUp(self):
        # A pure argument-marshalling test: no server connection needed.
        pass

    def _args(self):
        manager = MagicMock(version=self.version, use_ssh_tunnel=0)
        server = MagicMock(host='localhost', port=5432, username='postgres')
        data = dict(format='custom', **self.data)

        return get_restore_util_args(data, manager, server, MagicMock(),
                                     MagicMock(), 'test_restore_file')

    def runTest(self):
        args = self._args()

        for opt in self.expected:
            self.assertIn(opt, args)
        for opt in self.not_expected:
            self.assertNotIn(opt, args)
