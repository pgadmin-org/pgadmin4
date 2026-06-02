##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the Azure cloud module's session-state refactor.

After the refactor, the live `Azure` class instance is no longer persisted
into `flask.session`. Instead a dict-shaped state is stored under
`session['azure']['state']` and rebuilt via `Azure.from_state` per request.

The Azure SDK's stateful credentials are designed for replay via
`authentication_record_json`, so worker-restart UX should not regress
provided the auth record survives in session.
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

class TestAzureToStateRoundTrip(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """to_state/from_state preserves all persistable Azure fields."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.azure import Azure

        # from_state bypasses __init__ (which needs current_user) — safe in
        # unit tests.
        original = Azure.from_state({
            'tenant_id': 'tenant-uuid',
            'session_token': None,
            'use_interactive_credential': True,
            'authentication_record_json':
                '{"authority":"login.microsoftonline.com"}',
            'region': 'westus',
            'subscription_id': 'sub-uuid',
            'availability_zone': '1',
            'available_capabilities_list': [{'zone': '1'}],
            'azure_cache_name': 'alice42_msal.cache',
            'azure_cache_location': '/var/lib/pgadmin/azurecache/',
        })

        state = original.to_state()
        rebuilt = Azure.from_state(state)

        self.assertEqual(rebuilt._tenant_id, 'tenant-uuid')
        self.assertEqual(rebuilt._region, 'westus')
        self.assertEqual(rebuilt.subscription_id, 'sub-uuid')
        self.assertEqual(rebuilt._availability_zone, '1')
        self.assertEqual(
            rebuilt._available_capabilities_list, [{'zone': '1'}])
        self.assertEqual(rebuilt.azure_cache_name, 'alice42_msal.cache')
        self.assertTrue(rebuilt._use_interactive_credential)
        self.assertEqual(
            rebuilt.authentication_record_json,
            '{"authority":"login.microsoftonline.com"}')


class TestGetAzureFromSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper builds an Azure instance from session['azure']['state']."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.azure import (
            _get_azure_from_session, Azure)

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            session['azure'] = {
                'state': {
                    'tenant_id': 't',
                    'authentication_record_json': '{}',
                    'use_interactive_credential': True,
                }
            }
            obj = _get_azure_from_session()
        self.assertIsInstance(obj, Azure)
        self.assertEqual(obj._tenant_id, 't')


class TestFromStateClearsLiveSdkObjects(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """from_state must NOT pre-populate _credentials, _cli_credentials, or
    _clients — those are SDK objects that should be lazily reconstructed
    from authentication_record_json on first use.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.azure import Azure

        obj = Azure.from_state({
            'tenant_id': 't',
            'authentication_record_json': '{"x":1}',
            'use_interactive_credential': True,
        })
        # Live objects must be empty/None — they are rebuilt lazily so the
        # session never holds an unserializable class instance.
        self.assertEqual(obj._clients, {})
        self.assertIsNone(obj._credentials)
        self.assertIsNone(obj._cli_credentials)


# ---------------------------------------------------------------------------
# Negative tests
# ---------------------------------------------------------------------------

class TestGetAzureFromSessionReturnsNoneWhenMissing(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper returns None when no Azure state in session."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.azure import _get_azure_from_session

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            self.assertIsNone(_get_azure_from_session())
            session['azure'] = {}
            self.assertIsNone(_get_azure_from_session())


class TestFromStateUsesDefaultsForMissingFields(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """from_state uses sensible defaults so callers can incrementally
    populate state during the auth flow."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.azure import Azure

        obj = Azure.from_state({'tenant_id': 't'})
        self.assertEqual(obj._tenant_id, 't')
        self.assertIsNone(obj._session_token)
        self.assertIsNone(obj.subscription_id)
        self.assertEqual(obj._available_capabilities_list, [])
        self.assertIsNone(obj.authentication_record_json)


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

class TestNoLiveObjectsInAzureSessionPaths(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """The cloud.azure source must not assign an `Azure` instance directly
    to a session dict — only a state dict (via _save_azure_to_session)."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.azure as azure_mod
        import inspect
        src = inspect.getsource(azure_mod)
        # The old pattern was: session['azure']['azure_obj'] = azure
        # (or = Azure(...)) — both must be gone.
        self.assertNotIn(
            "session['azure']['azure_obj']", src,
            "cloud.azure must not write a live class instance into session"
            " under 'azure_obj'")


class TestUnsafeDeserializerEliminatedFromAzureModule(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """cloud.azure must not import or call the unsafe deserializer."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.azure as azure_mod
        import inspect
        import re
        src = inspect.getsource(azure_mod)
        forbidden = 'p' + 'i' + 'c' + 'k' + 'l' + 'e'
        self.assertIsNone(
            re.search(r'(?m)^\s*(import|from)\s+' + forbidden + r'\b', src),
            "cloud.azure must not import the unsafe deserializer")
        self.assertNotIn(forbidden + '.dumps(', src)
        self.assertNotIn(forbidden + '.loads(', src)
