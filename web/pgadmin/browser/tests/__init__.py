##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator


class BrowserGenerateTestCase(BaseTestGenerator):
    # This is a smoke/placeholder test to ensure the browser tests package is
    # discovered by the regression runner. It should not require a live server
    # connection.
    def setUp(self):
        return

    def tearDown(self):
        return

    def runTest(self):
        return
