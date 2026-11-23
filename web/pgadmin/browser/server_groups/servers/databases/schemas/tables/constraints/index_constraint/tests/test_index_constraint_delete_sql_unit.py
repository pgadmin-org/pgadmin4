##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for _get_sql_to_delete_constraints() and
get_index_constraint_sql().

A deleted primary key or unique constraint should only skip DROP CONSTRAINT
when one of its own key or INCLUDE columns is also being dropped in the same
ALTER TABLE operation (#10813).
"""

from unittest.mock import MagicMock, patch

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.index_constraint import utils as idxcons_utils
from pgadmin.utils.route import BaseTestGenerator


class TestIndexConstraintDeleteSqlUnit(BaseTestGenerator):
    """Unit tests for _get_sql_to_delete_constraints()."""

    scenarios = [
        ('Unrelated column dropped emits DROP CONSTRAINT for primary key',
         dict(
             constraint_name='tbl_pk',
             constraint_cols=[{'column': 'a'}, {'column': 'b'}],
             include_cols=[],
             dropped_cols=['c'],
             expect_drop=True,
         )),
        ('Unrelated column dropped emits DROP CONSTRAINT for unique '
         'constraint',
         dict(
             constraint_name='tbl_uk',
             constraint_cols=[{'column': 'a'}, {'column': 'b'}],
             include_cols=[],
             dropped_cols=['c'],
             expect_drop=True,
         )),
        ('Substring-only column name match still emits DROP CONSTRAINT',
         dict(
             constraint_name='tbl_pk',
             constraint_cols=[{'column': 'a'}],
             include_cols=[],
             dropped_cols=['abc'],
             expect_drop=True,
         )),
        ('No dropped columns emits DROP CONSTRAINT',
         dict(
             constraint_name='tbl_pk',
             constraint_cols=[{'column': 'a'}, {'column': 'b'}],
             include_cols=[],
             dropped_cols=[],
             expect_drop=True,
         )),
        ('First key column dropped skips DROP CONSTRAINT',
         dict(
             constraint_name='tbl_pk',
             constraint_cols=[{'column': 'a'}, {'column': 'b'}],
             include_cols=[],
             dropped_cols=['a'],
             expect_drop=False,
         )),
        ('Second key column dropped skips DROP CONSTRAINT',
         dict(
             constraint_name='tbl_pk',
             constraint_cols=[{'column': 'a'}, {'column': 'b'}],
             include_cols=[],
             dropped_cols=['b'],
             expect_drop=False,
         )),
        ('INCLUDE column dropped skips DROP CONSTRAINT',
         dict(
             constraint_name='tbl_uk',
             constraint_cols=[{'column': 'a'}],
             include_cols=['inc_col'],
             dropped_cols=['inc_col'],
             expect_drop=False,
         )),
    ]

    def runTest(self):
        data = {
            'schema': 'public',
            'name': 'tbl',
            'columns_to_be_dropped': list(self.dropped_cols),
        }
        constraint = {
            'deleted': [{
                'name': self.constraint_name,
                'columns': list(self.constraint_cols),
                'include': list(self.include_cols),
            }]
        }
        sql = []
        conn = MagicMock()

        def fake_render(template, **kwargs):
            return 'ALTER TABLE {0}.{1} DROP CONSTRAINT {2};'.format(
                kwargs['data']['schema'],
                kwargs['data']['table'],
                kwargs['data']['name'],
            )

        with patch.object(idxcons_utils, 'render_template',
                          side_effect=fake_render):
            idxcons_utils._get_sql_to_delete_constraints(
                data, constraint, sql, 'index_constraint/sql/#170000#', conn
            )

        if self.expect_drop:
            self.assertEqual(len(sql), 1)
            self.assertIn(self.constraint_name, sql[0])
        else:
            self.assertEqual(sql, [])


class TestIndexConstraintDropAndAddSqlUnit(BaseTestGenerator):
    """Unit tests for get_index_constraint_sql() emitting DROP before ADD
    when a constraint is recreated alongside an unrelated column drop."""

    scenarios = [
        ('Renamed primary key drops old constraint before adding new '
         'one when an unrelated column is dropped',
         dict(
             constraint_key='primary_key',
             old_name='tbl_pk',
             new_name='tbl_pkey',
         )),
        ('Recreated unique constraint drops old constraint before '
         'adding new one when an unrelated column is dropped',
         dict(
             constraint_key='unique_constraint',
             old_name='tbl_uk_old',
             new_name='tbl_uk_new',
         )),
    ]

    def runTest(self):
        data = {
            'schema': 'tgt',
            'name': 'tbl',
            'columns_to_be_dropped': ['c'],
            self.constraint_key: {
                'deleted': [{
                    'name': self.old_name,
                    'columns': [{'column': 'a'}, {'column': 'b'}],
                    'include': [],
                }],
                'added': [{
                    'name': self.new_name,
                    'columns': [{'column': 'a'}, {'column': 'b'}],
                    'include': [],
                }],
            },
        }
        conn = MagicMock()
        conn.manager.version = 170000

        def fake_render(template, **kwargs):
            c = kwargs['data']
            if template.endswith('delete.sql'):
                return 'ALTER TABLE {0}.{1} DROP CONSTRAINT {2};'.format(
                    c['schema'], c['table'], c['name']
                )
            return 'ALTER TABLE {0}.{1} ADD CONSTRAINT {2} {3};'.format(
                c['schema'], c['table'], c['name'], kwargs['constraint_name']
            )

        with patch.object(idxcons_utils, 'render_template',
                          side_effect=fake_render):
            result = idxcons_utils.get_index_constraint_sql(
                conn, 1, 2, data
            )

        self.assertIsNotNone(result)
        drop_stmt = 'DROP CONSTRAINT {0}'.format(self.old_name)
        add_stmt = 'ADD CONSTRAINT {0}'.format(self.new_name)
        self.assertIn(drop_stmt, result)
        self.assertIn(add_stmt, result)
        self.assertLess(result.index(drop_stmt), result.index(add_stmt))
