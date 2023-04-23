##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.user_management import validate_user
from unittest.mock import patch
import config


class TestValidateUser(BaseTestGenerator):
    """ This class will test the user email validation with/without email
    deliverability while validating user. """

    scenarios = [
        ('User email validation (no deliverability)',
         dict(
             data=dict(
                 email='postgres@local.dev',
                 check_deliverability=False,
                 expected_data=dict(
                     test_result='postgres@local.dev'
                 )
             )
         )),
        ('User email validation (with deliverability)',
         dict(
             data=dict(
                 email='postgres@local.dev',
                 check_deliverability=True,
                 expected_data=dict(
                     test_result='Invalid email address.'
                 )
             )
         ))
    ]

    @patch('pgadmin.tools.user_management.validate_password')
    def runTest(self, validate_password_mock):

        if config.SERVER_MODE is False:
            self.skipTest(
                "Can not email validation test cases in the DESKTOP mode."
            )
        config.CHECK_EMAIL_DELIVERABILITY = self.data['check_deliverability']
        ndata = {}

        validate_password_mock.return_value.method.return_value = ''
        try:
            ndata = validate_user(self.data)
        except Exception as e:
            ndata['email'] = str(e.description)

        # assert equal means deliverability is not done, and entered
        # email id is returned as it is.
        self.assertEqual(ndata['email'],
                         self.data['expected_data']['test_result'])
