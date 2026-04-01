##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Test the URL validation functionality in Explain PostgreSQL module."""
import unittest
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.expl_pgsql import is_valid_url


class TestURLValidation(BaseTestGenerator):
    """Test the URL validation functionality."""

    scenarios = [
        ('Valid HTTPS URL', dict(
            url='https://explain.tensor.ru',
            expected=True
        )),
        ('Valid HTTP URL', dict(
            url='http://explain.tensor.ru',
            expected=True
        )),
        ('Invalid FTP URL', dict(
            url='ftp://explain.tensor.ru',
            expected=False
        )),
        ('Invalid protocol', dict(
            url='javascript:alert(1)',
            expected=False
        )),
        ('Empty URL', dict(
            url='',
            expected=False
        )),
        ('None URL', dict(
            url=None,
            expected=False
        ))
    ]

    def runTest(self):
        """Run test case."""
        result = is_valid_url(self.url)
        self.assertEqual(result, self.expected)
