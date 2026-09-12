##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for Driver._manager_is_stale and Driver._saved_state_is_stale.

These are pure attribute-comparison tests, run as plain unittest
TestCases without needing a Postgres server connection.
"""

import unittest
from types import SimpleNamespace

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
