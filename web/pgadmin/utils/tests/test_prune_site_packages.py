##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
The packages run pkg/prune_site_packages.py to remove files from the
installed Python packages that pgAdmin never uses. Prune a copy of each
affected directory, point the library at it, and check that everything
pgAdmin needs from it still works.
"""

import ast
import importlib.util
import os
import shutil
import tempfile
import unittest
from datetime import datetime
from unittest import mock

import config
from pgadmin.utils.route import BaseTestGenerator

PRUNE_SCRIPT = os.path.abspath(os.path.join(
    os.path.dirname(__file__), *(['..'] * 4), 'pkg',
    'prune_site_packages.py'))
PGACLOUD_GOOGLE = os.path.abspath(os.path.join(
    os.path.dirname(__file__), *(['..'] * 3), 'pgacloud', 'providers',
    'google.py'))


def _pgacloud_services():
    """Return the (service, version) pairs that pgacloud's Google provider
    passes to discovery.build()."""
    with open(PGACLOUD_GOOGLE, encoding='utf-8') as f:
        tree = ast.parse(f.read(), PGACLOUD_GOOGLE)
    return {tuple(arg.value for arg in node.args[:2])
            for node in ast.walk(tree)
            if isinstance(node, ast.Call) and
            isinstance(node.func, ast.Attribute) and
            node.func.attr == 'build' and len(node.args) >= 2 and
            all(isinstance(arg, ast.Constant) for arg in node.args[:2])}


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection — pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestPruneSitePackages(_SkipServerSetUpMixin, BaseTestGenerator):
    """What pgAdmin uses survives pruning the installed packages."""

    scenarios = (
        ('Google discovery documents', dict(check='google')),
        ('Babel locale data', dict(check='babel')),
        ('Packaging tools', dict(check='packaging')),
    )

    def runTest(self):
        if not os.path.isfile(PRUNE_SCRIPT):
            self.skipTest('{} not found'.format(PRUNE_SCRIPT))

        spec = importlib.util.spec_from_file_location(
            'prune_site_packages', PRUNE_SCRIPT)
        self.prune = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.prune)

        getattr(self, '_check_' + self.check)()

    def _pruned_copy(self, source, subdir):
        """Copy source, prune it as subdir would be and return the copy."""
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp)
        target = os.path.join(tmp, 'data')
        shutil.copytree(source, target)
        self.prune.prune_dir(target, *self.prune.PRUNE[subdir])
        return target

    def _check_google(self):
        from googleapiclient import discovery_cache
        from pgadmin.misc.cloud.google import Google, _google_sdk

        docs = self._pruned_copy(
            discovery_cache.DISCOVERY_DOC_DIR,
            os.path.join('googleapiclient', 'discovery_cache', 'documents'))

        google = Google()
        services = {
            ('cloudresourcemanager',
             google._cloud_resource_manager_api_version),
            ('compute', google._compute_api_version),
            ('sqladmin', google._sqladmin_api_version),
        }
        pgacloud_services = _pgacloud_services()
        self.assertTrue(pgacloud_services)
        services |= pgacloud_services

        discovery = _google_sdk().discovery
        with mock.patch.object(discovery_cache, 'DISCOVERY_DOC_DIR', docs):
            for service, version in sorted(services):
                with self.subTest(service=service, version=version):
                    # Builds offline from the bundled document.
                    discovery.build(service, version, developerKey='test',
                                    static_discovery=True)

    def _check_babel(self):
        from babel import Locale, localedata
        from babel.dates import format_datetime

        data = self._pruned_copy(
            localedata._dirname, os.path.join('babel', 'locale-data'))

        localedata.locale_identifiers.cache_clear()
        self.addCleanup(localedata.locale_identifiers.cache_clear)
        with mock.patch.object(localedata, '_dirname', data), \
                mock.patch.dict(localedata._cache, clear=True):
            for language in config.LANGUAGES:
                with self.subTest(language=language):
                    locale = Locale.parse(language)
                    self.assertTrue(locale.display_name)
                    self.assertTrue(format_datetime(datetime(2026, 1, 2),
                                                    locale=locale))

    def _check_packaging(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp)
        site_packages = os.path.join(tmp, 'lib', 'site-packages')
        files = {
            os.path.join('pip', '__init__.py'): 'pip/__init__.py',
            os.path.join('pip', '__pycache__', 'x.pyc'): None,
            os.path.join('pip-1.0.dist-info', 'RECORD'):
                'pip-1.0.dist-info/RECORD',
            os.path.join('..', 'bin', 'pip'): '../bin/pip',
            os.path.join('keep', '__init__.py'): None,
        }
        for path, record in files.items():
            path = os.path.join(site_packages, path)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w') as f:
                f.write('x')
        with open(os.path.join(site_packages, 'pip-1.0.dist-info',
                               'RECORD'), 'w') as f:
            f.write(''.join('{},,\n'.format(record)
                            for record in files.values() if record))

        # Pruning only site-packages leaves the scripts outside it alone.
        self.prune.uninstall(site_packages, 'pip-1.0.dist-info',
                             site_packages)
        self.assertEqual(sorted(os.listdir(site_packages)), ['keep'])
        self.assertTrue(os.path.exists(os.path.join(tmp, 'lib', 'bin',
                                                    'pip')))

        # setuptools is kept if anything imports pkg_resources when it is
        # loaded, as passlib 1.7.4 does on Python 3.9 (#9829), but not for
        # lazy or guarded imports, or tests.
        modules = {
            os.path.join('keep', '__init__.py'): None,
            os.path.join('lazy', '__init__.py'):
                'def f():\n    import pkg_resources\n',
            os.path.join('keep', 'tests', 'test_x.py'):
                'import pkg_resources\n',
            os.path.join('pkg_resources', '__init__.py'):
                'from pkg_resources.extern import x\n',
        }
        for path, content in modules.items():
            path = os.path.join(site_packages, path)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w') as f:
                f.write(content or '')
        self.assertEqual(self.prune.pkg_resources_users(site_packages), [])

        path = os.path.join(site_packages, 'passlib', 'pwd.py')
        os.makedirs(os.path.dirname(path))
        with open(path, 'w') as f:
            f.write('import os\nimport pkg_resources\n')
        self.assertEqual(self.prune.pkg_resources_users(site_packages),
                         [os.path.join('passlib', 'pwd.py')])
