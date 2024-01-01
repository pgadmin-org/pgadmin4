##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils


class TestSSLConnection(BaseTestGenerator):
    """This will check if SSL is used in our database connection"""
    scenarios = [
        ('Test for SSL connection', dict())
    ]

    def runTest(self):
        if hasattr(self, 'ignore_test'):
            return
        supported_modes = ['require', 'verify-ca', 'verify-full']
        if self.server['sslmode'] in supported_modes:
            with test_utils.Database(self.server) as (
                connection, database_name
            ):

                cursor = connection.cursor()
                cursor.execute("CREATE EXTENSION sslinfo")
                connection.commit()
                cursor.execute("SELECT ssl_is_used()")
                is_ssl_used = cursor.fetchone()[0]
                self.assertEqual(True, is_ssl_used)
        else:
            self.skipTest(
                'Cannot run SSL connection check test '
                'with \'{0}\' sslmode'.format(self.server['sslmode']))
