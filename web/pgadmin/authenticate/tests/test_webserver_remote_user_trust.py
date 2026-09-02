##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that WebserverAuthentication only trusts an identity asserted via
an inbound HTTP header when the operator has explicitly opted in, and that
it never logs a header-asserted identity into a non-Webserver account.

These are pure request/config-logic tests - no Postgres server or SQLite
database is required, so setUp() below skips
BaseTestGenerator.setUp()'s connect_server().
"""

from unittest.mock import patch

import flask
import config
from pgadmin.authenticate.webserver import WebserverAuthentication
from pgadmin.utils.constants import WEBSERVER, INTERNAL
from pgadmin.utils.route import BaseTestGenerator


class WebserverRemoteUserTrustTestCase(BaseTestGenerator):
    """Checks get_user()'s trusted-environ vs. gated-header split, the
    trusted-proxy allow-list, and the shared-secret check.
    """

    scenarios = [
        ('header present, opt-in off returns nothing',
         dict(remote_user='REMOTE_USER', from_header=False,
              trusted_proxies=['127.0.0.1'], shared_secret=None,
              peer='127.0.0.1', secret_header=None, expected=None)),

        ('header present, opt-in on, peer not allow-listed returns nothing',
         dict(remote_user='REMOTE_USER', from_header=True,
              trusted_proxies=['10.0.0.1'], shared_secret=None,
              peer='127.0.0.1', secret_header=None, expected=None)),

        ('header present, opt-in on, peer allowed, secret mismatch',
         dict(remote_user='REMOTE_USER', from_header=True,
              trusted_proxies=['127.0.0.1'], shared_secret='s3cr3t',
              peer='127.0.0.1', secret_header='wrong', expected=None)),

        ('header present, fully configured returns the header value',
         dict(remote_user='REMOTE_USER', from_header=True,
              trusted_proxies=['127.0.0.1/32'], shared_secret='s3cr3t',
              peer='127.0.0.1', secret_header='s3cr3t',
              expected='header-user')),

        ('bare REMOTE_USER in environ is always trusted',
         dict(remote_user='REMOTE_USER', from_header=False,
              trusted_proxies=[], shared_secret=None,
              peer='127.0.0.1', secret_header=None,
              expected='environ-user', set_environ_remote_user=True)),

        ('HTTP_-prefixed WEBSERVER_REMOTE_USER with opt-in off is rejected',
         dict(remote_user='HTTP_X_FORWARDED_USER', from_header=False,
              trusted_proxies=['127.0.0.1'], shared_secret=None,
              peer='127.0.0.1', secret_header=None, expected=None,
              header_name='X-Forwarded-User')),
    ]

    # Pure logic test - no Postgres server interaction needed.
    def setUp(self):
        self._orig = dict(
            WEBSERVER_REMOTE_USER=config.WEBSERVER_REMOTE_USER,
            WEBSERVER_REMOTE_USER_FROM_HEADER=getattr(
                config, 'WEBSERVER_REMOTE_USER_FROM_HEADER', False),
            WEBSERVER_TRUSTED_PROXIES=getattr(
                config, 'WEBSERVER_TRUSTED_PROXIES', []),
            WEBSERVER_SHARED_SECRET=getattr(
                config, 'WEBSERVER_SHARED_SECRET', None),
            WEBSERVER_SHARED_SECRET_HEADER=getattr(
                config, 'WEBSERVER_SHARED_SECRET_HEADER',
                'X-Pgadmin-Webserver-Secret'),
        )

    def tearDown(self):
        for key, value in self._orig.items():
            setattr(config, key, value)

    def runTest(self):
        config.WEBSERVER_REMOTE_USER = self.remote_user
        config.WEBSERVER_REMOTE_USER_FROM_HEADER = self.from_header
        config.WEBSERVER_TRUSTED_PROXIES = self.trusted_proxies
        config.WEBSERVER_SHARED_SECRET = self.shared_secret

        headers = {}
        # Simulate the client sending a header. request.headers.get(name)
        # is looked up by the literal name pgAdmin is configured to use
        # (config.WEBSERVER_REMOTE_USER), so the header key here matches
        # that name, or the explicit header_name override for the scenario
        # where WEBSERVER_REMOTE_USER is an HTTP_-prefixed CGI-style name
        # (a real client would still send an ordinary hyphenated header).
        if not getattr(self, 'set_environ_remote_user', False):
            header_name = getattr(self, 'header_name', self.remote_user)
            headers[header_name] = 'header-user'
        if self.secret_header is not None:
            headers[config.WEBSERVER_SHARED_SECRET_HEADER] = \
                self.secret_header

        environ_overrides = {'REMOTE_ADDR': self.peer}
        if getattr(self, 'set_environ_remote_user', False):
            environ_overrides['REMOTE_USER'] = 'environ-user'

        app = flask.Flask(__name__)
        with app.test_request_context(
                '/', headers=headers, environ_overrides=environ_overrides):
            auth = WebserverAuthentication()
            username = auth.get_user()

        self.assertEqual(username, self.expected)


class WebserverLoginAuthSourceTestCase(BaseTestGenerator):
    """login() must refuse a matched user whose auth_source is not
    Webserver, even when get_user() returns a name - defense in depth
    against a misconfigured/forged trust gate.
    """

    # Pure logic test - no Postgres server interaction needed.
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def runTest(self):
        app = flask.Flask(__name__)
        with app.test_request_context('/'):
            auth = WebserverAuthentication()

            class _FakeUser:
                auth_source = INTERNAL

            with patch(
                    'pgadmin.authenticate.webserver.User') as mock_user, \
                    patch.object(auth, 'get_user',
                                 return_value='admin@example.com'):
                mock_user.query.filter_by.return_value.first \
                    .return_value = _FakeUser()

                status, message = auth.login(None)

                self.assertFalse(
                    status,
                    "login() must refuse a user whose auth_source is not "
                    "{0}".format(WEBSERVER))
