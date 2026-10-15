##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for the pgEdge Starfleet API client."""

import json
import unittest
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
        self.calls.append({'method': method, 'url': url,
                           'body': json.loads(body) if body else None,
                           'headers': headers or {}})
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
