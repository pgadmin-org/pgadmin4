##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression tests for User model lockout enforcement.

Flask-Security's default `/login` view (registered by `security.init_app`)
calls `User.is_active` and `User.is_locked()` during form validation.
Without these overrides on pgAdmin's User model, an account that has been
locked via repeated failed attempts at `/authenticate/login` could still
obtain a session by posting valid credentials directly to `/login`.
"""

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.model import User


class TestLockedUser(BaseTestGenerator):
    """Verifies the contract `flask_security.forms.LoginForm.validate()`
    relies on:

      - `is_active` -> False when the account is deactivated OR locked
        (Flask-Login's `login_user()` then refuses the session).
      - `is_locked(errors)` -> False when locked, True otherwise; populates
        the supplied error list when locked so the form surfaces a message.
    """

    # Pure model-contract test - no Postgres server interaction needed.
    # Skip BaseTestGenerator.setUp's connect_server() which would otherwise
    # make this test depend on a healthy local PG.
    def setUp(self):
        pass

    scenarios = [
        ('active and not locked: login allowed',
         dict(active=True, locked=False,
              expect_is_active=True, expect_is_locked=True)),
        ('active and locked: login blocked',
         dict(active=True, locked=True,
              expect_is_active=False, expect_is_locked=False)),
        ('inactive and not locked: login blocked',
         dict(active=False, locked=False,
              expect_is_active=False, expect_is_locked=True)),
        ('inactive and locked: login blocked',
         dict(active=False, locked=True,
              expect_is_active=False, expect_is_locked=False)),
    ]

    def runTest(self):
        user = User()
        user.active = self.active
        user.locked = self.locked

        self.assertEqual(
            user.is_active, self.expect_is_active,
            "is_active expected {0} for active={1}, locked={2}".format(
                self.expect_is_active, self.active, self.locked))

        form_errors = []
        result = user.is_locked(form_errors)
        self.assertEqual(
            result, self.expect_is_locked,
            "is_locked() expected {0} for locked={1}".format(
                self.expect_is_locked, self.locked))

        if self.locked:
            self.assertTrue(
                form_errors,
                "is_locked() must populate form_error when account is "
                "locked so the login form can surface the message")
        else:
            self.assertFalse(
                form_errors,
                "is_locked() must not append errors when account is not "
                "locked")
