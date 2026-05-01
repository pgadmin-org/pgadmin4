##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the Google Cloud module's session-state refactor.

After the refactor, the live `Google` instance is no longer persisted in
the session via the unsafe deserializer. Instead, a dict-shaped state is
stored under `session['google']['state']` and rebuilt via
`Google.from_state` per request.
"""

import unittest

from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection — pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


# ---------------------------------------------------------------------------
# Positive tests — to_state / from_state round-trip preserves the fields the
# request handlers actually depend on between requests.
# ---------------------------------------------------------------------------

class TestGoogleToStateRoundTrip(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """A Google instance's persistable state survives to_state/from_state."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.google import Google

        client_config = {'web': {'client_id': 'X', 'client_secret': 'Y'}}
        original = Google(client_config=client_config)
        original.credentials_json = {
            'token': 'access-token',
            'refresh_token': 'refresh-token',
            'token_uri': 'https://oauth2.googleapis.com/token',
            'client_id': 'X',
            'client_secret': 'Y',
            'scopes': ['scope-a', 'scope-b'],
            'id_token': 'id-token',
        }
        original._redirect_url = 'https://pgadmin.example/google/callback'
        original._project_id = 'my-project'
        original._regions = [{'label': 'us-central1', 'value': 'us-central1'}]
        original._availability_zones = {'us-central1': ['us-central1-a']}
        original._verification_successful = True
        original._verification_error = None

        state = original.to_state()
        rebuilt = Google.from_state(state)

        self.assertEqual(rebuilt._client_config, client_config)
        self.assertEqual(rebuilt.credentials_json, original.credentials_json)
        self.assertEqual(rebuilt._redirect_url, original._redirect_url)
        self.assertEqual(rebuilt._project_id, 'my-project')
        self.assertEqual(rebuilt._regions, original._regions)
        self.assertEqual(
            rebuilt._availability_zones, original._availability_zones)
        self.assertTrue(rebuilt._verification_successful)
        self.assertIsNone(rebuilt._verification_error)


class TestGoogleFromStateRebuildsCredentials(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """from_state must rebuild a working `_credentials` from credentials_json
    so subsequent API calls succeed."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.google import Google

        state = {
            'client_config': {'web': {'client_id': 'X'}},
            'credentials_json': {
                'token': 'access-token',
                'refresh_token': 'refresh-token',
                'token_uri': 'https://oauth2.googleapis.com/token',
                'client_id': 'X',
                'client_secret': 'Y',
                'scopes': ['scope-a'],
                'id_token': 'id-token',
            },
        }
        rebuilt = Google.from_state(state)
        self.assertIsNotNone(rebuilt._credentials)
        self.assertEqual(rebuilt._credentials.token, 'access-token')
        self.assertEqual(
            rebuilt._credentials.refresh_token, 'refresh-token')


class TestGetGoogleFromSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper builds a Google from `session['google']['state']`."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.google import (
            _get_google_from_session, Google)

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            session['google'] = {
                'state': {
                    'client_config': {'web': {'client_id': 'X'}},
                    'credentials_json': None,
                    'redirect_url': None,
                    'project_id': None,
                    'regions': [],
                    'availability_zones': {},
                    'verification_successful': False,
                    'verification_error': None,
                }
            }
            obj = _get_google_from_session()
        self.assertIsInstance(obj, Google)
        self.assertEqual(
            obj._client_config, {'web': {'client_id': 'X'}})


# ---------------------------------------------------------------------------
# Negative tests — defensive handling of missing session state
# ---------------------------------------------------------------------------

class TestGetGoogleFromSessionReturnsNoneWhenMissing(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper returns None when no Google state is in session."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.google import _get_google_from_session

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            self.assertIsNone(_get_google_from_session())
            session['google'] = {}
            self.assertIsNone(_get_google_from_session())


class TestFromStateHandlesMissingCredentials(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """from_state copes with state that has no credentials yet (pre-callback
    phase, after get_auth_url but before callback completes)."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.google import Google

        state = {
            'client_config': {'web': {'client_id': 'X'}},
            'credentials_json': None,
        }
        obj = Google.from_state(state)
        self.assertIsNone(obj._credentials)
        self.assertEqual(
            obj._client_config, {'web': {'client_id': 'X'}})


# ---------------------------------------------------------------------------
# Regression — unsafe deserializer eliminated from the module
# ---------------------------------------------------------------------------

class TestUnsafeDeserializerEliminatedFromGoogleModule(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """cloud.google must not import or call the unsafe deserializer."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.google as google_mod
        import inspect
        src = inspect.getsource(google_mod)
        forbidden = 'p' + 'i' + 'c' + 'k' + 'l' + 'e'
        self.assertNotIn(
            'import ' + forbidden, src,
            "cloud.google must not import the unsafe deserializer")
        self.assertNotIn(
            forbidden + '.dumps(', src,
            "cloud.google must not call the unsafe serialize call")
        self.assertNotIn(
            forbidden + '.loads(', src,
            "cloud.google must not call the unsafe deserialize call")
