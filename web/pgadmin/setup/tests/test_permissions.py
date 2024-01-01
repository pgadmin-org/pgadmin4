##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
import os
import config
from stat import *


class PermissionsTestCase(BaseTestGenerator):
    """
    This class validates filesystem permissions for data/config storage
    """

    scenarios = [
        ('Check config database', dict(path=config.TEST_SQLITE_PATH,
                                       permissions='600')),
        ('Check config directory', dict(
            path=os.path.dirname(config.TEST_SQLITE_PATH),
            permissions='700')),
        ('Check session directory', dict(
            path=config.SESSION_DB_PATH,
            permissions='700'))
    ]

    def setUp(self):
        if os.name == 'nt':
            self.skipTest("This test is skipped on Windows which doesn't "
                          "support Unix style file permissions.")

    def runTest(self):
        self.assertTrue(
            oct(os.stat(self.path)[ST_MODE])[-3:] == self.permissions
        )
