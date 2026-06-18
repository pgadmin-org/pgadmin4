##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test: ``pgstattuple(...)`` and ``pgstatindex(...)`` in the
stats templates must address their target via ``<oid>::oid::regclass``,
NOT via a single-quoted ``'<schema>.<name>'`` string literal that
embedded raw Jinja interpolations.

The earlier pattern (``pgstatindex('{{conn|qtIdent(schema)}}.{{conn|
qtIdent(name)}}')`` / ``pgstattuple('{{schema_name}}.{{table_name}}')``)
was vulnerable: a low-privilege user could create an object whose name
contained an apostrophe — ``CREATE TABLE "foo'bar" (...)`` — and any
viewer who then opened the stats panel would render an unbalanced SQL
literal, breaking out of the ``'...'`` and executing whatever followed.

The fix replaces the embedded interpolation with an OID cast — the
relation is identified by its numeric OID and the ``::regclass`` cast
resolves it server-side, so no string literal is involved at all.
That makes the bug structurally impossible, not just guarded against.

POSITIVE assertions:
  * The rendered stats SQL contains ``pgstattuple(<oid>::oid::regclass)``
    or ``pgstatindex(<oid>::oid::regclass)``.
  * An apostrophe planted in any identifier passed to the template
    does NOT appear inside a SQL literal context in the output (i.e.
    the template no longer embeds the identifier at all).

