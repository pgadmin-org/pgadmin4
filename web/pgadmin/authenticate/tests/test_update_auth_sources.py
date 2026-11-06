##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify which auth sources a login POST tries.

A typed password is checked by internal or LDAP authentication only:
Kerberos must not answer it with a negotiate challenge before a failed
internal login is counted, and Webserver authentication must not log in
the web server's user instead. The OAuth2 button posts the same form, so it
may carry a password too, and must still log in through OAuth2.
"""

from pgadmin.authenticate import AuthSourceManager
from pgadmin.utils.constants import INTERNAL, KERBEROS, LDAP, OAUTH2, \
    WEBSERVER
from pgadmin.utils.route import BaseTestGenerator

ALL_SOURCES = [INTERNAL, LDAP, KERBEROS, OAUTH2, WEBSERVER]


class UpdateAuthSourcesTestCase(BaseTestGenerator):
    """AuthSourceManager keeps the sources the login form selects."""

    scenarios = [
        ('The login button tries internal and LDAP authentication',
         dict(form={'email': 'u@example.com', 'password': 'pw',
                    'internal_button': 'Login'},
              expect=[INTERNAL, LDAP])),
        ('A password without the login button tries internal and LDAP',
         dict(form={'email': 'u@example.com', 'password': 'pw'},
              expect=[INTERNAL, LDAP])),
        ('A POST without a password tries every source',
         dict(form={'email': 'u@example.com'}, expect=ALL_SOURCES)),
        ('A POST with an empty password tries every source',
         dict(form={'email': 'u@example.com', 'password': ''},
              expect=ALL_SOURCES)),
        ('The OAuth2 button tries OAuth2, Kerberos and Webserver',
         dict(form={'oauth2_button': 'github'},
              expect=[KERBEROS, OAUTH2, WEBSERVER])),
        ('The OAuth2 button with a typed password still tries OAuth2',
         dict(form={'email': 'u@example.com', 'password': 'pw',
                    'oauth2_button': 'github'},
              expect=[KERBEROS, OAUTH2, WEBSERVER])),
    ]

    # No database server is needed.
    def setUp(self):
        pass

    def runTest(self):
        with self.app.test_request_context(
                '/authenticate/login', method='POST', data=self.form):
            manager = AuthSourceManager({}, list(ALL_SOURCES))
        self.assertEqual(manager.auth_sources, self.expect)
