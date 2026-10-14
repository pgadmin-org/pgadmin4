##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
The packages remove every googleapiclient discovery document except the
ones listed in pkg/prune_site_packages.py, so discovery.build() would fail
there for any other service or version. Check that the services the Google
deployment uses are all kept, and still build from the bundled documents.
"""

import importlib.util
import os
import unittest

from pgadmin.utils.route import BaseTestGenerator

PRUNE_SCRIPT = os.path.abspath(os.path.join(
    os.path.dirname(__file__), *(['..'] * 6), 'pkg',
    'prune_site_packages.py'))


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection — pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestGoogleDiscoveryDocsKept(_SkipServerSetUpMixin, BaseTestGenerator):
    """The discovery documents the Google deployment needs are shipped."""

    scenarios = (('default', {}),)

    def runTest(self):
        if not os.path.isfile(PRUNE_SCRIPT):
            self.skipTest('{} not found'.format(PRUNE_SCRIPT))

        spec = importlib.util.spec_from_file_location(
            'prune_site_packages', PRUNE_SCRIPT)
        prune = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(prune)
        kept = prune.PRUNE[os.path.join(
            'googleapiclient', 'discovery_cache', 'documents')]

        from pgadmin.misc.cloud.google import Google, _google_sdk
        google = Google()
        services = {
            'cloudresourcemanager':
                google._cloud_resource_manager_api_version,
            'compute': google._compute_api_version,
            'sqladmin': google._sqladmin_api_version,
        }

        discovery = _google_sdk().discovery
        for service, version in services.items():
            self.assertIn('{}.{}.json'.format(service, version), kept)
            # Builds offline from the bundled document.
            discovery.build(service, version, developerKey='test',
                            static_discovery=True)
