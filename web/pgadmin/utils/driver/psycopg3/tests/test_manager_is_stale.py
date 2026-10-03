##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for Driver._manager_is_stale, Driver._saved_state_is_stale and
Driver._manager_source.

These are pure attribute-comparison tests, run as plain unittest
TestCases without needing a Postgres server connection.
"""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from sqlalchemy import inspect as sa_inspect

from pgadmin.model import Server, SharedServer
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.driver.psycopg3 import Driver


def make_manager(**overrides):
    fields = dict(
        host='old-host', port=5432, db='postgres', user='old-user',
        service=None, tunnel_host=None,
    )
    fields.update(overrides)
    return SimpleNamespace(**fields)


def make_server_data(**overrides):
    fields = dict(
        host='old-host', port=5432, maintenance_db='postgres',
        username='old-user', service=None, tunnel_host=None,
    )
    fields.update(overrides)
    return SimpleNamespace(**fields)


def make_saved_state(**overrides):
    """Mimics the identity fields ServerManager.as_dict() persists into
    the Flask session ('__pgsql_server_managers') alongside the
    serialized password/connections."""
    fields = dict(
        host='old-host', port=5432, db='postgres', user='old-user',
        service=None, tunnel_host=None,
    )
    fields.update(overrides)
    return fields


class _PureUnitTestSetupMixin:
    """setUp here calls unittest.TestCase.setUp directly, skipping
    BaseTestGenerator.setUp's Postgres connection."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestManagerIsStaleMatchesUnchanged(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A manager whose identity fields still match the current Server
    row is not stale, even if the row was legitimately edited via the
    normal manager.update() flow elsewhere."""

    scenarios = [('default', dict())]

    def runTest(self):
        manager = make_manager()
        server_data = make_server_data()

        self.assertFalse(Driver._manager_is_stale(manager, server_data))


class TestManagerIsStaleDetectsReusedId(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A manager built from a Server row that no longer matches the
    current row for this id (e.g. the id was reused after the
    configuration database was reset) must be treated as stale."""

    scenarios = [('default', dict())]

    def runTest(self):
        manager = make_manager(host='deleted-server.example.com')
        server_data = make_server_data(host='new-server.example.com')

        self.assertTrue(Driver._manager_is_stale(manager, server_data))


