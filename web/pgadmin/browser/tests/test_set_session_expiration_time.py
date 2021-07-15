##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
import config


class SetSessionExpirationTimeTestCase(BaseTestGenerator):
    """
    This class verifies whether session expire time has been appropriately
    set to desktop & server mode respectively.
    """
    SESSION_EXP_TIME_DESKTOP = 7
    SESSION_EXP_TIME_SERVER = 1

    scenarios = [
        (
            'TestCase for verifying session expire time is set to {0} days for '
            'desktop mode'.format(SESSION_EXP_TIME_DESKTOP),
            dict(
                session_expiration_time=SESSION_EXP_TIME_DESKTOP,
                is_desktop_mode=True
            )),
        (
            'TestCase for verifying session expire time is set to {0} day for '
            'server mode'.format(SESSION_EXP_TIME_SERVER),
            dict(
                session_expiration_time=SESSION_EXP_TIME_SERVER,
                is_desktop_mode=False
            )),
    ]

    def runTest(self):

        if config.SERVER_MODE and not self.is_desktop_mode or \
                not config.SERVER_MODE and self.is_desktop_mode:
            self.assertEqual(
                self.session_expiration_time, config.SESSION_EXPIRATION_TIME)
        else:
            self.skipTest(
                'Not recommended to run in {0}'.format(
                    'Server Mode' if config.SERVER_MODE is True
                    else 'Desktop Mode'))
