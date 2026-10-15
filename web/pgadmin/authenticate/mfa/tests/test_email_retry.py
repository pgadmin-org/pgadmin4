##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
from unittest.mock import patch

from .utils import setup_mfa_app
from pgadmin.authenticate.mfa.email import EmailAuthentication, \
    MAX_EMAIL_CODE_ATTEMPTS
from pgadmin.authenticate.mfa.utils import ValidationException


__MFA_PACKAGE = '.'.join((__package__.split('.'))[:-1])
_CODE = '123456'
_EMAIL = 'jane.doe@example.com'


def _run_with_email_session(test, session, fn):
    # The dummy app does not initialise Flask-Babel, so bypass gettext.
    with test.app.test_request_context():
        with patch(__MFA_PACKAGE + ".email.session", new=session), \
                patch(__MFA_PACKAGE + ".email._", new=lambda s: s), \
                patch(__MFA_PACKAGE + ".email.fetch_auth_option",
                      return_value=(_EMAIL, True)):
            return fn(EmailAuthentication())


def check_email_code_can_be_retried(test):
    """An invalid email code must not discard the code already sent, so the
    user can enter the correct one without requesting a new email."""
    session = {'mfa_email_code': _CODE}

    def _fn(auth):
        with test.assertRaises(ValidationException):
            auth.validate(code='000000')

        view = auth.validation_view()
        test.assertIn('sent_message', view)
        test.assertEqual(session.get('mfa_email_code'), _CODE)

        # The correct code is still accepted on the next attempt.
        auth.validate(code=_CODE)
        test.assertNotIn('mfa_email_code', session)
        test.assertNotIn('mfa_email_code_attempts', session)

    _run_with_email_session(test, session, _fn)


def check_email_code_discarded_on_fresh_view(test):
    """Loading the validation page without a failed attempt still discards
    any previous code, as before."""
    session = {'mfa_email_code': _CODE}

    def _fn(auth):
        view = auth.validation_view()
        test.assertNotIn('sent_message', view)
        test.assertNotIn('mfa_email_code', session)

    _run_with_email_session(test, session, _fn)


def check_email_code_discarded_after_max_attempts(test):
    """Retries are limited, so the code cannot be brute forced."""
    session = {'mfa_email_code': _CODE}

    def _fn(auth):
        for _ in range(MAX_EMAIL_CODE_ATTEMPTS):
            with test.assertRaises(ValidationException):
                auth.validate(code='000000')
            auth.validation_view()

        test.assertNotIn('mfa_email_code', session)
        test.assertNotIn('mfa_email_code_attempts', session)

        with test.assertRaises(ValidationException):
            auth.validate(code=_CODE)

    _run_with_email_session(test, session, _fn)


email_retry_scenarios = [
    (
        "Email MFA code can be re-entered after an invalid code",
        dict(start=setup_mfa_app, check=check_email_code_can_be_retried),
    ),
    (
        "Email MFA code is discarded when the validation page is reloaded",
        dict(start=setup_mfa_app,
             check=check_email_code_discarded_on_fresh_view),
    ),
    (
        "Email MFA code is discarded after too many invalid attempts",
        dict(start=setup_mfa_app,
             check=check_email_code_discarded_after_max_attempts),
    ),
]
