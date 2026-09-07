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
from pgadmin.tools.sqleditor import _persist_saved_password, \
    _password_is_valid


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

        with patch('pgadmin.model.db') as mock_db, \
                patch(
                    'pgadmin.browser.server_groups.servers.ServerModule'
                ) as mock_mod:
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

        with patch('pgadmin.model.db') as mock_db, \
                patch(
                    'pgadmin.browser.server_groups.servers.ServerModule'
                ) as mock_mod, \
                patch(
                    'pgadmin.browser.server_groups.servers.current_user'
                ) as mock_user:
            mock_user.id = 2  # not the owner (user_id=1)
            mock_mod.get_shared_server.return_value = shared_server

            _persist_saved_password(owner_server, b'enc-pwd')

            mock_mod.get_shared_server.assert_called_once_with(
                owner_server, 7)
            self.assertEqual(shared_server.save_password, 1)
            self.assertEqual(shared_server.password, b'enc-pwd')
            # The owner's own row must never be touched for a shared
            # connection used by a non-owner.
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

        with patch('psycopg.Connection.connect') as mock_connect:
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
