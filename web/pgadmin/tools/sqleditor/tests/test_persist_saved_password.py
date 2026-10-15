##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for the reconnect-path password persistence added for #10128.

These exercise _persist_saved_password's owner/shared routing and
_password_is_valid's pass/fail behaviour directly, with the DB and psycopg
layers mocked out -- they don't need a live Postgres server connection.
"""

import unittest
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import str_to_bool
import pgadmin.tools.sqleditor as sqleditor
from pgadmin.tools.sqleditor import _persist_saved_password, \
    _password_is_valid, _clear_saved_password


class _NoServerSetupMixin:
    """Skip BaseTestGenerator.setUp's Postgres connection -- these tests
    exercise pure Python logic with mocked collaborators."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestPersistSavedPasswordOwner(_NoServerSetupMixin, BaseTestGenerator):
    """An owned server's rotated password is written to the Server row
    itself."""

    def runTest(self):
        server = MagicMock(shared=False, user_id=1)
        servers_mod = 'pgadmin.browser.server_groups.servers.ServerModule'

        with patch('pgadmin.model.db') as mock_db:
            with patch(servers_mod) as mock_mod:
                _persist_saved_password(server, b'enc-pwd')

                self.assertEqual(server.save_password, 1)
                self.assertEqual(server.password, b'enc-pwd')
                mock_mod.get_shared_server.assert_not_called()
                mock_db.session.commit.assert_called_once()


class TestPersistSavedPasswordSharedNonOwner(
        _NoServerSetupMixin, BaseTestGenerator):
    """A non-owner's rotated password lands on their SharedServer row and
    leaves the owner's Server row untouched."""

    def runTest(self):
        owner_server = MagicMock(shared=True, user_id=1, servergroup_id=7)
        shared_server = MagicMock()
        servers_mod = 'pgadmin.browser.server_groups.servers'

        with patch('pgadmin.model.db') as mock_db:
            with patch(f'{servers_mod}.ServerModule') as mock_mod:
                with patch(f'{servers_mod}.current_user') as mock_user:
                    mock_user.id = 2  # not the owner (user_id=1)
                    mock_mod.get_shared_server.return_value = shared_server

                    _persist_saved_password(owner_server, b'enc-pwd')

                    mock_mod.get_shared_server.assert_called_once_with(
                        owner_server, 7)
                    self.assertEqual(shared_server.save_password, 1)
                    self.assertEqual(shared_server.password, b'enc-pwd')
                    # The owner's own row must never be touched for a
                    # shared connection used by a non-owner.
                    self.assertNotEqual(owner_server.password, b'enc-pwd')
                    mock_db.session.commit.assert_called_once()


class TestPersistSavedPasswordRollsBackOnFailure(
        _NoServerSetupMixin, BaseTestGenerator):

    def runTest(self):
        server = MagicMock(shared=False, user_id=1)

        with patch('pgadmin.model.db') as mock_db, \
                patch('pgadmin.browser.server_groups.servers.ServerModule'):
            mock_db.session.commit.side_effect = Exception('boom')

            with self.assertRaises(Exception):
                _persist_saved_password(server, b'enc-pwd')

            mock_db.session.rollback.assert_called_once()


class TestPasswordIsValid(_NoServerSetupMixin, BaseTestGenerator):

    def runTest(self):
        manager = MagicMock(db='postgres', user='enterprisedb')
        manager.create_connection_string.return_value = 'dsn'

        with self.app.app_context(), \
                patch('psycopg.Connection.connect') as mock_connect:
            mock_connect.return_value = MagicMock()
            self.assertTrue(_password_is_valid(manager, 'correct-horse'))

            import psycopg
            mock_connect.side_effect = psycopg.OperationalError(
                'auth failed')
            self.assertFalse(_password_is_valid(manager, 'wrong'))


class TestStrToBool(_NoServerSetupMixin, BaseTestGenerator):
    """save_password may arrive as a real bool, an int, or one of several
    string spellings depending on the client (JSON body vs FormData)."""

    def runTest(self):
        for truthy in (True, 1, '1', 'true', 'True', 'on', 'yes'):
            self.assertTrue(str_to_bool(truthy), msg=repr(truthy))
        for falsy in (False, 0, '0', 'false', 'False', '', None):
            self.assertFalse(str_to_bool(falsy), msg=repr(falsy))


class TestClearSavedPasswordOwner(_NoServerSetupMixin, BaseTestGenerator):
    """An explicit opt-out clears the owned Server row's saved password."""

    def runTest(self):
        server = MagicMock(shared=False, user_id=1, save_password=1,
                           password=b'old')

        with patch('pgadmin.model.db') as mock_db, \
                patch('pgadmin.browser.server_groups.servers.ServerModule'):
            _clear_saved_password(server)

            self.assertEqual(server.save_password, 0)
            self.assertIsNone(server.password)
            mock_db.session.commit.assert_called_once()


class TestClearSavedPasswordSharedNonOwner(
        _NoServerSetupMixin, BaseTestGenerator):
    """A non-owner's opt-out clears their SharedServer row and leaves the
    owner's Server row untouched."""

    def runTest(self):
        owner_server = MagicMock(shared=True, user_id=1, servergroup_id=7,
                                 save_password=1, password=b'owner-enc')
        shared_server = MagicMock(save_password=1, password=b'shared-enc')
        servers_mod = 'pgadmin.browser.server_groups.servers'

        with patch('pgadmin.model.db') as mock_db:
            with patch(f'{servers_mod}.ServerModule') as mock_mod:
                with patch(f'{servers_mod}.current_user') as mock_user:
                    mock_user.id = 2
                    mock_mod.get_shared_server.return_value = shared_server

                    _clear_saved_password(owner_server)

                    self.assertEqual(shared_server.save_password, 0)
                    self.assertIsNone(shared_server.password)
                    self.assertEqual(owner_server.save_password, 1)
                    self.assertEqual(owner_server.password, b'owner-enc')
                    mock_db.session.commit.assert_called_once()


class TestCachePasswordSaveFlagHandling(
        _NoServerSetupMixin, BaseTestGenerator):
    """save_password=false clears a saved password, save_password=true
    persists the new one, and a request that omits the field must leave a
    saved password alone."""

    scenarios = [
        ('Explicit false clears the saved password', dict(
            form={'password': 'pw', 'save_password': 'false'},
            expect_persist=False, expect_clear=True)),
        ('Explicit true persists the password', dict(
            form={'password': 'pw', 'save_password': 'true'},
            expect_persist=True, expect_clear=False)),
        ('Missing field leaves the saved password alone', dict(
            form={'password': 'pw'},
            expect_persist=False, expect_clear=False)),
    ]

    def runTest(self):
        manager = MagicMock()
        server = MagicMock()
        mock_request = MagicMock()
        mock_request.form = self.form

        with patch.object(sqleditor, 'request', mock_request), \
                patch.object(sqleditor, 'current_app', MagicMock()), \
                patch.object(sqleditor, 'ALLOW_SAVE_PASSWORD', True), \
                patch.object(sqleditor, 'get_crypt_key',
                             return_value=(True, 'key')), \
                patch.object(sqleditor, '_password_is_valid',
                             return_value=True), \
                patch.object(sqleditor,
                             '_persist_saved_password') as persist, \
                patch.object(sqleditor,
                             '_clear_saved_password') as clear:
            sqleditor._cache_manager_password_from_request(manager, server)

        self.assertEqual(persist.called, self.expect_persist)
        self.assertEqual(clear.called, self.expect_clear)
