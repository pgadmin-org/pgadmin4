##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.validation_utils import validate_email
from unittest.mock import patch
import config


class TestEmailValidate(BaseTestGenerator):
    """ This class will test the email validation utility with or without email
    deliverability. """

    scenarios = [
        ('Email validation (no deliverability)',
         dict(
             data=dict(
                 # Modern email-validator library rejects special-use
                 # TLDs (.local, .localhost, .invalid, .test) per
                 # RFC 6761/6762. Drop those from the syntax-valid list.
                 email_list=['postgres@local.dev', 'pg@pgadminrocks.com',
                             'me.pg@demo.dev', 'pg@123.pgcom',
                             'postgres@pg.blah',
                             'john@doe.com', 'punster@tr.co',
                             'admin@example.com'],
                 check_deliverability=False,
                 expected_data=dict(
                     test_result=True
                 )
             )
         )),
        ('Email validation (with deliverability)',
         dict(
             data=dict(
                 # Use RFC 6761 special-use domains that are guaranteed
                 # undeliverable, regardless of the DNS state of the
                 # test host. (Some `.dev` domains now have real MX
                 # records, making the previous test data flaky.)
                 email_list=['admin@example.invalid',
                             'pg@nonexistent.invalid',
                             'admin@nonexistent.test'],
                 check_deliverability=True,
                 expected_data=dict(
                     test_result=False
                 )
             )
         )),
        ('Empty email validation (no deliverability)',
         dict(
             data=dict(
                 email_list=[''],
                 check_deliverability=False,
                 expected_data=dict(
                     test_result=False
                 )
             )
         )),
        ('Empty email validation (with deliverability)',
         dict(
             data=dict(
                 email_list=[''],
                 check_deliverability=True,
                 expected_data=dict(
                     test_result=False
                 )
             )
         ))
    ]

    def runTest(self):

        if config.SERVER_MODE is False:
            self.skipTest(
                "Can not run email validation test cases in the DESKTOP mode."
            )
        config.CHECK_EMAIL_DELIVERABILITY = self.data['check_deliverability']

        for e in self.data['email_list']:
            result = validate_email(e)
            # validate_email returns True if email is valid,
            # even if non-deliverable. False if email is not valid or
            # deliverability is turned ON.
            self.assertEqual(result,
                             self.data['expected_data']['test_result'])
