##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for ServerManager.has_live_connection, which decides whether
connecting a server from the Object Explorer may re-read the server
details with ServerManager.update() — that releases every connection,
including those of open Query Tool and View/Edit Data tabs.

Run as plain unittest TestCases without a Postgres server connection.
"""

import unittest
from unittest.mock import MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.driver.psycopg3.server_manager import ServerManager


def make_manager(**connections):
    """A ServerManager with the given connections (conn_id -> connected),
    built without a Server row."""
    manager = ServerManager.__new__(ServerManager)
    manager.connections = {
        conn_id: MagicMock(**{'connected.return_value': connected})
        for conn_id, connected in connections.items()
    }
    return manager


class _PureUnitTestSetupMixin:
    """setUp here calls unittest.TestCase.setUp directly, skipping
    BaseTestGenerator.setUp's Postgres connection."""

    def setUp(self):
        unittest.TestCase.setUp(self)


class TestHasLiveConnectionWithoutConnections(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A manager that never connected has no live connection."""

    scenarios = [('default', dict())]

    def runTest(self):
        self.assertFalse(make_manager().has_live_connection())


class TestHasLiveConnectionAllClosed(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """Connections that are all closed (e.g. after a disconnect) do not
    count."""

    scenarios = [('default', dict())]

    def runTest(self):
        manager = make_manager(**{'DB:postgres': False, 'CONN:42': False})
        self.assertFalse(manager.has_live_connection())


class TestHasLiveConnectionQueryToolOnly(
        _PureUnitTestSetupMixin, BaseTestGenerator):
    """A View/Edit Data tab restored at login opens its own connection
    and the one to its database, while the Object Explorer's maintenance
    database connection is still closed: the manager has a live
    connection, so update() must not run."""

    scenarios = [('default', dict())]

    def runTest(self):
        manager = make_manager(**{
            'DB:postgres': False,       # Object Explorer, not yet connected
            'DB:appdb': True,           # database of the tab
            'CONN:4584253': True,       # the tab's own connection
        })
        self.assertTrue(manager.has_live_connection())
