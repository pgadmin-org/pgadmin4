##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for Schema Diff foreign key dependency extraction."""

from unittest.mock import MagicMock, patch

from pgadmin.browser.server_groups.servers.databases.schemas.tables import (
    TableView,
)
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.foreign_key import utils as fkey_utils
from pgadmin.utils.route import BaseTestGenerator


class TestSchemaDiffFkDependenciesUnit(BaseTestGenerator):
    """Unit tests for get_fkey_dependencies() and
    TableView.get_table_submodules_dependencies()."""

    scenarios = [
        ('get_fkey_dependencies includes referenced table OID',
         dict(test_method='test_fkey_dependencies_include_oid')),
        ('get_fkey_dependencies handles tables with no foreign keys',
         dict(test_method='test_fkey_dependencies_empty')),
        ('get_table_submodules_dependencies removes consecutive self '
         'references',
         dict(test_method='test_submodules_dependencies_strips_self_refs')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def _make_conn(self, rows):
        conn = MagicMock()
        conn.manager.version = 170000
        conn.execute_dict.return_value = (True, {'rows': rows})
        return conn

    def test_fkey_dependencies_include_oid(self):
        conn = self._make_conn([
            {
                'refnsp': 'fk_order_repro',
                'reftab': 'z_parent',
                'confrelid': 16390,
            },
            {
                'refnsp': 'shared',
                'reftab': 'lookup',
                'confrelid': 16410,
            },
        ])

        with self.app.app_context():
            status, deps = fkey_utils.get_fkey_dependencies(conn, 16395)

        self.assertTrue(status)
        self.assertEqual(deps, [
            {'type': 'table', 'name': 'fk_order_repro.z_parent', 'oid': 16390},
            {'type': 'table', 'name': 'shared.lookup', 'oid': 16410},
        ])

    def test_fkey_dependencies_empty(self):
        conn = self._make_conn([])

        with self.app.app_context():
            status, deps = fkey_utils.get_fkey_dependencies(conn, 16395)

        self.assertTrue(status)
        self.assertEqual(deps, [])

    def test_submodules_dependencies_strips_self_refs(self):
        tid = 16395
        view = TableView.__new__(TableView)
        view.conn = self._make_conn([
            # Two consecutive self-referencing FKs followed by a parent FK.
            {'refnsp': 'app', 'reftab': 's_self', 'confrelid': tid},
            {'refnsp': 'app', 'reftab': 's_self', 'confrelid': tid},
            {'refnsp': 'app', 'reftab': 'z_parent', 'confrelid': 16390},
        ])
        view.tables_sub_modules = []
        # Consecutive self-dependency in get_dependencies() as well.
        view.get_dependencies = MagicMock(return_value=[
            {'type': 'table', 'name': 'app.s_self', 'oid': tid},
            {'type': 'type', 'name': 'app.custom_type', 'oid': 16388},
        ])

        raw_method = TableView.get_table_submodules_dependencies.__wrapped__
        with self.app.app_context(), patch(
            'pgadmin.browser.server_groups.servers.databases.schemas.'
            'tables.fkey_utils.get_fkey_dependencies',
            wraps=fkey_utils.get_fkey_dependencies,
        ):
            deps = raw_method(view, tid=tid)

        self.assertEqual(deps, [
            {'type': 'type', 'name': 'app.custom_type', 'oid': 16388},
            {'type': 'table', 'name': 'app.z_parent', 'oid': 16390},
        ])
