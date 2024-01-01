##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.utils import is_version_in_range


class VersionInRangeTestCase(BaseTestGenerator):
    """
    This class validates the version in range functionality
    by defining different version scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    scenarios = [
        (
            'TestCase for Validating pgversion 8.23 and min_version is 91000, '
            'it should not show', dict(
                sversion=82300,
                min_version=90100,
                max_version=1000000000,
                scenario=2
            )),
        (
            'TestCase for Validating pgversion 9.2, '
            'it should show by default', dict(
                sversion=90200,
                min_version=0,
                max_version=1000000000,
                scenario=1
            )),
        (
            'TestCase for Validating pgversion 9.2 and min/max are None, '
            'it should show by default', dict(
                sversion=90200,
                min_version=None,
                max_version=None,
                scenario=1
            )),
        (
            'TestCase for Validating pgversion 9.6 and max is lower, '
            'it should not show', dict(
                sversion=90600,
                min_version=None,
                max_version=90400,
                scenario=2
            ))
    ]

    @classmethod
    def setUpClass(cls):
        pass

    # No need to call base class setup function
    def setUp(self):
        pass

    def runTest(self):
        """This function will check version in range functionality."""
        if self.scenario == 1:
            self.test_result_is_true()
        if self.scenario == 2:
            self.test_result_is_false()

    def test_result_is_true(self):
        self.assertTrue(
            is_version_in_range(
                self.sversion,
                self.min_version,
                self.max_version
            )
        )

    def test_result_is_false(self):
        self.assertFalse(
            is_version_in_range(
                self.sversion,
                self.min_version,
                self.max_version
            )
        )
