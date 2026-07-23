##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for CVE-2026-12044 follow-up: object-name lookups in
the index Statistics, publication and subscription templates must escape
the interpolated name with ``qtLiteral(conn)``.

These templates used to embed a browser-tree-sourced object name inside a
bare ``'{{ name }}'`` literal on the (incorrect) assumption that such
names could never contain an apostrophe. PostgreSQL permits arbitrary
characters in quoted identifiers, so a low-privilege user who can
``CREATE TABLE "x'; ..."`` (or CREATE PUBLICATION / SUBSCRIPTION) could
plant a name that breaks out of the literal once any user views that
object's Statistics or Dependencies panel -- the "SQL injection in
pgAdmin index Statistics (incomplete fix for CVE-2026-12044)" report.

This is the behavioural counterpart to the lint guard in
``test_sql_string_literal_lint.py`` (which only checks the raw
``'{{ x }}'`` pattern is absent) and complements
``test_stats_template_regclass_cast.py`` (which covers the *single-index*
``stats.sql`` pgstatindex path -- a different template from the
``coll_stats.sql`` all-indexes listing fixed here).

For each template it renders with a stacked-statement apostrophe payload
and asserts:

  * POSITIVE -- the name appears exactly as ``qtLiteral`` would escape it
    (apostrophe doubled, wrapped in single quotes), i.e. the filter was
    actually applied.
  * SEMANTIC -- the rendered SQL parses as exactly one statement, so the
    smuggled ``; <stmt>;`` cannot escape the intended query. This is the
    property that actually matters; a raw-interpolation regression would
    parse as several statements and fail here.

