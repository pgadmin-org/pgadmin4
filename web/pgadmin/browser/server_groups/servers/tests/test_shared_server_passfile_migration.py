##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for the strip_inherited_passfile data migration.

SharedServer rows created before 9.15 carry a verbatim copy of the
owner's passfile. The migration removes that copy wherever it still
equals the owner's value, and leaves anything else alone. The logic is
exercised against an in-memory SQLite database holding only the two
columns involved, so no running server or Alembic context is needed.
"""

import importlib.util
import os

import sqlalchemy as sa

from pgadmin.utils.route import BaseTestGenerator


def _load_migration():
    path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        '..', '..', '..', '..', '..',
        'migrations', 'versions', 'strip_inherited_passfile_.py')
    spec = importlib.util.spec_from_file_location(
        'strip_inherited_passfile', os.path.normpath(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestStripInheritedPassfileMigration(BaseTestGenerator):
    scenarios = [
        ('A copy equal to the owner passfile is removed',
         dict(test_method='test_owner_copy_removed')),
        ('A different passfile is the user\'s own and is kept',
         dict(test_method='test_own_passfile_kept')),
        ('Rows with no passfile are left untouched',
         dict(test_method='test_no_passfile_untouched')),
        ('A copy survives when the owner has since dropped passfile',
         dict(test_method='test_owner_without_passfile')),
        ('Other connection parameters survive the strip',
         dict(test_method='test_other_params_survive')),
    ]

    def setUp(self):
        self.engine = sa.create_engine('sqlite://')
        self.metadata = sa.MetaData()
        self.server = sa.Table(
            'server', self.metadata,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('connection_params', sa.JSON),
        )
        self.sharedserver = sa.Table(
            'sharedserver', self.metadata,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('osid', sa.Integer),
            sa.Column('connection_params', sa.JSON),
        )
        self.metadata.create_all(self.engine)
        self.migration = _load_migration()

    def tearDown(self):
        self.engine.dispose()

    def runTest(self):
        getattr(self, self.test_method)()

    def _seed(self, owner_params, shared_params):
        with self.engine.begin() as conn:
            conn.execute(self.server.insert().values(
                id=1, connection_params=owner_params))
            conn.execute(self.sharedserver.insert().values(
                id=10, osid=1, connection_params=shared_params))

    def _run(self):
        with self.engine.begin() as conn:
            changed = self.migration.strip_owner_passfile_copies(conn)
        with self.engine.connect() as conn:
            row = conn.execute(
                sa.select(self.sharedserver.c.connection_params)
                .where(self.sharedserver.c.id == 10)).fetchone()
        return changed, row[0]

    def test_owner_copy_removed(self):
        self._seed({'passfile': '/home/owner/.pgpass'},
                   {'passfile': '/home/owner/.pgpass'})
        changed, params = self._run()
        self.assertEqual(changed, 1)
        self.assertNotIn('passfile', params)

    def test_own_passfile_kept(self):
        self._seed({'passfile': '/home/owner/.pgpass'},
                   {'passfile': '/home/nonowner/.pgpass'})
        changed, params = self._run()
        self.assertEqual(changed, 0)
        self.assertEqual(params['passfile'], '/home/nonowner/.pgpass')

    def test_no_passfile_untouched(self):
        self._seed({'passfile': '/home/owner/.pgpass'},
                   {'sslmode': 'require'})
        changed, params = self._run()
        self.assertEqual(changed, 0)
        self.assertEqual(params, {'sslmode': 'require'})

    def test_owner_without_passfile(self):
        # Nothing to compare against, so the row cannot be recognised
        # as a copy and is deliberately left as it is.
        self._seed({'sslmode': 'require'},
                   {'passfile': '/home/owner/.pgpass'})
        changed, params = self._run()
        self.assertEqual(changed, 0)
        self.assertEqual(params['passfile'], '/home/owner/.pgpass')

    def test_other_params_survive(self):
        self._seed({'passfile': '/home/owner/.pgpass',
                    'sslmode': 'verify-full'},
                   {'passfile': '/home/owner/.pgpass',
                    'sslmode': 'require', 'connect_timeout': '10'})
        changed, params = self._run()
        self.assertEqual(changed, 1)
        self.assertEqual(params,
                         {'sslmode': 'require', 'connect_timeout': '10'})
