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
Driver._connection_identity.

These are pure attribute-comparison tests, run as plain unittest
TestCases without needing a Postgres server connection.
"""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

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


class TestConnectionIdentityUsesSharedServerOverlay(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A non-owner's manager for a shared server is built from their
    SharedServer overlay, so its username/service/tunnel host differ
    from the owner's Server row. It must still compare as not stale,
    otherwise its live connection would be released on every request."""

    scenarios = [('default', dict())]

    def runTest(self):
        server_data = make_server_data(
            id=7, shared=True, user_id=1, username='owner-user',
            service='owner-service', tunnel_host='owner-bastion')
        shared_server = SimpleNamespace(
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
            identity = Driver._connection_identity(server_data)

        shared_model.query.filter_by.assert_called_once_with(
            user_id=2, osid=7)
        self.assertFalse(Driver._manager_is_stale(
            manager, identity, 'other-uniquifier'))
        # Compared against the owner's row, the same manager would be
        # (wrongly) treated as stale.
        self.assertTrue(Driver._manager_is_stale(
            manager, server_data, 'other-uniquifier'))


class TestConnectionIdentityOwnerUsesServerRow(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """The owner of a shared server, or anyone in desktop mode, is
    compared against the Server row itself, with no SharedServer
    lookup."""

    scenarios = [('default', dict())]

    def runTest(self):
        server_data = make_server_data(
            id=7, shared=True, user_id=1, service='owner-service')
        shared_model = MagicMock()
        module = 'pgadmin.utils.driver.psycopg3'

        for server_mode, user_id in ((True, 1), (False, 2)):
            with patch(module + '.config.SERVER_MODE', server_mode), \
                    patch(module + '.current_user',
                          SimpleNamespace(id=user_id)), \
                    patch(module + '.SharedServer', shared_model):
                identity = Driver._connection_identity(server_data)

            self.assertEqual(identity.username, 'old-user')
            self.assertEqual(identity.service, 'owner-service')
            self.assertFalse(Driver._manager_is_stale(
                make_manager(service='owner-service'), identity))

        shared_model.query.filter_by.assert_not_called()
