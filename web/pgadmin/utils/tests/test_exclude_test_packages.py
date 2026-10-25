##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify which test modules an excluded package or module leaves out.

An excluded name leaves out that package or module and what it contains,
not every module whose name merely starts with the same text: excluding
browser.tests.test_reset_password must still run
browser.tests.test_reset_password_auth_source.
"""

from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator, TestsGeneratorRegistry

MODULES = [
    'pgadmin.browser.tests.test_reset_password',
    'pgadmin.browser.tests.test_reset_password_auth_source',
    'pgadmin.browser.server_groups.tests.test_sg_get',
    'pgadmin.browser.server_groups.servers.tests.test_server_get',
    'pgadmin.browser.server_groups.servers.databases.tests.test_db_get',
    'pgadmin.tools.sqleditor.tests.test_editor',
]


class ExcludeTestPackagesTestCase(BaseTestGenerator):
    """An excluded name matches whole package and module names."""

    scenarios = [
        ('An excluded module leaves out that module only',
         dict(exclude=['browser.tests.test_reset_password'],
              expect=[m for m in MODULES
                      if m != 'pgadmin.browser.tests.test_reset_password'])),
        ('An excluded package leaves out everything in it',
         dict(exclude=['browser.server_groups.servers'],
              expect=[MODULES[0], MODULES[1], MODULES[2], MODULES[5]])),
        ('Nothing excluded',
         dict(exclude=[], expect=MODULES)),
    ]

    # No database server is needed.
    def setUp(self):
        pass

    def runTest(self):
        with patch('pgadmin.utils.route.import_module') as import_mock:
            TestsGeneratorRegistry._exclude_packages(MODULES, self.exclude)
        self.assertEqual([c.args[0] for c in import_mock.call_args_list],
                         self.expect)
