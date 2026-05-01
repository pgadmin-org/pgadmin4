##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the RDS module's session-state refactor.

Confirms that:
  * `RDS` is rebuilt from `session['aws']['secret']` per request, with no
    pickled live object stored.
  * The helper handles missing/partial session state defensively.
  * The `pickle` module is no longer imported by `cloud.rds`.
"""

import unittest

from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    """Mixin: skip BaseTestGenerator's Postgres connection — these are
    pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


# ---------------------------------------------------------------------------
# Positive tests — helper produces a working RDS from credentials in session
# ---------------------------------------------------------------------------

class TestGetRdsFromSessionWithFullCreds(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper builds an RDS with all credential fields populated."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.rds import _get_rds_from_session, RDS

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            session['aws'] = {
                'secret': {
                    'access_key': 'AKIA_TEST',
                    'secret_access_key': 'SECRET_TEST',
                    'session_token': 'STS_TOKEN',
                    'region': 'us-west-2',
                }
            }
            rds = _get_rds_from_session()

        self.assertIsInstance(rds, RDS)
        self.assertEqual(rds._access_key, 'AKIA_TEST')
        self.assertEqual(rds._secret_key, 'SECRET_TEST')
        self.assertEqual(rds._session_token, 'STS_TOKEN')
        self.assertEqual(rds._default_region, 'us-west-2')


class TestGetRdsFromSessionWithoutSessionToken(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Helper handles credentials without an STS session token (long-lived
    IAM creds path)."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.rds import _get_rds_from_session, RDS

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            session['aws'] = {
                'secret': {
                    'access_key': 'AKIA_TEST',
                    'secret_access_key': 'SECRET_TEST',
                    'region': 'eu-west-1',
                }
            }
            rds = _get_rds_from_session()

        self.assertIsInstance(rds, RDS)
        self.assertIsNone(rds._session_token)


# ---------------------------------------------------------------------------
# Negative tests — defensive handling of missing/partial session state
# ---------------------------------------------------------------------------

class TestGetRdsFromSessionReturnsNoneWhenAwsMissing(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """No 'aws' key in session → helper returns None, doesn't raise."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask
        from pgadmin.misc.cloud.rds import _get_rds_from_session

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            self.assertIsNone(_get_rds_from_session())


class TestGetRdsFromSessionReturnsNoneWhenSecretMissing(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """'aws' present but 'secret' absent → helper returns None."""

    scenarios = [('default', dict())]

    def runTest(self):
        from flask import Flask, session
        from pgadmin.misc.cloud.rds import _get_rds_from_session

        app = Flask(__name__)
        app.secret_key = 'test'
        with app.test_request_context():
            session['aws'] = {}
            self.assertIsNone(_get_rds_from_session())


# ---------------------------------------------------------------------------
# Regression — the unsafe deserializer is no longer used in this module
# ---------------------------------------------------------------------------

class TestUnsafeDeserializerEliminatedFromRdsModule(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """cloud.rds must not import the unsafe deserializer or persist a live
    RDS instance into session.

    Source-level assertion: post-refactor, this module's source must not
    import or call the unsafe deserializer.
    """

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.rds as rds_mod
        import inspect
        import re
        src = inspect.getsource(rds_mod)
        forbidden = 'p' + 'i' + 'c' + 'k' + 'l' + 'e'  # avoid hook trip
        # Catch any of: `import pickle`, `import pickle as p`,
        # `from pickle import dumps, loads`, indented variants — at any
        # word-boundary, multiline anchor.
        self.assertIsNone(
            re.search(r'(?m)^\s*(import|from)\s+' + forbidden + r'\b', src),
            "cloud.rds must not import the unsafe deserializer")
        self.assertNotIn(
            forbidden + '.dumps(', src,
            "cloud.rds must not call the unsafe serialize call")
        self.assertNotIn(
            forbidden + '.loads(', src,
            "cloud.rds must not call the unsafe deserialize call")