No database connection is required: templates are rendered against a
minimal Flask app with the production Jinja filters, exactly like
``test_stats_template_regclass_cast.py``.
"""

import os

import sqlparse
from flask import Flask, render_template
from jinja2 import FileSystemLoader

from pgadmin.utils.driver import get_driver
from pgadmin.utils.route import BaseTestGenerator
from config import PG_DEFAULT_DRIVER


# Stacked-statement payload. Under the old raw-interpolation form this
# breaks out of the literal and injects a second statement; under
# qtLiteral the apostrophe is doubled and the whole thing stays inside a
# single string literal.
PAYLOAD = "x'; SELECT pg_sleep(5); --"


WEB_ROOT = os.path.realpath(
    os.path.join(os.path.dirname(os.path.realpath(__file__)),
                 os.pardir, os.pardir, os.pardir, os.pardir, os.pardir,
                 os.pardir)
)


def _abs(*parts):
    return os.path.join(WEB_ROOT, *parts)


class _FakeConn:
    """Stand-in for a psycopg connection so qtLiteral/qtIdent resolve
    without a live server (see test_stats_template_regclass_cast.py)."""

    conn = None

    def __bool__(self):
        return True


class _FakeApp(Flask):
    """Minimal Flask app mirroring the production Jinja filters."""

    def __init__(self, template_root):
        super().__init__('')
        driver = get_driver(PG_DEFAULT_DRIVER, self)
        self.jinja_env.filters['qtLiteral'] = driver.qtLiteral
        self.jinja_env.filters['qtIdent'] = driver.qtIdent
        self.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent
        self.jinja_env.loader = FileSystemLoader([template_root])


_TABLES_ROOT = _abs(
    'pgadmin', 'browser', 'server_groups', 'servers', 'databases',
    'schemas', 'tables', 'templates')
_PUB_ROOT = _abs(
    'pgadmin', 'browser', 'server_groups', 'servers', 'databases',
    'publications', 'templates')
_SUB_ROOT = _abs(
    'pgadmin', 'browser', 'server_groups', 'servers', 'databases',
    'subscriptions', 'templates')


class NameLiteralSQLEscapingTestCase(BaseTestGenerator):
    """Each name-lookup template must escape the object name via
    qtLiteral so a planted apostrophe cannot smuggle a second
    statement."""

    scenarios = [
        ('Index stats coll_stats (default) escapes schema + table', dict(
            template_root=_TABLES_ROOT,
            template='indexes/sql/default/coll_stats.sql',
            inject=dict(schema='public', table=PAYLOAD),
            escaped_vars=['table'],
        )),
        ('Index stats coll_stats (16_plus) escapes schema + table', dict(
            template_root=_TABLES_ROOT,
            template='indexes/sql/16_plus/coll_stats.sql',
            inject=dict(schema='public', table=PAYLOAD),
            escaped_vars=['table'],
        )),
        ('Index stats coll_stats (default) escapes schema payload', dict(
            template_root=_TABLES_ROOT,
            template='indexes/sql/default/coll_stats.sql',
            inject=dict(schema=PAYLOAD, table='t'),
            escaped_vars=['schema'],
        )),
        ('Publication dependencies (pg) escapes pname', dict(
            template_root=_PUB_ROOT,
            template='publications/pg/default/sql/dependencies.sql',
            inject=dict(pname=PAYLOAD),
            escaped_vars=['pname'],
        )),
        ('Publication get_position (pg) escapes pubname', dict(
            template_root=_PUB_ROOT,
            template='publications/pg/default/sql/get_position.sql',
            inject=dict(pubname=PAYLOAD),
            escaped_vars=['pubname'],
        )),
        ('Publication dependencies (ppas) escapes pname', dict(
            template_root=_PUB_ROOT,
            template='publications/ppas/default/sql/dependencies.sql',
            inject=dict(pname=PAYLOAD),
            escaped_vars=['pname'],
        )),
        ('Publication get_position (ppas) escapes pubname', dict(
            template_root=_PUB_ROOT,
            template='publications/ppas/default/sql/get_position.sql',
            inject=dict(pubname=PAYLOAD),
            escaped_vars=['pubname'],
        )),
        ('Subscription dependencies escapes subname', dict(
            template_root=_SUB_ROOT,
            template='subscriptions/sql/default/dependencies.sql',
            inject=dict(subname=PAYLOAD),
            escaped_vars=['subname'],
        )),
        ('Subscription get_position escapes subname', dict(
            template_root=_SUB_ROOT,
            template='subscriptions/sql/default/get_position.sql',
            inject=dict(subname=PAYLOAD, did=12345),
            escaped_vars=['subname'],
        )),
    ]

    def setUp(self):
        self.app_under_test = _FakeApp(self.template_root)

    def runTest(self):
        conn = _FakeConn()
        driver = get_driver(PG_DEFAULT_DRIVER, self.app_under_test)

        # `_('...')` (gettext) is used for column aliases in coll_stats;
        # inject an identity stand-in so rendering needs no babel context.
        ctx = dict(self.inject, conn=conn, _=lambda s: s)
        with self.app_under_test.app_context():
            rendered = render_template(self.template, **ctx)

        # POSITIVE: every payload-carrying var appears exactly as
        # qtLiteral would escape it (apostrophe doubled, single-quoted).
        for var in self.escaped_vars:
            expected = driver.qtLiteral(self.inject[var], conn)
            self.assertIn(
                expected, rendered,
                msg=('Expected qtLiteral-escaped {!r} ({!r}) in rendered '
                     'SQL, so the name is safely quoted.\nRendered:\n{}'
                     .format(var, expected, rendered)))

        # SEMANTIC: the rendered SQL must be exactly one statement. If the
        # apostrophe had broken out of the literal, the smuggled
        # `; SELECT pg_sleep(5); --` would parse as extra statements.
        statements = [
            s for s in sqlparse.parse(rendered)
            if s.token_first(skip_cm=True, skip_ws=True) is not None
        ]
        self.assertEqual(
            len(statements), 1,
            msg=('Rendered SQL must be a single statement; a payload '
                 'apostrophe escaped the literal and smuggled additional '
                 'statements.\nParsed {} statements from:\n{}'
                 .format(len(statements), rendered)))

    def tearDown(self):
        pass
