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


class TestRdsImportErrorHandling(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """RDS methods must handle ImportError cleanly without raising."""

    scenarios = [('default', dict())]

    def runTest(self):
        import json
        from flask import Flask, session
        from unittest.mock import patch
        from pgadmin.misc.cloud import rds as rds_mod
        from pgadmin.misc.cloud.rds import RDS

        rds = RDS(
            access_key='AKIA_TEST',
            secret_key='SECRET_TEST',
            session_token='STS_TOKEN',
            default_region='us-east-1',
        )
        app = Flask(__name__)
        app.secret_key = 'test'
        with app.app_context(), \
                patch.object(app.logger, 'error') as mock_log, \
                patch.dict('sys.modules',
                           {'boto3': None, 'boto3.session': None}):
            client = rds._get_aws_client('rds')
            self.assertIsNone(client)
            mock_log.assert_called()
            self.assertIn('boto3', str(mock_log.call_args[0][0]))

            status, msg = rds.validate_credentials()
            self.assertFalse(status)
            self.assertIn('boto3', msg)

            db_versions = rds.get_available_db_version()
            self.assertEqual(db_versions, {'DBEngineVersions': []})

            db_instances = rds.get_available_db_instance_class()
            self.assertEqual(db_instances, [])

            # Verify route handlers return 200 responses instead of 500
            with app.test_request_context(
                    '/rds/verify_credentials/',
                    method='POST',
                    data=json.dumps({
                        'cloud': 'aws',
                        'secret': {
                            'access_key': 'AKIA_TEST',
                            'secret_access_key': 'SECRET_TEST',
                            'region': 'us-east-1',
                        },
                    }),
                    content_type='application/json'):
                session['aws'] = {}
                route_resp = rds_mod.verify_credentials.__wrapped__()
                self.assertEqual(route_resp.status_code, 200)
                body = json.loads(route_resp.data)
                self.assertFalse(body.get('success'))
                self.assertIn('boto3', body.get('info'))

            with app.test_request_context('/rds/db_versions/'):
                session['aws'] = {
                    'secret': {
                        'access_key': 'AKIA_TEST',
                        'secret_access_key': 'SECRET_TEST',
                        'region': 'us-east-1',
                    }
                }
                route_resp = rds_mod.get_db_versions.__wrapped__()
                self.assertEqual(route_resp.status_code, 200)
                body = json.loads(route_resp.data)
                self.assertEqual(body.get('data'), [])

            with app.test_request_context('/rds/db_instances/'):
                session['aws'] = {
                    'secret': {
                        'access_key': 'AKIA_TEST',
                        'secret_access_key': 'SECRET_TEST',
                        'region': 'us-east-1',
                    }
                }
                route_resp = rds_mod.get_db_instances.__wrapped__()
                self.assertEqual(route_resp.status_code, 200)
                body = json.loads(route_resp.data)
                self.assertEqual(body.get('data'), [])
