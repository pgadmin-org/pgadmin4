##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for the PostgreSQL 18 pg_dump options.

These call _get_args_params_values() with a mocked manager rather than going
through the API against a live server, so the version-gated behaviour is
covered whatever the test server happens to be. The existing scenarios in
test_backup_create_job_unit_test.py can only assert the v18 options where a
v18 server is available to test against, and silently skip otherwise.

Each of --statistics-only, --no-data, --no-schema and --no-statistics
conflicts with one of the --*-only options, verified against pg_dump 18:
"options -s/--schema-only and --statistics-only cannot be used together" and
so on. The utility rejects the whole command, so pgAdmin must not emit both
even if a request arrives with both set.
"""

from unittest.mock import MagicMock, patch

from pgadmin.tools.backup import _get_args_params_values
from pgadmin.utils.route import BaseTestGenerator

V18 = 180000
V17 = 170000

ALL_V18_OPTS = ['--statistics-only', '--no-policies', '--no-data',
                '--no-schema', '--no-statistics', '--statistics',
                '--sequence-data']


class BackupPG18ArgsTestCase(BaseTestGenerator):
    """The v18 options must be emitted only when they are usable."""

    scenarios = [
        ('Do not save options are emitted on v18', dict(
            version=V18,
            data=dict(no_policies=True, no_data=True, no_schema=True,
                      no_statistics=True),
            expected=['--no-policies', '--no-data', '--no-schema',
                      '--no-statistics'],
            not_expected=['--statistics-only'],
        )),
        ('Statistics and sequence data are emitted on v18', dict(
            version=V18,
            data=dict(statistics=True, sequence_data=True),
            expected=['--statistics', '--sequence-data'],
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
                      no_statistics=True, only_statistics=True,
                      statistics=True, sequence_data=True),
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
        manager = MagicMock(version=self.version, user='postgres',
                            use_ssh_tunnel=0)
        server = MagicMock(host='localhost', port=5432,
                           maintenance_db='postgres')
        data = dict(format='custom', schemas=[], tables=[], **self.data)

        with patch('pgadmin.utils.driver.get_driver',
                   return_value=MagicMock()):
            return _get_args_params_values(
                data, MagicMock(), 'objects', 'test_backup_file', server,
                manager)

    def runTest(self):
        args = self._args()

        for opt in self.expected:
            self.assertIn(opt, args)
        for opt in self.not_expected:
            self.assertNotIn(opt, args)
