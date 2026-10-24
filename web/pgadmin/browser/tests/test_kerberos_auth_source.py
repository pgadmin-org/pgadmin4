##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify, through the login endpoint, that a Kerberos login is logged in
to the account of the authenticated principal only.

With internal authentication listed before Kerberos, Flask-Security's
validation sets form.user to the account whose email was typed in the form,
although its password does not match. A Kerberos user who types another
Kerberos user's principal must still be logged in as themselves.

The Kerberos ticket check is stubbed out, so neither GSSAPI nor the
Kerberos blueprint is needed.
"""

from unittest.mock import MagicMock, patch

import config as app_config
from pgAdmin4 import app
from pgadmin.authenticate.registry import AuthSourceRegistry
from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL, KERBEROS
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.python_test_utils.user_utils import add_user

AUTHENTICATED = 'krb-e2e-authenticated@EXAMPLE.COM'
TYPED = 'krb-e2e-typed@EXAMPLE.COM'


class KerberosLoginAuthSourceTestCase(BaseTestGenerator):
    """The account logged in is the authenticated principal's."""

    scenarios = [
        ('Kerberos user types another Kerberos user\'s principal',
         dict(auth_source=[INTERNAL, KERBEROS])),
    ]

    @classmethod
    def setUpClass(cls):
        cls.tester.logout()

    def setUp(self):
        if not app_config.SERVER_MODE:
            self.skipTest('Kerberos authentication needs server mode.')

        # Make sure the Kerberos source is registered.
        import pgadmin.authenticate.kerberos  # noqa: F401

        self.addCleanup(setattr, app_config, 'AUTHENTICATION_SOURCES',
                        app_config.AUTHENTICATION_SOURCES)
        app_config.AUTHENTICATION_SOURCES = self.auth_source

        self.authenticated_uid = add_user(self, AUTHENTICATED, KERBEROS)
        add_user(self, TYPED, KERBEROS, role_name='Administrator')

    def runTest(self):
        source = AuthSourceRegistry._registry[KERBEROS]
        context = MagicMock(initiator_name=AUTHENTICATED)

        # authenticate() reads KERBEROS_AUTH_AVAILABLE from its own module,
        # which may have been re-imported since this module was loaded.
        with patch.dict(source.authenticate.__globals__,
                        {'KERBEROS_AUTH_AVAILABLE': True}), \
                patch.object(source, 'negotiate_start',
                             return_value=[True, context]):
            self.tester.login(TYPED, 'any-password', True,
                              headers={'Authorization': 'Negotiate CTOKEN'})

        with self.app.app_context():
            expected = db.session.get(User, self.authenticated_uid)
            expected_id = expected.get_id()
        with self.tester.session_transaction() as sess:
            self.assertEqual(sess.get('_user_id'), expected_id)

    def tearDown(self):
        self.tester.logout()

    @classmethod
    def tearDownClass(cls):
        cls.tester.logout()
        app_config.AUTHENTICATION_SOURCES = [INTERNAL]
        app_config.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL
        app.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL
        utils.login_tester_account(cls.tester)
