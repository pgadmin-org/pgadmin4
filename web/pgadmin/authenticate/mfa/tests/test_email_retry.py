##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
import hmac
from unittest.mock import patch

import config
from .utils import setup_mfa_app
from pgadmin.authenticate.mfa import email as email_mfa
from pgadmin.authenticate.mfa.email import EmailAuthentication
from pgadmin.authenticate.mfa.utils import ValidationException


__MFA_PACKAGE = '.'.join((__package__.split('.'))[:-1])
_CODE = '123456'
_EMAIL = 'jane.doe@example.com'
_SID = 'test-session-id'


class _Session(dict):
    """A plain dict with a session id, like a pgAdmin ManagedSession."""
    def __init__(self, sid, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.sid = sid


def _new_email_session():
    """A session to which the code has just been sent."""
    email_mfa._remember_email_code(_SID, _CODE)
    return _Session(_SID, {'mfa_email_code': _CODE})


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
    session = _new_email_session()

    def _fn(auth):
        with test.assertRaises(ValidationException):
            auth.validate(code='000000')

        view = auth.validation_view()
        test.assertIn('sent_message', view)
        test.assertEqual(session.get('mfa_email_code'), _CODE)

        # The correct code is still accepted on the next attempt.
        auth.validate(code=_CODE)
        test.assertNotIn('mfa_email_code', session)
        test.assertNotIn(_SID, email_mfa._email_codes)

    _run_with_email_session(test, session, _fn)


def check_email_code_discarded_on_fresh_view(test):
    """Loading the validation page without a failed attempt still discards
    any previous code, as before."""
    session = _new_email_session()

    def _fn(auth):
        view = auth.validation_view()
        test.assertNotIn('sent_message', view)
        test.assertNotIn('mfa_email_code', session)
        test.assertNotIn(_SID, email_mfa._email_codes)

    _run_with_email_session(test, session, _fn)


def _check_discarded_after(test, max_attempts, allowed):
    """
    With MFA_EMAIL_CODE_MAX_ATTEMPTS set to *max_attempts*, the code must
    survive the first allowed - 1 wrong entries and be discarded on wrong
    entry number *allowed*, so it cannot be brute forced.
    """
    session = _new_email_session()

    def _fn(auth):
        for _ in range(allowed - 1):
            with test.assertRaises(ValidationException):
                auth.validate(code='000000')
            test.assertIn('sent_message', auth.validation_view())
            test.assertEqual(session.get('mfa_email_code'), _CODE)

        with test.assertRaises(ValidationException):
            auth.validate(code='000000')
        test.assertNotIn('sent_message', auth.validation_view())
        test.assertNotIn('mfa_email_code', session)
        test.assertNotIn(_SID, email_mfa._email_codes)

        # The discarded code is no longer accepted.
        with test.assertRaises(ValidationException):
            auth.validate(code=_CODE)

    with patch.object(config, 'MFA_EMAIL_CODE_MAX_ATTEMPTS', max_attempts):
        _run_with_email_session(test, session, _fn)


def check_email_code_discarded_after_max_attempts(test):
    """The default configured limit is applied."""
    _check_discarded_after(
        test, config.MFA_EMAIL_CODE_MAX_ATTEMPTS,
        config.MFA_EMAIL_CODE_MAX_ATTEMPTS
    )


def check_email_code_max_attempts_non_default(test):
    """A non-default MFA_EMAIL_CODE_MAX_ATTEMPTS is read at runtime."""
    _check_discarded_after(test, 2, 2)


def check_email_code_max_attempts_below_one(test):
    """Values below 1 are treated as 1, so retries are never unlimited."""
    _check_discarded_after(test, 0, 1)


def check_email_code_attempts_are_atomic(test):
    """
    Concurrent requests carrying the same session cookie each load their
    own copy of the session, so the attempt limit must not rely on the
    session alone: no more than MFA_EMAIL_CODE_MAX_ATTEMPTS guesses may be
    compared against one emailed code, and the code must be refused once
    the limit is reached, even by a request whose session still holds it.
    """
    import threading
    from werkzeug.local import LocalProxy

    max_attempts = 3
    num_threads = 20
    local = threading.local()
    proxy = LocalProxy(lambda: local.session)
    barrier = threading.Barrier(num_threads)
    compared = []
    compare_digest = hmac.compare_digest

    def _compare_digest(a, b):
        compared.append(1)
        return compare_digest(a, b)

    def _guess(auth):
        local.session = _Session(_SID, {'mfa_email_code': _CODE})
        barrier.wait()
        try:
            auth.validate(code='000000')
        except ValidationException:
            pass

    email_mfa._remember_email_code(_SID, _CODE)

    with patch.object(config, 'MFA_EMAIL_CODE_MAX_ATTEMPTS', max_attempts), \
            patch(__MFA_PACKAGE + ".email.session", new=proxy), \
            patch(__MFA_PACKAGE + ".email._", new=lambda s: s), \
            patch(__MFA_PACKAGE + ".email.hmac.compare_digest",
                  new=_compare_digest):
        auth = EmailAuthentication()
        threads = [
            threading.Thread(target=_guess, args=(auth,))
            for _ in range(num_threads)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        test.assertLessEqual(len(compared), max_attempts)

        # A later request whose session snapshot still holds the code must
        # be refused, even with the correct code.
        local.session = _Session(_SID, {'mfa_email_code': _CODE})
        with test.assertRaises(ValidationException):
            auth.validate(code=_CODE)


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
    (
        "Email MFA code honours a non-default MFA_EMAIL_CODE_MAX_ATTEMPTS",
        dict(start=setup_mfa_app,
             check=check_email_code_max_attempts_non_default),
    ),
    (
        "Email MFA code limit below 1 is treated as 1",
        dict(start=setup_mfa_app,
             check=check_email_code_max_attempts_below_one),
    ),
    (
        "Email MFA code attempt limit holds for concurrent requests",
        dict(start=setup_mfa_app,
             check=check_email_code_attempts_are_atomic),
    ),
]
