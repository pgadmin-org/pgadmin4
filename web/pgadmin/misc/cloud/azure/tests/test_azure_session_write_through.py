##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Check that the Azure module writes its session state through to the
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


def _mock_azure_class():
    """A stand-in for the Azure class whose instances need no SDK."""
    instance = MagicMock()
    instance.validate_azure_credentials.return_value = (True, '')
    instance.to_state.return_value = {'tenant_id': 'tenant'}
    instance.list_regions.return_value = []
    azure_cls = MagicMock(return_value=instance)
    azure_cls.from_state.return_value = instance
    return azure_cls


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection; pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestAzureVerifyCredentialsWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Verified auth state stored in an existing session['azure'] dict
    marks the session modified and forces a write."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.azure as azure_mod

        app = _make_app()
        data = {'secret': {'auth_type': 'azure_cli_credential',
                           'azure_tenant_id': 'tenant'}}
        with app.test_request_context(
                '/azure/verify_credentials/', method='POST',
                data=json.dumps(data), content_type='application/json'), \
                patch.object(azure_mod, 'Azure', _mock_azure_class()):
            session['azure'] = {}
            _reset_flags()

            azure_mod.verify_credentials.__wrapped__()

            self.assertEqual(session['azure']['state'],
                             {'tenant_id': 'tenant'})
            self.assertEqual(session['azure']['auth_type'],
                             'azure_cli_credential')
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)


class TestAzureSaveStateWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Routes that update the cached Azure state write it through."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.azure as azure_mod

        app = _make_app()
        with app.test_request_context('/azure/regions/sub'), \
                patch.object(azure_mod, 'Azure', _mock_azure_class()):
            session['azure'] = {'state': {'tenant_id': 'old'}}
            _reset_flags()

            azure_mod.get_azure_regions.__wrapped__('sub')

            self.assertEqual(session['azure']['state'],
                             {'tenant_id': 'tenant'})
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)


class TestAzureAuthCodeWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """The device code shown to the user is written through."""

    scenarios = [('default', dict())]

    def runTest(self):
        from pgadmin.misc.cloud.azure import Azure

        app = _make_app()
        with app.test_request_context():
            session['azure'] = {}
            _reset_flags()

            Azure._azure_interactive_auth_prompt_callback(
                'https://example.com/device', 'ABC123', None)

            self.assertEqual(session['azure']['azure_auth_code']['user_code'],
                             'ABC123')
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)


class TestClearAzureSessionWritesSession(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Clearing Azure state, including a deployment's cache file entry,
    is written through."""

    scenarios = [('default', dict())]

    def runTest(self):
        import pgadmin.misc.cloud.azure as azure_mod

        app = _make_app()
        with app.test_request_context(), \
                patch.object(azure_mod, 'delete_azure_cache'):
            session['azure_cache_files_list'] = {42: 'cache_42'}
            _reset_flags()

            azure_mod.clear_azure_session(42)

            self.assertNotIn(42, session['azure_cache_files_list'])
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)

        with app.test_request_context(), \
                patch.object(azure_mod, 'delete_azure_cache'):
            session['azure'] = {'state': {}}
            _reset_flags()

            azure_mod.clear_azure_session()

            self.assertNotIn('azure', session)
            self.assertTrue(session.modified)
            self.assertTrue(session.force_write)

        with app.test_request_context():
            azure_mod.clear_azure_session()
            self.assertFalse(session.force_write)
