##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit test: ``qtLiteral`` must refuse to escape without a connection.

Historically, ``qtLiteral`` silently short-circuited when its ``conn``
argument was falsy and returned the raw value unchanged. Combined with
templates that wrapped the result in single quotes (``'{{ x|qtLiteral }}'``
or callers that forgot to pass ``conn=`` to ``render_template``), this
produced unescaped SQL string literals that allowed apostrophe-based
injection. The driver now raises so the failure is loud."""

from pgadmin.utils.driver import get_driver
from pgadmin.utils.route import BaseTestGenerator
from config import PG_DEFAULT_DRIVER


class QtLiteralRequiresConnTestCase(BaseTestGenerator):

    scenarios = [('qtLiteral raises ValueError when conn is falsy', dict())]

    def runTest(self):
        driver = get_driver(PG_DEFAULT_DRIVER)
        for bad in (None, 0, '', False):
            with self.assertRaises(ValueError) as ctx:
                driver.qtLiteral("any value", bad)
            self.assertIn('qtLiteral requires a connection',
                          str(ctx.exception))
