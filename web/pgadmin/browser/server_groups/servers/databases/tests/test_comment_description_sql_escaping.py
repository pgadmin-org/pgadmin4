##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test: COMMENT ... IS '<description>' templates must escape the
description through the qtLiteral filter so that user-supplied apostrophes
cannot break out of the string literal.

This covers all template sites that previously interpolated descriptions as
``'{{ value }}'`` and were vulnerable to SQL injection via the description
input on the corresponding pgAdmin dialogs.
"""

import os

from flask import Flask, render_template
from jinja2 import FileSystemLoader

from pgadmin.utils.driver import get_driver
from pgadmin.utils.route import BaseTestGenerator
from config import PG_DEFAULT_DRIVER


# A description containing an apostrophe and a trailing SQL statement. If the
# template fails to escape, the rendered SQL closes the literal early and the
# remaining text becomes executable SQL.
PAYLOAD = "x'; DROP TABLE pg_class; --"

# After correct qtLiteral escaping the apostrophe is doubled and the value is
# wrapped in single quotes.
SAFE_FRAGMENT = "'x''; DROP TABLE pg_class; --'"

# What the vulnerable template used to render: the apostrophe is not doubled,
# so the literal closes after ``x`` and the remainder becomes executable SQL.
VULN_FRAGMENT = "'x'; DROP TABLE pg_class; --'"


WEB_ROOT = os.path.realpath(
    os.path.join(os.path.dirname(os.path.realpath(__file__)),
                 os.pardir, os.pardir, os.pardir, os.pardir, os.pardir,
                 os.pardir)
)


class _FakeConn:
    """psycopg.sql.Literal.as_string() accepts None as its context and still
    produces the canonical PostgreSQL-escaped literal. The production
    ``qtLiteral`` short-circuits when its conn argument is falsy, so we hand
    it an object whose ``.conn`` is None: that exercises the real escape
    branch (``psycopg.sql.Literal(value).as_string(None)``) without needing a
    live PostgreSQL connection."""

    conn = None

    def __bool__(self):
        return True


def _abs(*parts):
    return os.path.join(WEB_ROOT, *parts)


# Jinja loader roots needed by the affected templates. Each template imports
# macros via paths like ``macros/schemas/security.macros`` or
# ``macros/privilege.macros`` which resolve against these roots.
MACRO_ROOTS = [
    _abs('pgadmin', 'browser', 'server_groups', 'servers',
         'databases', 'schemas', 'templates'),
    _abs('pgadmin', 'browser', 'server_groups', 'servers', 'templates'),
]


class CommentDescriptionSQLEscapingTestCase(BaseTestGenerator):
    """Verify each previously-vulnerable COMMENT template escapes the
    description through ``qtLiteral`` so apostrophes cannot terminate the
    SQL string literal early."""

    scenarios = [
        (
            'Domain create - data.description (domain comment)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'domains', 'templates'),
                template='domains/sql/default/create.sql',
                ctx=dict(
                    data=dict(name='d1', basensp='public', basetype='text',
                              description=PAYLOAD),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Domain create - c.description (constraint comment)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'domains', 'templates'),
                template='domains/sql/default/create.sql',
                ctx=dict(
                    data=dict(
                        name='d1', basensp='public', basetype='text',
                        constraints=[
                            dict(conname='c1', consrc='VALUE > 0',
                                 description=PAYLOAD),
                        ],
                    ),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Domain update - c.description in constraints.added',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'domains', 'templates'),
                template='domains/sql/default/update.sql',
                ctx=dict(
                    data=dict(
                        name='d1',
                        constraints=dict(
                            deleted=[], changed=[],
                            added=[dict(conname='c1', consrc='VALUE > 0',
                                        description=PAYLOAD)],
                        ),
                        seclabels=dict(),
                    ),
                    o_data=dict(name='d1', basensp='public', constraints={}),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Domain schema diff - data.description (domain comment)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'domains', 'templates'),
                template='domains/sql/default/domain_schema_diff.sql',
                ctx=dict(
                    data=dict(description=PAYLOAD),
                    o_data=dict(name='d1', basensp='public', fulltype='text'),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Domain schema diff - c.description in constraints.added',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'domains', 'templates'),
                template='domains/sql/default/domain_schema_diff.sql',
                ctx=dict(
                    data=dict(
                        constraints=dict(
                            added=[dict(conname='c1', consrc='VALUE > 0',
                                        description=PAYLOAD)],
                            changed=[],
                        ),
                    ),
                    o_data=dict(name='d1', basensp='public', fulltype='text'),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Domain schema diff - c.description in constraints.changed',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'domains', 'templates'),
                template='domains/sql/default/domain_schema_diff.sql',
                ctx=dict(
                    data=dict(
                        constraints=dict(
                            added=[],
                            changed=[dict(conname='c1', consrc='VALUE > 0',
                                          description=PAYLOAD)],
                        ),
                    ),
                    o_data=dict(name='d1', basensp='public', fulltype='text'),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Domain constraint create - data.description',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'domains', 'domain_constraints',
                    'templates'),
                template='domain_constraints/sql/default/create.sql',
                ctx=dict(
                    data=dict(name='c1', consrc='VALUE > 0',
                              description=PAYLOAD),
                    schema='public', domain='d1',
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Foreign table create - data.description',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'foreign_tables', 'templates'),
                template='foreign_tables/sql/default/create.sql',
                ctx=dict(
                    data=dict(
                        name='ft1', basensp='public', ftsrvname='srv',
                        description=PAYLOAD, columns=[], constraints=[],
                    ),
                    is_sql=False,
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Foreign table schema diff - data.description',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'foreign_tables', 'templates'),
                template='foreign_tables/sql/default/'
                         'foreign_table_schema_diff.sql',
                ctx=dict(
                    data=dict(description=PAYLOAD, ftsrvname='srv'),
                    o_data=dict(name='ft1', basensp='public',
                                columns=[], constraints=[]),
                    is_sql=False,
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Foreign table schema diff - o_data.description (elif branch)',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'foreign_tables', 'templates'),
                template='foreign_tables/sql/default/'
                         'foreign_table_schema_diff.sql',
                ctx=dict(
                    data=dict(ftsrvname='srv'),
                    o_data=dict(name='ft1', basensp='public',
                                columns=[], constraints=[],
                                description=PAYLOAD),
                    is_sql=False,
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Language update - data.description',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'languages', 'templates'),
                template='languages/sql/default/update.sql',
                ctx=dict(
                    data=dict(name='plperl', description=PAYLOAD),
                    o_data=dict(name='plperl', description='old',
                                trusted=True, lanproc='h', laninl='i',
                                lanval='v', lanowner='postgres'),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'Event trigger update - data.comment',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'event_triggers', 'templates'),
                template='event_triggers/sql/default/update.sql',
                ctx=dict(
                    data=dict(name='et1', comment=PAYLOAD),
                    o_data=dict(name='et1', comment='old',
                                eventname='ddl_command_start',
                                eventfunname='public.f', eventowner='postgres',
                                enabled='O'),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'View OID lookup (pg) - data.schema',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'views', 'templates'),
                template='views/pg/default/sql/view_id.sql',
                ctx=dict(
                    data=dict(name='v1', schema=PAYLOAD),
                    conn=_FakeConn(),
                ),
            ),
        ),
        (
            'View OID lookup (ppas) - data.schema',
            dict(
                template_root=_abs(
                    'pgadmin', 'browser', 'server_groups', 'servers',
                    'databases', 'schemas', 'views', 'templates'),
                template='views/ppas/default/sql/view_id.sql',
                ctx=dict(
                    data=dict(name='v1', schema=PAYLOAD),
                    conn=_FakeConn(),
                ),
            ),
        ),
    ]

    def setUp(self):
        self.app_under_test = _FakeApp(self.template_root)

    def runTest(self):
        with self.app_under_test.app_context():
            rendered = render_template(self.template, **self.ctx)

        self.assertIn(
            SAFE_FRAGMENT, rendered,
            msg=(
                'Description was not safely escaped by qtLiteral.\n'
                'Expected fragment: {}\n'
                'Rendered output:\n{}'.format(SAFE_FRAGMENT, rendered)
            ),
        )
        self.assertNotIn(
            VULN_FRAGMENT, rendered,
            msg=(
                'Rendered SQL still contains the unescaped (vulnerable) '
                'fragment.\nRendered output:\n{}'.format(rendered)
            ),
        )


class _FakeApp(Flask):
    """Minimal Flask app whose Jinja environment mirrors the production
    template filters (``qtLiteral``, ``qtIdent``, ``qtTypeIdent``) and whose
    loader can resolve both the entity's own templates and the macro files
    they import."""

    def __init__(self, template_root):
        super().__init__('')
        driver = get_driver(PG_DEFAULT_DRIVER, self)
        self.jinja_env.filters['qtLiteral'] = driver.qtLiteral
        self.jinja_env.filters['qtIdent'] = driver.qtIdent
        self.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent
        self.jinja_loader = FileSystemLoader([template_root] + MACRO_ROOTS)
