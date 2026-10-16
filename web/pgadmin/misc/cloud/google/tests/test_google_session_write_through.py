##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Check that the Google module writes its session state through to the
session store (#10527).

The tests use pgAdmin's ManagedSession, which does not notice changes to
nested dicts and is only saved to disk within the write delay if
force_write is set.
"""

import json
import unittest
from unittest.mock import MagicMock, patch

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


def _mock_google_class():
    """A stand-in for the Google class whose instances need no SDK."""
    instance = MagicMock()
    instance.callback.return_value = 'done'
    instance.verification_ack.return_value = (True, None)
    instance.to_state.return_value = {'verified': True}
    google_cls = MagicMock(return_value=instance)
    google_cls.from_state.return_value = instance
    return google_cls


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection; pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestGoogleCallbackWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """The OAuth callback and the acknowledgement poll update an existing
    session['google'] dict; both must be written through."""

    scenarios = [
        ('callback', dict(route='callback')),
        ('verification_ack', dict(route='verification_ack')),
    ]

    def runTest(self):
        import pgadmin.misc.cloud.google as google_mod

        app = _make_app()
        with app.test_request_context('/google/' + self.route), \
                patch.object(google_mod, 'Google', _mock_google_class()):
            session['google'] = {'state': {'verified': False}}
            _reset_flags()

            getattr(google_mod, self.route).__wrapped__()

            self.assertEqual(session['google']['state'], {'verified': True})
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)


class TestGoogleVerifyMissingSecretWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Dropping the Google state when the client secret file is missing
    is written through."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.google as google_mod

        app = _make_app()
        data = {'secret': {'client_secret_file': 'missing.json'}}
        with app.test_request_context(
                '/google/verify_credentials/', method='POST',
                data=json.dumps(data), content_type='application/json'), \
                patch.object(google_mod, 'filename_with_file_manager_path',
                             return_value='/nonexistent/missing.json'):
            session['google'] = {'state': {}}
            _reset_flags()

            google_mod.verify_credentials.__wrapped__()

            self.assertNotIn('google', session)
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)


class TestClearGoogleSessionWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Clearing Google state is written through."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.google import clear_google_session

        app = _make_app()
        with app.test_request_context():
            session['google'] = {'state': {}}
            _reset_flags()

            clear_google_session()

            self.assertNotIn('google', session)
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)

        with app.test_request_context():
            clear_google_session()
            self.assertFalse(session.force_write)
