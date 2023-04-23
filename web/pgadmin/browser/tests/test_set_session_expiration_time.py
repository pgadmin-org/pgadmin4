##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
import config
from unittest.mock import patch

if not config.SERVER_MODE:
    MODE = 'Desktop Mode'
    SESSION_EXP_TIME_CONSTANT = 7
else:
    MODE = 'Server Mode'
    SESSION_EXP_TIME_CONSTANT = 1


class SetSessionExpirationTimeTestCase(BaseTestGenerator):
    """
    This class verifies whether session expire time has been appropriately
    set to desktop & server mode respectively.
    """

    scenarios = [
        (
            'TestCase for verifying session expire time is set to {0} '
            'days for {1}'.format(SESSION_EXP_TIME_CONSTANT, MODE),
            dict(
                session_expiration_time=SESSION_EXP_TIME_CONSTANT
            ))
    ]

    @patch('config.SESSION_EXPIRATION_TIME',
           side_effect=SESSION_EXP_TIME_CONSTANT)
    def runTest(self, mock_session_expiration_time):

        self.assertEqual(
            self.session_expiration_time,
            config.SESSION_EXPIRATION_TIME.side_effect)
