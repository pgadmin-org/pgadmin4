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

WebserverAuthentication is deliberately imported inside each runTest(),
not at module level: test_auth_gating.py (which sorts and therefore runs
before this module) evicts pgadmin.authenticate.webserver from
sys.modules and never restores it, to observe load_modules() re-import
it from scratch. A module-level import here would bind the discarded
module's class, while unittest.mock.patch('pgadmin.authenticate.webserver
.User') resolves through sys.modules and patches the fresh one - the
patch would silently miss and hit a real, unconfigured database.
"""

from unittest.mock import patch

import flask
from werkzeug.middleware.proxy_fix import ProxyFix
import config
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

        ('HTTP_-prefixed WEBSERVER_REMOTE_USER, fully configured, '
         'resolves via the equivalent header',
         dict(remote_user='HTTP_X_FORWARDED_USER', from_header=True,
              trusted_proxies=['127.0.0.1'], shared_secret=None,
              peer='127.0.0.1', secret_header=None,
              expected='header-user', header_name='X-Forwarded-User')),

        ('hyphenated WEBSERVER_REMOTE_USER resolves via header when '
         'opted in',
         dict(remote_user='Remote-user', from_header=True,
              trusted_proxies=['127.0.0.1'], shared_secret=None,
              peer='127.0.0.1', secret_header=None,
              expected='header-user')),

        ('shared secret configured, header absent returns nothing',
         dict(remote_user='REMOTE_USER', from_header=True,
              trusted_proxies=['127.0.0.1'], shared_secret='s3cr3t',
              peer='127.0.0.1', secret_header=None, expected=None)),
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
        from pgadmin.authenticate.webserver import WebserverAuthentication

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
        from pgadmin.authenticate.webserver import WebserverAuthentication

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


class WebserverLoginPositiveTestCase(BaseTestGenerator):
    """login() must still succeed for a matched user whose auth_source
    genuinely is Webserver - the auth_source guard in
    WebserverLoginAuthSourceTestCase must not reject everyone.
    """

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def runTest(self):
        from pgadmin.authenticate.webserver import WebserverAuthentication

        app = flask.Flask(__name__)
        with app.test_request_context('/'):
            auth = WebserverAuthentication()

            class _FakeUser:
                auth_source = WEBSERVER

            with patch(
                    'pgadmin.authenticate.webserver.User') as mock_user, \
                    patch('pgadmin.authenticate.webserver.login_user',
                          return_value=True), \
                    patch.object(auth, 'get_user',
                                 return_value='webserver-user'):
                mock_user.query.filter_by.return_value.first \
                    .return_value = _FakeUser()

                status, message = auth.login(None)

                self.assertTrue(
                    status,
                    "login() must accept a matched user whose auth_source "
                    "is {0}".format(WEBSERVER))
                self.assertIsNone(message)


class WebserverLoginNoMatchingUserTestCase(BaseTestGenerator):
    """login() must fail gracefully (LOGIN_FAILED), not raise, when
    get_user() returns a name with no matching User row.
    """

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def runTest(self):
        from pgadmin.authenticate.webserver import WebserverAuthentication

        app = flask.Flask(__name__)
        with app.test_request_context('/'):
            auth = WebserverAuthentication()

            with patch(
                    'pgadmin.authenticate.webserver.User') as mock_user, \
                    patch.object(auth, 'get_user',
                                 return_value='no-such-user'):
                mock_user.query.filter_by.return_value.first \
                    .return_value = None

                status, message = auth.login(None)

                self.assertFalse(
                    status,
                    "login() must fail when no User row matches the "
                    "asserted identity")
                self.assertEqual(message, auth.messages('LOGIN_FAILED'))


class WebserverProxyFixBypassTestCase(BaseTestGenerator):
    """A spoofed X-Forwarded-For naming a trusted proxy must not grant
    trust for the real, untrusted socket peer. See
    _get_untrusted_peer_addr()'s docstring: request.remote_addr is NOT
    safe to use here, because ProxyFix rewrites it from a client-
    controlled X-Forwarded-For header. Unlike WebserverRemoteUserTrustTest
    Case above, this exercises the real WSGI middleware stack via
    app.test_client(), so ProxyFix actually runs.
    """

    def setUp(self):
        self._orig = dict(
            WEBSERVER_REMOTE_USER=config.WEBSERVER_REMOTE_USER,
            WEBSERVER_REMOTE_USER_FROM_HEADER=getattr(
                config, 'WEBSERVER_REMOTE_USER_FROM_HEADER', False),
            WEBSERVER_TRUSTED_PROXIES=getattr(
                config, 'WEBSERVER_TRUSTED_PROXIES', []),
            WEBSERVER_SHARED_SECRET=getattr(
                config, 'WEBSERVER_SHARED_SECRET', None),
        )

    def tearDown(self):
        for key, value in self._orig.items():
            setattr(config, key, value)

    def runTest(self):
        from pgadmin.authenticate.webserver import WebserverAuthentication

        config.WEBSERVER_REMOTE_USER = 'REMOTE_USER'
        config.WEBSERVER_REMOTE_USER_FROM_HEADER = True
        # The trusted proxy list names the address the attacker will
        # spoof via X-Forwarded-For, not the real, untrusted peer below.
        config.WEBSERVER_TRUSTED_PROXIES = ['10.9.9.9']
        config.WEBSERVER_SHARED_SECRET = None

        app = flask.Flask(__name__)
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)
        result = {}

        @app.route('/')
        def _probe():
            result['username'] = WebserverAuthentication().get_user()
            return ''

        client = app.test_client()
        response = client.get(
            '/',
            headers={
                'REMOTE_USER': 'header-user',
                'X-Forwarded-For': '10.9.9.9',
            },
            environ_overrides={'REMOTE_ADDR': '127.0.0.1'})

        # Flask turns an exception inside the probe into a 500 rather than
        # re-raising it, so without these two assertions a get_user() that
        # blew up would leave result empty and pass this test vacuously.
        self.assertEqual(response.status_code, 200)
        self.assertIn('username', result,
                      "the probe route did not run, so nothing was tested")

        self.assertIsNone(
            result['username'],
            "a spoofed X-Forwarded-For naming a trusted proxy must not "
            "grant trust for the real, untrusted socket peer")


class WebserverAuthenticateMailTestCase(BaseTestGenerator):
    """authenticate()'s _get_trusted_value('mail') call still reads the
    'mail' CGI variable from the environ.
    """

    def setUp(self):
        self._orig_remote_user = config.WEBSERVER_REMOTE_USER

    def tearDown(self):
        config.WEBSERVER_REMOTE_USER = self._orig_remote_user

    def runTest(self):
        from pgadmin.authenticate.webserver import WebserverAuthentication

        config.WEBSERVER_REMOTE_USER = 'REMOTE_USER'
        app = flask.Flask(__name__)
        app.secret_key = 'test-secret-key'
        with app.test_request_context(
                '/', environ_overrides={
                    'REMOTE_USER': 'environ-user',
                    'mail': 'environ-user@example.com',
                }):
            auth = WebserverAuthentication()
            with patch.object(
                    auth, '_WebserverAuthentication__auto_create_user',
                    return_value=(True, None)) as mock_create:
                auth.authenticate(None)
                # The empty email is pre-existing upstream behaviour:
                # authenticate() reads 'mail' but passes '' on to
                # __auto_create_user(). Pinned here as-is - fixing it is
                # out of scope for this security fix.
                mock_create.assert_called_once_with(
                    'environ-user', '')
