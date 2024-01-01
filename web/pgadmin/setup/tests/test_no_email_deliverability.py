##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.setup import user_info
import config
from regression.python_test_utils.test_utils import module_patch
from unittest.mock import patch
from pgadmin.utils.constants import ENTER_EMAIL_ADDRESS


class EmailValidationOnSetup(BaseTestGenerator):
    """
    This class tests the non-deliverability of email for invalid email id.
    This test case is only responsible for testing non-deliverability emails
    only.
    """
    PPROMPT_RETURN_VALUE = '1234567'

    scenarios = [
        # scenario for testing invalid email for non-deliverability only
        ('TestCase for email validation', dict(
            data=['postgres@local.dev', 'pg@pgadminrocks.com',
                  'me.pg@demo.dev', 'pg@123.pgcom',
                  'pg@postgres.local', 'postgres@pg.blah'],
            check_deliverability=False,
        )),
    ]

    @patch('builtins.input')
    @patch('os.environ')
    def runTest(self, os_environ_mock, input_mock):

        if config.SERVER_MODE is False:
            self.skipTest(
                "Can not email validation test cases in the DESKTOP mode."
            )

        os_environ_mock.return_value = []
        config.CHECK_EMAIL_DELIVERABILITY = self.check_deliverability

        with module_patch('pgadmin.setup.user_info.pprompt') as pprompt_mock:
            pprompt_mock.return_value \
                = self.PPROMPT_RETURN_VALUE, self.PPROMPT_RETURN_VALUE

            for e in self.data:
                input_mock.return_value = e
                # skipping some setup-db part as we are only testing the
                # mail validation through setup.
                email, password = user_info()

                input_mock.assert_called_once_with(ENTER_EMAIL_ADDRESS)
                # assert equal means deliverability is not done, and entered
                # email id is returned as it is.
                self.assertEqual(e, email)
                input_mock.reset_mock()
