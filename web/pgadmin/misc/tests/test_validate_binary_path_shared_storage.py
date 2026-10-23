##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for the /misc/validate_binary_path route: it must
reject a utility_path under a configured SHARED_STORAGE entry, the same
way it already rejected one under STORAGE_DIR (CWE-426, see
utils/tests/test_is_reserved_storage_path.py for the full writeup).

This exercises the actual blueprint route, patched config included, so a
future edit that re-inlines the STORAGE_DIR-only check (rather than
calling is_reserved_storage_path) fails here even though the isolated
unit tests for the helper would still pass.
"""

import json
import sys
from unittest.mock import patch

import pgadmin.misc as misc_module
from pgadmin.utils.route import BaseTestGenerator

STORAGE_DIR = '/var/lib/pgadmin/storage'

NON_RESTRICTED_SHARE = [
    {'name': 'Shared 1', 'path': '/shared_folder',
     'restricted_access': False}]


class TestValidateBinaryPathRejectsSharedStorage(BaseTestGenerator):
    """POST /misc/validate_binary_path with a utility_path under a
    SHARED_STORAGE entry is refused with 428, never reaching
    get_binary_path_versions() (so nothing is executed)."""

    scenarios = [('default', dict())]

    @patch('pgadmin.misc.get_binary_path_versions')
    def runTest(self, get_binary_path_versions_mock):
        with patch.object(misc_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(misc_module.config, 'SHARED_STORAGE',
                             NON_RESTRICTED_SHARE):
            response = self.tester.post(
                '/misc/validate_binary_path',
                data=json.dumps({'utility_path': '/shared_folder'}),
                content_type='application/json')

        self.assertEqual(response.status_code, 428)
        get_binary_path_versions_mock.assert_not_called()


class TestValidateBinaryPathAllowsOrdinaryPath(BaseTestGenerator):
    """An ordinary utility_path, outside both STORAGE_DIR and every
    SHARED_STORAGE entry, still reaches get_binary_path_versions()."""

    scenarios = [('default', dict())]

    @patch('pgadmin.misc.get_binary_path_versions')
    def runTest(self, get_binary_path_versions_mock):
        get_binary_path_versions_mock.return_value = {}
        with patch.object(misc_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(misc_module.config, 'SHARED_STORAGE',
                             NON_RESTRICTED_SHARE):
            response = self.tester.post(
                '/misc/validate_binary_path',
                data=json.dumps({'utility_path': '/usr/pgsql/bin'}),
                content_type='application/json')

        self.assertEqual(response.status_code, 200)
        get_binary_path_versions_mock.assert_called_once_with(
            '/usr/pgsql/bin')


class TestValidateBinaryPathRejectsDirDotDot(BaseTestGenerator):
    """A '$DIR/..' path that, once '$DIR' is expanded, lands in a
    SHARED_STORAGE entry is refused with 428 too."""

    scenarios = [('default', dict())]

    @patch('pgadmin.misc.get_binary_path_versions')
    def runTest(self, get_binary_path_versions_mock):
        with patch.object(misc_module.config, 'STORAGE_DIR', STORAGE_DIR), \
                patch.object(misc_module.config, 'SHARED_STORAGE',
                             NON_RESTRICTED_SHARE), \
                patch.object(sys.modules['__main__'], '__file__',
                             '/opt/pgadmin/pgAdmin4.py', create=True):
            response = self.tester.post(
                '/misc/validate_binary_path',
                data=json.dumps({'utility_path': '$DIR/../../shared_folder'}),
                content_type='application/json')

        self.assertEqual(response.status_code, 428)
        get_binary_path_versions_mock.assert_not_called()
