##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the LOG_AUTHENTICATED_USER wiring in pgadmin/__init__.py.

Covers the two request hooks that emit the X-Remote-User response header
(read by the gunicorn access log, see pkg/docker/gunicorn_config.py):

  * _remember_authenticated_user - stashes the username on flask.g at
    before_request time, because Flask-Login has already cleared
    current_user by the time after_request runs on a logout request.
  * _set_remote_user_header - writes the header (sanitised for the
    latin-1 only header encoding), falls back to the stashed name, and
    strips any incoming/spoofed header when there is no user.
"""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from flask import Flask

from pgadmin import _remember_authenticated_user, _set_remote_user_header
from pgadmin.utils.route import BaseTestGenerator


class _SkipServerSetUpMixin:
    """Bypass BaseTestGenerator's Postgres server setUp - these are pure
    logic/wiring tests that need no live server or HTTP infrastructure."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class _StubResponse:
    """Minimal stand-in for a Flask Response - only .headers is used."""

    def __init__(self, headers=None):
        self.headers = dict(headers or {})


def _make_app(log_authenticated_user=True):
    app = Flask(__name__)
    app.secret_key = 'test'
    app.config['LOG_AUTHENTICATED_USER'] = log_authenticated_user
    return app


def _user(username):
    return SimpleNamespace(is_authenticated=True, username=username)


ANONYMOUS = SimpleNamespace(is_authenticated=False, username=None)


class TestHeaderSetForAuthenticatedUser(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """A normal authenticated request gets X-Remote-User."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        response = _StubResponse()
        with app.test_request_context():
            with patch('pgadmin.current_user', _user('alice')):
                _remember_authenticated_user()
                _set_remote_user_header(response)

        self.assertEqual(response.headers['X-Remote-User'], 'alice')


class TestHeaderSurvivesLogout(_SkipServerSetUpMixin, BaseTestGenerator):
    """On a logout request current_user is already anonymous when
    after_request runs, but the name captured at before_request time must
    still be reported."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        response = _StubResponse()
        with app.test_request_context():
            with patch('pgadmin.current_user', _user('alice')):
                _remember_authenticated_user()
            # Flask-Login cleared current_user in between.
            with patch('pgadmin.current_user', ANONYMOUS):
                _set_remote_user_header(response)

        self.assertEqual(response.headers['X-Remote-User'], 'alice')


class TestHeaderDroppedWhenNoUser(_SkipServerSetUpMixin, BaseTestGenerator):
    """With no user at all, any pre-existing (potentially spoofed) header
    is removed rather than passed through."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        response = _StubResponse({'X-Remote-User': 'spoofed'})
        with app.test_request_context():
            with patch('pgadmin.current_user', ANONYMOUS):
                _remember_authenticated_user()
                _set_remote_user_header(response)

        self.assertNotIn('X-Remote-User', response.headers)


class TestHeaderNotSetWhenDisabled(_SkipServerSetUpMixin, BaseTestGenerator):
    """LOG_AUTHENTICATED_USER = False (the default) emits nothing."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app(log_authenticated_user=False)
        response = _StubResponse()
        with app.test_request_context():
            with patch('pgadmin.current_user', _user('alice')):
                _remember_authenticated_user()
                _set_remote_user_header(response)

        self.assertNotIn('X-Remote-User', response.headers)


class TestUsernameSanitised(_SkipServerSetUpMixin, BaseTestGenerator):
    """Header values are latin-1 only and Werkzeug rejects control
    characters, so names are transliterated and stripped rather than
    blowing up the request."""

    scenarios = [
        ('latin-1 name kept as is', dict(
            username='Jos\u00e9', expected='Jos\u00e9')),
        ('non latin-1 transliterated', dict(
            username='\u65e5\u672c', expected='??')),
        ('CRLF injection stripped', dict(
            username='alice\r\nX-Injected: 1', expected='aliceX-Injected: 1')),
    ]

    def runTest(self):
        app = _make_app()
        response = _StubResponse()
        with app.test_request_context():
            with patch('pgadmin.current_user', _user(self.username)):
                _set_remote_user_header(response)

        self.assertEqual(response.headers['X-Remote-User'], self.expected)
