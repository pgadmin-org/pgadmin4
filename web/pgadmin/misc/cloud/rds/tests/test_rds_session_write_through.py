##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Check that the RDS module writes its session state through to the session
store (#10527).

The tests use pgAdmin's ManagedSession, which does not notice changes to
nested dicts and is only saved to disk within the write delay if
force_write is set.
"""

import json
import unittest
from unittest.mock import patch

from flask import Flask, session
from flask.sessions import SessionInterface

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.session import ManagedSession


class _ManagedSessionInterface(SessionInterface):
    """Give each test request a fresh, unsaved ManagedSession."""

    def open_session(self, app, request):
        return ManagedSession()

    def save_session(self, app, session, response):
        pass


def _make_app():
    app = Flask(__name__)
    app.secret_key = 'test'
    app.session_interface = _ManagedSessionInterface()
    return app


def _reset_flags():
    session.modified = False
    session.force_write = False


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection; pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


_SECRET = {
    'access_key': 'AKIA_TEST',
    'secret_access_key': 'SECRET_TEST',
    'region': 'us-east-1',
}


class TestRdsVerifyCredentialsWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Verified credentials stored in an existing session['aws'] dict
    mark the session modified and force a write."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.rds as rds_mod

        app = _make_app()
        with app.test_request_context(
                '/rds/verify_credentials/', method='POST',
                data=json.dumps({'secret': _SECRET}),
                content_type='application/json'), \
                patch.object(rds_mod.RDS, 'validate_credentials',
                             return_value=(True, {'Account': 'x'})):
            session['aws'] = {}
            _reset_flags()

            rds_mod.verify_credentials.__wrapped__()

            self.assertEqual(session['aws']['secret'], _SECRET)
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)


class TestRdsVerifyCredentialsFailureDoesNotForceWrite(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Failed verification stores nothing, so nothing is forced out."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.rds as rds_mod

        app = _make_app()
        with app.test_request_context(
                '/rds/verify_credentials/', method='POST',
                data=json.dumps({'secret': _SECRET}),
                content_type='application/json'), \
                patch.object(rds_mod.RDS, 'validate_credentials',
                             return_value=(False, 'bad creds')):
            session['aws'] = {}
            _reset_flags()

            rds_mod.verify_credentials.__wrapped__()

            self.assertNotIn('secret', session['aws'])
            self.assertFalse(session.force_write)


class TestClearAwsSessionWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Clearing cached AWS credentials is written through as well."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.rds import clear_aws_session

        app = _make_app()
        with app.test_request_context():
            session['aws'] = {'secret': _SECRET}
            _reset_flags()

            clear_aws_session()

            self.assertNotIn('aws', session)
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)

        with app.test_request_context():
            clear_aws_session()
            self.assertFalse(session.force_write)
