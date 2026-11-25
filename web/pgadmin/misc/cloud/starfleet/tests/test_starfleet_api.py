##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for the pgEdge Starfleet API client."""

import base64
import json
import unittest
from urllib.parse import parse_qsl
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    def setUp(self):
        unittest.TestCase.setUp(self)


class FakeResponse:
    def __init__(self, status, payload):
        self.status = status
        self.data = payload if isinstance(payload, bytes) else \
            json.dumps(payload).encode()


class FakeHttp:
    """Records requests and replays canned responses in order."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def request(self, method, url, body=None, headers=None):
        headers = headers or {}
        if body and headers.get('Content-Type') == \
                'application/x-www-form-urlencoded':
            body = dict(parse_qsl(body))
        elif body:
            body = json.loads(body)
        self.calls.append({'method': method, 'url': url,
                           'body': body or None, 'headers': headers})
        return self.responses.pop(0)


TOKEN = {'access_token': 'tok-1', 'expires_in': 86400,
         'token_type': 'Bearer'}


class TestStarfleetClient(_SkipServerSetUpMixin, BaseTestGenerator):
    scenarios = [('default', dict())]

    def _client(self, responses, **kw):
        from pgacloud.utils.starfleet_api import StarfleetClient
        http = FakeHttp(responses)
        kw.setdefault('client_id', 'test-client-id')
        kw.setdefault('client_secret', 'test-secret')
        return StarfleetClient(http=http, **kw), http

    def runTest(self):
        self._test_token_then_get()
        self._test_error_message_from_api()
        self._test_401_remints_once()
        self._test_expiry_remints()
        self._test_token_only_client()
        self._test_params_encoded()
        self._test_https_required()
        self._test_bad_success_bodies()
        self._test_default_pool_verifies()
        self._test_tenant_header()
        self._test_refresh_remints()
        self._test_token_claims()
        self._test_device_code()
        self._test_device_code_bad_responses()
        self._test_poll_errors()
        self._test_poll_and_refresh_tokens()
        self._test_revoke()

    def _test_default_pool_verifies(self):
        # The default pool must verify, against the bundle it is given;
        # pgAdmin passes config.CA_FILE or certifi's.
        from pgacloud.utils.starfleet_api import StarfleetClient
        pool = StarfleetClient(ca_certs='/path/to/ca.pem')._http
        self.assertEqual(pool.connection_pool_kw['ca_certs'],
                         '/path/to/ca.pem')
        self.assertEqual(pool.connection_pool_kw['cert_reqs'],
                         'CERT_REQUIRED')

    def _test_token_then_get(self):
        client, http = self._client([FakeResponse(200, TOKEN),
                                     FakeResponse(200, [{'region': 'r1'}])])
        self.assertEqual(client.get('/managed/v1/regions'),
                         [{'region': 'r1'}])
        self.assertEqual(http.calls[0]['url'],
                         'https://api.pgedge.com/account/v1/oauth/token')
        self.assertEqual(http.calls[0]['body'], {
            'client_id': 'test-client-id', 'client_secret': 'test-secret',
            'grant_type': 'client_credentials'})
        self.assertEqual(http.calls[1]['headers']['Authorization'],
                         'Bearer tok-1')

    def _test_error_message_from_api(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        client, _ = self._client([
            FakeResponse(200, TOKEN),
            FakeResponse(400, {'code': 400,
                               'message': 'plan does not allow x'})])
        with self.assertRaises(StarfleetError) as ctx:
            client.get('/managed/v1/databases')
        self.assertEqual(ctx.exception.status, 400)
        self.assertEqual(str(ctx.exception), 'plan does not allow x')

    def _test_401_remints_once(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        client, http = self._client([
            FakeResponse(200, TOKEN), FakeResponse(401, {'message': 'exp'}),
            FakeResponse(200, TOKEN), FakeResponse(200, {'ok': 1})])
        self.assertEqual(client.get('/x'), {'ok': 1})
        self.assertEqual(len(http.calls), 4)
        # A second 401 after re-minting is an error, not a loop.
        client, _ = self._client([
            FakeResponse(200, TOKEN), FakeResponse(401, {'message': 'no'}),
            FakeResponse(200, TOKEN), FakeResponse(401, {'message': 'no'})])
        with self.assertRaises(StarfleetError):
            client.get('/x')

    def _test_expiry_remints(self):
        client, http = self._client([FakeResponse(200, TOKEN),
                                     FakeResponse(200, {'a': 1}),
                                     FakeResponse(200, TOKEN),
                                     FakeResponse(200, {'a': 2})])
        with patch('pgacloud.utils.starfleet_api.time.time',
                   return_value=1000.0):
            client.get('/x')
        with patch('pgacloud.utils.starfleet_api.time.time',
                   return_value=1000.0 + 86400 - 30):
            self.assertEqual(client.get('/x'), {'a': 2})
        self.assertEqual(len(http.calls), 4)

    def _test_token_only_client(self):
        from pgacloud.utils.starfleet_api import StarfleetClient, \
            StarfleetError
        http = FakeHttp([FakeResponse(200, {'a': 1})])
        client = StarfleetClient(token='sess-tok', expires_at=None,
                                 http=http)
        self.assertEqual(client.get('/x'), {'a': 1})
        self.assertEqual(http.calls[0]['headers']['Authorization'],
                         'Bearer sess-tok')
        http = FakeHttp([FakeResponse(401, {'message': 'expired'})])
        client = StarfleetClient(token='sess-tok', http=http)
        with self.assertRaises(StarfleetError) as ctx:
            client.get('/x')
        self.assertEqual(ctx.exception.status, 401)

    def _test_params_encoded(self):
        client, http = self._client([FakeResponse(200, TOKEN),
                                     FakeResponse(200, {})])
        client.get('/managed/v1/databases/abc', {'user_type': 'admin'})
        self.assertEqual(
            http.calls[1]['url'],
            'https://api.pgedge.com/managed/v1/databases/abc'
            '?user_type=admin')

    def _test_https_required(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        client, http = self._client([], api_url='http://api.example.com')
        with self.assertRaises(StarfleetError):
            client.get('/x')
        # Neither the secret nor a token may leave over plain HTTP.
        self.assertEqual(http.calls, [])

    def _test_bad_success_bodies(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        client, _ = self._client([FakeResponse(200, b'<html>oops</html>')])
        with self.assertRaises(StarfleetError) as ctx:
            client.get_token()
        self.assertEqual(ctx.exception.status, 200)
        for body in (b'', {}, [], {'access_token': None},
                     {'access_token': ''}, {'access_token': 42},
                     {'access_token': 'x', 'expires_in': 'y'}):
            client, _ = self._client([FakeResponse(200, body)])
            with self.assertRaises(StarfleetError):
                client.get_token()
        # An empty success body is still a valid "no content" reply.
        client, _ = self._client([FakeResponse(200, TOKEN),
                                  FakeResponse(204, b'')])
        self.assertIsNone(client.get('/x'))

    def _test_tenant_header(self):
        from pgacloud.utils.starfleet_api import StarfleetClient
        http = FakeHttp([FakeResponse(200, {}), FakeResponse(200, {})])
        StarfleetClient(token='t', http=http, tenant_id='ten-2').get('/x')
        StarfleetClient(token='t', http=http).get('/x')
        self.assertEqual(
            http.calls[0]['headers']['X-pgEdge-Selected-Tenant'], 'ten-2')
        self.assertNotIn('X-pgEdge-Selected-Tenant', http.calls[1]['headers'])

    def _test_refresh_remints(self):
        # A user sign-in renews an expiring token with its refresher, and
        # once more on a 401.
        from pgacloud.utils.starfleet_api import StarfleetClient
        tokens = iter(['new-1', 'new-2'])
        http = FakeHttp([FakeResponse(200, {'a': 1}),
                         FakeResponse(401, {}), FakeResponse(200, {'a': 2})])
        client = StarfleetClient(token='old', expires_at=1000.0, http=http,
                                 refresh=lambda: (next(tokens), 600))
        with patch('pgacloud.utils.starfleet_api.time.time',
                   return_value=1000.0):
            self.assertEqual(client.get('/x'), {'a': 1})
            self.assertEqual(client.get('/x'), {'a': 2})
        self.assertEqual(http.calls[0]['headers']['Authorization'],
                         'Bearer new-1')
        self.assertEqual(http.calls[2]['headers']['Authorization'],
                         'Bearer new-2')
        self.assertEqual(client.expires_at, 1600.0)

    def _test_token_claims(self):
        from pgacloud.utils.starfleet_api import token_claims, token_tenants
        self.assertEqual(token_tenants(token_claims(jwt({
            'pgedge_tenant_ids': ['t1', 't2'],
            'pgedge_tenant_id': 't2'}))), (['t1', 't2'], 't2'))
        self.assertEqual(token_tenants(token_claims(jwt({
            'pgedge_tenant_id': 't1'}))), (['t1'], 't1'))
        # A default outside the list falls back to the first tenant.
        self.assertEqual(token_tenants(token_claims(jwt({
            'pgedge_tenant_ids': ['t1'], 'pgedge_tenant_id': 'tx'}))),
            (['t1'], 't1'))
        for bad in (None, '', 'opaque', 'a.!!!.c', jwt(['x'])):
            self.assertEqual(token_claims(bad), {})
        self.assertEqual(token_tenants({}), ([], None))

    def _auth0(self, responses):
        from pgacloud.utils.starfleet_api import Auth0Client
        http = FakeHttp(responses)
        return Auth0Client('auth.example.com', 'app-id',
                           'https://api.example.com', http=http), http

    def _test_device_code(self):
        auth0, http = self._auth0([FakeResponse(200, DEVICE_CODE)])
        code = auth0.request_device_code()
        self.assertEqual(code, {
            'device_code': 'dev-1', 'user_code': 'ABCD-EFGH',
            'verification_uri': 'https://auth.example.com/activate',
            'verification_uri_complete':
                'https://auth.example.com/activate?user_code=ABCD-EFGH',
            'expires_in': 900, 'interval': 5})
        self.assertEqual(http.calls[0]['url'],
                         'https://auth.example.com/oauth/device/code')
        self.assertEqual(http.calls[0]['body'], {
            'client_id': 'app-id', 'audience': 'https://api.example.com',
            'scope': 'openid profile email offline_access'})

        # A completion URL that is not an https page is dropped.
        auth0, _ = self._auth0([FakeResponse(200, dict(
            DEVICE_CODE, verification_uri_complete='javascript:alert(1)'))])
        self.assertIsNone(
            auth0.request_device_code()['verification_uri_complete'])

    def _test_device_code_bad_responses(self):
        from pgacloud.utils.starfleet_api import StarfleetError, Auth0Error
        for body in ({}, dict(DEVICE_CODE, user_code=''),
                     dict(DEVICE_CODE, interval='x'),
                     dict(DEVICE_CODE, verification_uri='http://x.example/')):
            auth0, _ = self._auth0([FakeResponse(200, body)])
            with self.assertRaises(StarfleetError):
                auth0.request_device_code()
        auth0, _ = self._auth0([FakeResponse(403, {
            'error': 'unauthorized_client',
            'error_description': 'Grant type not allowed'})])
        with self.assertRaises(Auth0Error) as ctx:
            auth0.request_device_code()
        self.assertEqual(ctx.exception.code, 'unauthorized_client')
        self.assertEqual(str(ctx.exception), 'Grant type not allowed')

    def _test_poll_errors(self):
        from pgacloud.utils.starfleet_api import StarfleetError, Auth0Error
        for code in ('authorization_pending', 'slow_down', 'expired_token',
                     'access_denied'):
            auth0, http = self._auth0([FakeResponse(403, {'error': code})])
            with self.assertRaises(Auth0Error) as ctx:
                auth0.poll_device_code('dev-1')
            self.assertEqual(ctx.exception.code, code)
        self.assertEqual(http.calls[0]['body'], {
            'grant_type': 'urn:ietf:params:oauth:grant-type:device_code',
            'device_code': 'dev-1', 'client_id': 'app-id'})
        # An error without an OAuth error code is a plain StarfleetError.
        auth0, _ = self._auth0([FakeResponse(502, b'<html>bad</html>')])
        with self.assertRaises(StarfleetError) as ctx:
            auth0.poll_device_code('dev-1')
        self.assertNotIsInstance(ctx.exception, Auth0Error)

    def _test_poll_and_refresh_tokens(self):
        from pgacloud.utils.starfleet_api import StarfleetError
        auth0, http = self._auth0([
            FakeResponse(200, {'access_token': 'a1', 'refresh_token': 'r1',
                               'expires_in': 600}),
            FakeResponse(200, {'access_token': 'a2'}),
            FakeResponse(200, {'refresh_token': 'r3'})])
        self.assertEqual(auth0.poll_device_code('dev-1'), {
            'access_token': 'a1', 'refresh_token': 'r1', 'expires_in': 600})
        self.assertEqual(auth0.refresh('r1'), {
            'access_token': 'a2', 'refresh_token': None,
            'expires_in': 3600})
        self.assertEqual(http.calls[1]['body'], {
            'grant_type': 'refresh_token', 'client_id': 'app-id',
            'refresh_token': 'r1'})
        with self.assertRaises(StarfleetError):
            auth0.refresh('r2')

    def _test_revoke(self):
        auth0, http = self._auth0([FakeResponse(200, b'')])
        auth0.revoke('r1')
        self.assertEqual(http.calls[0]['url'],
                         'https://auth.example.com/oauth/revoke')
        self.assertEqual(http.calls[0]['body'],
                         {'client_id': 'app-id', 'token': 'r1'})


DEVICE_CODE = {
    'device_code': 'dev-1', 'user_code': 'ABCD-EFGH',
    'verification_uri': 'https://auth.example.com/activate',
    'verification_uri_complete':
        'https://auth.example.com/activate?user_code=ABCD-EFGH',
    'expires_in': 900, 'interval': 5}


def jwt(claims):
    """An unsigned JWT carrying claims, for code that only reads them."""
    def part(obj):
        return base64.urlsafe_b64encode(
            json.dumps(obj).encode()).decode().rstrip('=')
    return '{}.{}.sig'.format(part({'alg': 'none'}), part(claims))