class TestManagerIsStaleChecksEachIdentityField(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Any one of host/port/db/user/service/tunnel_host differing is
    enough to mark the manager stale."""

    scenarios = [('default', dict())]

    def runTest(self):
        server_data = make_server_data()

        for field, value in (
            ('port', 5433),
            ('maintenance_db', 'template1'),
            ('username', 'new-user'),
            ('service', 'myservice'),
            ('tunnel_host', 'bastion.example.com'),
        ):
            manager = make_manager()
            changed_server_data = make_server_data(**{field: value})
            self.assertTrue(
                Driver._manager_is_stale(manager, changed_server_data),
                "expected stale manager when %s changes" % field)


class TestSavedStateIsStaleMatchesUnchanged(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Serialized session state whose identity fields still match the
    current Server row is safe to restore onto a freshly built
    manager."""

    scenarios = [('default', dict())]

    def runTest(self):
        saved = make_saved_state()
        server_data = make_server_data()

        self.assertFalse(Driver._saved_state_is_stale(saved, server_data))


class TestSavedStateIsStaleDetectsReusedId(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Serialized state left over from a deleted Server row (e.g. after
    the configuration database was reset/restored without restarting
    pgAdmin) must not be restored onto the row that reused its id."""

    scenarios = [('default', dict())]

    def runTest(self):
        saved = make_saved_state(host='deleted-server.example.com')
        server_data = make_server_data(host='new-server.example.com')

        self.assertTrue(Driver._saved_state_is_stale(saved, server_data))


class TestSavedStateIsStaleMissingFieldsAreStale(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """State serialized before identity fields were added to
    ServerManager.as_dict() (i.e. a dict without host/port/etc. keys)
    cannot be verified, so it must be treated as stale rather than
    trusted blindly."""

    scenarios = [('default', dict())]

    def runTest(self):
        saved = {'sid': 1, 'ver': '18.0', 'sversion': 180000,
                 'connections': {}}
        server_data = make_server_data()

        self.assertTrue(Driver._saved_state_is_stale(saved, server_data))


class TestSavedStateIsStaleChecksEachIdentityField(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Any one of host/port/db/user/service/tunnel_host differing is
    enough to discard the serialized state."""

    scenarios = [('default', dict())]

    def runTest(self):
        server_data = make_server_data()

        for field, value in (
            ('port', 5433),
            ('maintenance_db', 'template1'),
            ('username', 'new-user'),
            ('service', 'myservice'),
            ('tunnel_host', 'bastion.example.com'),
        ):
            saved = make_saved_state()
            changed_server_data = make_server_data(**{field: value})
            self.assertTrue(
                Driver._saved_state_is_stale(saved, changed_server_data),
                "expected stale saved state when %s changes" % field)


class TestManagerIsStaleDetectsDifferentPgAdminUser(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A manager built for one pgAdmin user must not be reused for
    another user who logs in on the same browser session, even when
    every connection field matches (issue #6090: the same servers
    re-imported by a new user after the configuration database was
    reset)."""

    scenarios = [('default', dict())]

    def runTest(self):
        manager = make_manager(pga_user='old-user-uniquifier')
        server_data = make_server_data()

        self.assertTrue(Driver._manager_is_stale(
            manager, server_data, 'new-user-uniquifier'))
        self.assertFalse(Driver._manager_is_stale(
            manager, server_data, 'old-user-uniquifier'))


class TestSavedStateIsStaleDetectsDifferentPgAdminUser(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Serialized state saved by one pgAdmin user must not be restored
    for another user on the same browser session, even when every
    connection field matches."""

    scenarios = [('default', dict())]

    def runTest(self):
        saved = make_saved_state(pga_user='old-user-uniquifier')
        server_data = make_server_data()

        self.assertTrue(Driver._saved_state_is_stale(
            saved, server_data, 'new-user-uniquifier'))
        self.assertFalse(Driver._saved_state_is_stale(
            saved, server_data, 'old-user-uniquifier'))


def make_shared_server_row(**overrides):
    """A transient (never added to the session) shared Server row owned
    by user 1."""
    fields = dict(
        id=7, user_id=1, servergroup_id=1, name='shared',
        host='old-host', port=5432, maintenance_db='postgres',
        username='owner-user', service='owner-service',
        tunnel_host='owner-bastion', shared=True,
    )
    fields.update(overrides)
    return Server(**fields)


class TestManagerSourceUsesSharedServerOverlay(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A non-owner's manager for a shared server is built from their
    SharedServer overlay, so its username/service/tunnel host differ
    from the owner's Server row. The manager source must carry the
    overlay, so such a manager compares as not stale rather than having
    its live connection released on every request, and the owner's row
    must be left untouched."""

    scenarios = [('default', dict())]

    def runTest(self):
        server_data = make_shared_server_row()
        shared_server = SharedServer(
            osid=7, user_id=2, servergroup_id=1, name='mine',
            username='other-user', service=None,
            tunnel_host='other-bastion')
        # The manager as the connect endpoint leaves it for the
        # non-owner, after manager.update() with the overlay.
        manager = make_manager(
            user='other-user', service=None, tunnel_host='other-bastion',
            pga_user='other-uniquifier')

        shared_model = MagicMock()
        shared_model.query.filter_by.return_value.first.return_value = \
            shared_server
        module = 'pgadmin.utils.driver.psycopg3'
        with patch(module + '.config.SERVER_MODE', True), \
                patch(module + '.current_user', SimpleNamespace(id=2)), \
                patch(module + '.SharedServer', shared_model):
            source = Driver._manager_source(server_data)

        shared_model.query.filter_by.assert_called_once_with(
            user_id=2, osid=7)
        self.assertIsNot(source, server_data)
        # Never added to a session, so nothing can flush it.
        self.assertTrue(sa_inspect(source).transient)
        self.assertEqual(source.id, 7)
        self.assertEqual(source.username, 'other-user')
        self.assertIsNone(source.service)
        self.assertEqual(source.tunnel_host, 'other-bastion')
        self.assertFalse(Driver._manager_is_stale(
            manager, source, 'other-uniquifier'))
        self.assertFalse(Driver._saved_state_is_stale(
            make_saved_state(user='other-user', service=None,
                             tunnel_host='other-bastion',
                             pga_user='other-uniquifier'),
            source, 'other-uniquifier'))

        # The owner's row itself is unchanged.
        self.assertEqual(server_data.username, 'owner-user')
        self.assertEqual(server_data.service, 'owner-service')
        self.assertEqual(server_data.tunnel_host, 'owner-bastion')
        self.assertTrue(Driver._manager_is_stale(
            manager, server_data, 'other-uniquifier'))


class TestManagerSourceOwnerUsesServerRow(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """The owner of a shared server, anyone in desktop mode, and a
    non-owner with no SharedServer record yet all get the Server row
    itself."""

    scenarios = [('default', dict())]

    def runTest(self):
        server_data = make_shared_server_row()
        module = 'pgadmin.utils.driver.psycopg3'

        for server_mode, user_id, shared_row in (
                (True, 1, None), (False, 2, None), (True, 2, None)):
            shared_model = MagicMock()
            shared_model.query.filter_by.return_value.first.return_value \
                = shared_row
            with patch(module + '.config.SERVER_MODE', server_mode), \
                    patch(module + '.current_user',
                          SimpleNamespace(id=user_id)), \
                    patch(module + '.SharedServer', shared_model):
                self.assertIs(
                    Driver._manager_source(server_data), server_data)