NEGATIVE assertions (regression guards):
  * The previously-vulnerable ``pgstattuple('...'``/``pgstatindex('...'``
    string-literal-call pattern must NOT recur.
  * Specifically the apostrophe payload must NOT survive verbatim
    inside any single-quoted region of the rendered SQL.
"""

import os
import re

from flask import Flask, render_template
from jinja2 import FileSystemLoader

from pgadmin.utils.driver import get_driver
from pgadmin.utils.route import BaseTestGenerator
from config import PG_DEFAULT_DRIVER


# Apostrophe-injection payload. Anywhere this appears INSIDE a single-
# quoted literal in the rendered SQL is a SQLi.
APOSTROPHE_NAME = "evil'or'1=1--"


WEB_ROOT = os.path.realpath(
    os.path.join(os.path.dirname(os.path.realpath(__file__)),
                 os.pardir, os.pardir, os.pardir, os.pardir, os.pardir,
                 os.pardir)
)


class _FakeConn:
    """qtIdent / qtLiteral use this as a stand-in for a real psycopg
    connection (see test_comment_description_sql_escaping.py for the
    full reasoning)."""

    conn = None

    def __bool__(self):
        return True


def _abs(*parts):
    return os.path.join(WEB_ROOT, *parts)


# Macro roots needed by the schemas templates' imports.
MACRO_ROOTS = [
    _abs('pgadmin', 'browser', 'server_groups', 'servers',
         'databases', 'schemas', 'templates'),
    _abs('pgadmin', 'browser', 'server_groups', 'servers', 'templates'),
]


class _FakeApp(Flask):
    """Minimal Flask app mirroring the production Jinja filters."""

    def __init__(self, template_root):
        super().__init__('')
        driver = get_driver(PG_DEFAULT_DRIVER, self)
        self.jinja_env.filters['qtLiteral'] = driver.qtLiteral
        self.jinja_env.filters['qtIdent'] = driver.qtIdent
        self.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent
        self.jinja_env.loader = FileSystemLoader(
            [template_root] + MACRO_ROOTS
        )


# Regex: any single-quoted literal in the rendered SQL.
SQL_LITERAL = re.compile(r"'[^'\n]*'")


class StatsTemplateRegclassCastTestCase(BaseTestGenerator):
    """Each stats template must address the relation via OID + regclass,
    not via an embedded ``'<schema>.<name>'`` literal."""

    scenarios = [
        (
            'Table stats (16_plus) — pgstattuple(tid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='tables/sql/16_plus/stats.sql',
                ctx=dict(
                    tid=12345,
                    schema_name='public',
                    table_name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstattuple(12345::oid::regclass)',
                forbid_call_re=r"pgstattuple\('",
            ),
        ),
        (
            'Table stats (default) — pgstattuple(tid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='tables/sql/default/stats.sql',
                ctx=dict(
                    tid=12345,
                    schema_name='public',
                    table_name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstattuple(12345::oid::regclass)',
                forbid_call_re=r"pgstattuple\('",
            ),
        ),
        (
            'Materialised view stats (pg) — pgstattuple(vid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'views', 'templates'),
                template='mviews/pg/default/sql/stats.sql',
                ctx=dict(
                    vid=67890,
                    schema_name='public',
                    mview_name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstattuple(67890::oid::regclass)',
                forbid_call_re=r"pgstattuple\('",
            ),
        ),
        (
            'Materialised view stats (ppas) — pgstattuple(vid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'views', 'templates'),
                template='mviews/ppas/default/sql/stats.sql',
                ctx=dict(
                    vid=67890,
                    schema_name='public',
                    mview_name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstattuple(67890::oid::regclass)',
                forbid_call_re=r"pgstattuple\('",
            ),
        ),
        (
            'Exclusion constraint stats (16_plus) — '
            'pgstatindex(exid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='exclusion_constraint/sql/16_plus/stats.sql',
                ctx=dict(
                    exid=11111,
                    schema='public',
                    name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstatindex(11111::oid::regclass)',
                forbid_call_re=r"pgstatindex\('",
            ),
        ),
        (
            'Exclusion constraint stats (default) — '
            'pgstatindex(exid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='exclusion_constraint/sql/default/stats.sql',
                ctx=dict(
                    exid=11111,
                    schema='public',
                    name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstatindex(11111::oid::regclass)',
                forbid_call_re=r"pgstatindex\('",
            ),
        ),
        (
            'Index constraint stats (16_plus) — '
            'pgstatindex(cid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='index_constraint/sql/16_plus/stats.sql',
                ctx=dict(
                    cid=22222,
                    schema='public',
                    name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstatindex(22222::oid::regclass)',
                forbid_call_re=r"pgstatindex\('",
            ),
        ),
        (
            'Index constraint stats (default) — '
            'pgstatindex(cid::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='index_constraint/sql/default/stats.sql',
                ctx=dict(
                    cid=22222,
                    schema='public',
                    name=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstatindex(22222::oid::regclass)',
                forbid_call_re=r"pgstatindex\('",
            ),
        ),
        (
            'Index stats (16_plus) — pgstatindex(idx::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='indexes/sql/16_plus/stats.sql',
                ctx=dict(
                    idx=33333,
                    schema='public',
                    index=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstatindex(33333::oid::regclass)',
                forbid_call_re=r"pgstatindex\('",
            ),
        ),
        (
            'Index stats (default) — pgstatindex(idx::oid::regclass)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'tables', 'templates'),
                template='indexes/sql/default/stats.sql',
                ctx=dict(
                    idx=33333,
                    schema='public',
                    index=APOSTROPHE_NAME,
                    is_pgstattuple=True,
                    conn=_FakeConn(),
                ),
                expected_call='pgstatindex(33333::oid::regclass)',
                forbid_call_re=r"pgstatindex\('",
            ),
        ),
    ]

    def setUp(self):
        self.app_under_test = _FakeApp(self.template_root)

    def runTest(self):
        # The stats templates use `_('...')` for column aliases. Inject
        # an identity gettext stand-in so the templates render without
        # needing a real flask-babel context (we don't care about
        # localisation here; we only assert on the pgstat* call shape).
        ctx = dict(self.ctx, _=lambda s: s)
        with self.app_under_test.app_context():
            rendered = render_template(self.template, **ctx)

        # POSITIVE: the regclass-cast call is present.
        self.assertIn(
            self.expected_call, rendered,
            msg=(
                'Stats template should address the relation via '
                'OID::oid::regclass; expected {!r} in rendered SQL.\n'
                'Rendered:\n{}'.format(self.expected_call, rendered)
            ),
        )

        # NEGATIVE: the previously-vulnerable string-literal call form
        # must NOT recur.
        self.assertIsNone(
            re.search(self.forbid_call_re, rendered),
            msg=(
                'Stats template must not call pgstat* with a '
                "single-quoted relation name (the previously-vulnerable "
                'pattern). Pattern: {!r}\nRendered:\n{}'
                .format(self.forbid_call_re, rendered)
            ),
        )

        # NEGATIVE: the apostrophe payload, if it appears at all, must
        # not appear *inside* a single-quoted literal region — that
        # would indicate the identifier is being embedded somewhere
        # else in the template.
        for literal in SQL_LITERAL.findall(rendered):
            self.assertNotIn(
                APOSTROPHE_NAME, literal,
                msg=(
                    'Apostrophe-bearing identifier payload appeared '
                    'inside a SQL literal in the rendered stats SQL — '
                    'indicates the identifier is still being embedded '
                    'in some literal context.\n'
                    'Offending literal: {!r}\nRendered:\n{}'
                    .format(literal, rendered)
                ),
            )
