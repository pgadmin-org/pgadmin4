##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the BigAnimal cloud module's session-state refactor.

After the refactor, the live `BigAnimalProvider` instance is no longer
persisted into the session via the unsafe deserializer. Instead a
dict-shaped state is stored under `session['biganimal']['state']` and
rebuilt via `BigAnimalProvider.from_state` per request.
"""

import unittest

from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection — pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


# ---------------------------------------------------------------------------
# Positive tests
# ---------------------------------------------------------------------------

class TestBigAnimalToStateRoundTrip(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """to_state/from_state preserves all persistable fields."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.biganimal import BigAnimalProvider

        # from_state path: bypasses __init__'s HTTP call, so safe to
        # construct in unit tests without network.
        original = BigAnimalProvider.from_state({
            'provider': {'clientId': 'X', 'issuerUri': 'https://issuer'},
            'device_code': {'device_code': 'D'},
            'token': {'access_token': 'A'},
            'raw_access_token': 'A-raw',
            'access_token': 'A-final',
            'token_error': {'error': None},
            'token_status': 1,
            'regions': [{'label': 'us-east-1'}],
            'project_id': 'proj-42',
        })

        state = original.to_state()
        rebuilt = BigAnimalProvider.from_state(state)

        self.assertEqual(rebuilt.provider, original.provider)
        self.assertEqual(rebuilt.device_code, original.device_code)
        self.assertEqual(rebuilt.token, original.token)
        self.assertEqual(rebuilt.raw_access_token, 'A-raw')
        self.assertEqual(rebuilt.access_token, 'A-final')
        self.assertEqual(rebuilt.token_error, {'error': None})
        self.assertEqual(rebuilt.token_status, 1)
        self.assertEqual(rebuilt.regions, [{'label': 'us-east-1'}])
        self.assertEqual(rebuilt.project_id, 'proj-42')


class TestGetBigAnimalFromSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper builds a BigAnimalProvider from session['biganimal']['state']."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.biganimal import (
            _get_biganimal_from_session, BigAnimalProvider)

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            session['biganimal'] = {
                'state': {
                    'provider': {'clientId': 'X'},
                    'access_token': 'tok',
                }
            }
            obj = _get_biganimal_from_session()
        self.assertIsInstance(obj, BigAnimalProvider)
        self.assertEqual(obj.provider, {'clientId': 'X'})
        self.assertEqual(obj.access_token, 'tok')


# ---------------------------------------------------------------------------
# Negative tests
# ---------------------------------------------------------------------------

class TestGetBigAnimalFromSessionReturnsNoneWhenMissing(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper returns None when no BigAnimal state in session."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.biganimal import (
            _get_biganimal_from_session)

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            self.assertIsNone(_get_biganimal_from_session())
            session['biganimal'] = {}
            self.assertIsNone(_get_biganimal_from_session())


class TestFromStateUsesDefaultsForMissingFields(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """from_state uses sensible defaults for any field not present in
    state — supports incremental session population during the auth flow.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.biganimal import BigAnimalProvider

        obj = BigAnimalProvider.from_state({
            'provider': {'clientId': 'X'},
            # everything else missing
        })
        self.assertEqual(obj.provider, {'clientId': 'X'})
        self.assertEqual(obj.device_code, {})
        self.assertEqual(obj.token, {})
        self.assertIsNone(obj.raw_access_token)
        self.assertIsNone(obj.access_token)
        self.assertEqual(obj.token_error, {})
        self.assertEqual(obj.token_status, -1)
        self.assertEqual(obj.regions, [])
        self.assertIsNone(obj.project_id)


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

class TestUnsafeDeserializerEliminatedFromBigAnimalModule(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """cloud.biganimal must not import or call the unsafe deserializer."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.biganimal as biganimal_mod
        import inspect
        import re
        src = inspect.getsource(biganimal_mod)
        forbidden = 'p' + 'i' + 'c' + 'k' + 'l' + 'e'
        self.assertIsNone(
            re.search(r'(?m)^\s*(import|from)\s+' + forbidden + r'\b', src),
            "cloud.biganimal must not import the unsafe deserializer")
        self.assertNotIn(
            forbidden + '.dumps(', src,
            "cloud.biganimal must not call the unsafe serialize call")
        self.assertNotIn(
            forbidden + '.loads(', src,
            "cloud.biganimal must not call the unsafe deserialize call")
