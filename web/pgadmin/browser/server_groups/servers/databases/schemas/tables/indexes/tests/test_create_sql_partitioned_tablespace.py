##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for #10341: CREATE INDEX ... TABLESPACE pg_default is
rejected by PostgreSQL when the index's table is partitioned ('cannot
specify default tablespace for partitioned relations'). pgAdmin's index
create.sql templates always emitted the TABLESPACE clause for any
selected tablespace, including the pre-filled 'pg_default' default,
which is invalid for a partitioned table and a no-op for anything else.

The index_constraint/exclusion_constraint create.sql templates already
guard against this (data.spcname != "pg_default"); this test asserts the
plain index templates apply the same guard, without requiring a running
PostgreSQL server.
"""

import os

import pgadmin
from flask import Flask, render_template
from jinja2 import FileSystemLoader

from pgadmin.utils.driver import get_driver
from pgadmin.utils.route import BaseTestGenerator
from config import PG_DEFAULT_DRIVER


class _FakeConn:
    """Stand-in for a psycopg connection so qtIdent resolves without a
    live server."""

    conn = None

    def __bool__(self):
        return True


class _FakeApp(Flask):
    """Minimal Flask app mirroring the production Jinja filters."""

    def __init__(self, template_root):
        super().__init__('')
        driver = get_driver(PG_DEFAULT_DRIVER, self)
        self.jinja_env.filters['qtIdent'] = driver.qtIdent
        self.jinja_env.loader = FileSystemLoader([template_root])


_TEMPLATE_ROOT = os.path.join(
    os.path.dirname(pgadmin.__file__), 'browser', 'server_groups', 'servers',
    'databases', 'schemas', 'tables', 'templates')


def _base_data(spcname):
    return dict(
        name='my_index', schema='public', table='my_partitioned_table',
        indisunique=False, isconcurrent=False, indisonly=False,
        amname='btree', columns=[dict(colname='my_column', is_exp=False)],
        include=[], storage_parameters=None, spcname=spcname,
        indconstraint=None, dependsonextensions=[],
    )


class IndexCreateSQLPartitionedTablespaceTestCase(BaseTestGenerator):
    """CREATE INDEX SQL must omit a redundant TABLESPACE pg_default
    clause, since it is rejected outright for partitioned tables and a
    no-op for everything else."""

    scenarios = [
        ('default templates omit TABLESPACE pg_default', dict(
            template='indexes/sql/default/create.sql',
            spcname='pg_default',
        )),
        ('15_plus templates omit TABLESPACE pg_default', dict(
            template='indexes/sql/15_plus/create.sql',
            spcname='pg_default',
        )),
        ('default templates keep an explicit non-default tablespace',
         dict(
             template='indexes/sql/default/create.sql',
             spcname='custom_ts',
         )),
        ('15_plus templates keep an explicit non-default tablespace',
         dict(
             template='indexes/sql/15_plus/create.sql',
             spcname='custom_ts',
         )),
    ]

    def setUp(self):
        self.app_under_test = _FakeApp(_TEMPLATE_ROOT)

    def runTest(self):
        conn = _FakeConn()
        data = _base_data(self.spcname)

        with self.app_under_test.app_context():
            rendered = render_template(
                self.template, data=data, conn=conn, mode='create',
                add_not_exists_clause=False)

        if self.spcname == 'pg_default':
            self.assertNotIn(
                'TABLESPACE', rendered,
                msg=('Generated CREATE INDEX SQL must not name the '
                     'default tablespace explicitly, since PostgreSQL '
                     'rejects it for a partitioned table.\nRendered:\n{}'
                     .format(rendered)))
        else:
            self.assertIn(
                'TABLESPACE {}'.format(self.spcname), rendered,
                msg=('An explicitly chosen, non-default tablespace must '
                     'still be emitted.\nRendered:\n{}'.format(rendered)))

    def tearDown(self):
        pass
