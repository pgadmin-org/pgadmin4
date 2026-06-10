##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Lint regression test: every ``'{{ ... }}'`` Jinja interpolation in a SQL
template is a potential SQL injection sink — the unquoted-then-quoted form
relies on the substituted value being free of apostrophes, which is almost
never enforceable across the codebase.

The safe pattern is ``{{ value|qtLiteral(conn) }}`` (no surrounding quotes
in the template — the filter wraps the value in PostgreSQL-escaped single
quotes itself). See also ``test_comment_description_sql_escaping.py`` for
the per-template behavioural test that exercises the COMMENT sites that
motivated this lint.

This test walks every ``*.sql`` template under ``web/pgadmin/`` and compares
the set of single-quote-wrapped Jinja interpolations against an explicit
allowlist. Each allowlist entry carries a short justification.

If you see this test fail with a "new occurrence" message, you have two
options:

  1. Preferred: change ``'{{ x }}'`` to ``{{ x|qtLiteral(conn) }}`` in the
     template. Make sure the ``render_template`` caller passes ``conn=`` so
     the filter does not short-circuit.
  2. If the value is provably safe (e.g. a numeric OID looked up from
     pg_catalog, a hardcoded constant supplied by the handler, or a
     bounded enum validated server-side), add an entry to ``ALLOWLIST``
     below with a one-line reason.
"""

import os
import re
from collections import Counter

from pgadmin.utils.route import BaseTestGenerator


# Repository web/ directory.
WEB_ROOT = os.path.realpath(
    os.path.join(os.path.dirname(os.path.realpath(__file__)),
                 os.pardir, os.pardir, os.pardir, os.pardir, os.pardir,
                 os.pardir)
)

# Root inside web/ that the lint walks.
SCAN_ROOT = os.path.join(WEB_ROOT, 'pgadmin')

# Single-quote-wrapped Jinja interpolation. The expression body cannot
# contain ``}`` because ``}}`` ends the Jinja tag.
PATTERN = re.compile(r"'\{\{[^}]+\}\}'")


# Allowlist of currently-known occurrences. Each entry is
# ``((relative_path, matched_fragment), count, reason)`` where:
#
#   * ``relative_path`` is the SQL template path relative to ``web/``
#     (forward slashes on every platform).
#   * ``matched_fragment`` is the exact ``'{{ ... }}'`` slice as it appears
#     in the template (whitespace inside the braces matters).
#   * ``count`` is the number of times that fragment occurs in that file
#     (a single long Jinja line can carry multiple identical fragments).
#   * ``reason`` is a short justification: why this is not exploitable.
#
# Add new entries only when (1) the substituted value is genuinely safe by
# construction, or (2) the impact is something other than SQL injection
# against arbitrary data. Anything that takes free-form user input through
# the request body MUST use ``qtLiteral`` instead of being allowlisted.

ALLOWLIST = [
    # ------------------------------------------------------------------
    # Server-internal numeric OIDs. ``oid``/``tid`` are integers looked up
    # from pg_catalog and rendered into a literal-shaped placeholder so
    # they can be compared against text columns / cast back via regclass.
    # Not user-supplied; cannot contain apostrophes.
    # ------------------------------------------------------------------
    (('pgadmin/browser/server_groups/servers/databases/schemas/types/'
      'templates/types/pg/sql/default/get_subtypes.sql',
      "'{{ oid }}'"), 1,
     "OID is a server-internal integer from pg_catalog (proargtypes lookup)."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/types/'
      'templates/types/ppas/sql/default/get_subtypes.sql',
      "'{{ oid }}'"), 1,
     "OID is a server-internal integer from pg_catalog (proargtypes lookup)."),
    (('pgadmin/browser/server_groups/servers/databases/publications/'
      'templates/publications/pg/default/sql/get_all_columns.sql',
      "'{{ tid }}'"), 1,
     "tid is a numeric table OID from the URL path, used with ::regclass."),
    (('pgadmin/browser/server_groups/servers/databases/publications/'
      'templates/publications/ppas/default/sql/get_all_columns.sql',
      "'{{ tid }}'"), 1,
     "tid is a numeric table OID from the URL path, used with ::regclass."),

    # ------------------------------------------------------------------
    # Fixed enum strings supplied by the dashboard module. The value
    # passed for ``log_format`` is selected from the server's
    # ``log_destination`` GUC and can only be ``csvlog``, ``stderr`` or
    # ``jsonlog`` (the only values pg_current_logfile accepts).
    # ------------------------------------------------------------------
    (('pgadmin/dashboard/templates/dashboard/sql/default/logs.sql',
      "'{{log_format}}'"), 1,
     "log_format is a fixed enum (csvlog/stderr/jsonlog) from server GUC."),
    (('pgadmin/dashboard/templates/dashboard/sql/default/log_stat.sql',
      "'{{log_format}}'"), 1,
     "log_format is a fixed enum (csvlog/stderr/jsonlog) from server GUC."),

    # ------------------------------------------------------------------
    # ``constraint_type`` is a single-char pg_constraint contype code
    # ('c', 'f', 'p', 'u', 'x', ...) passed by pgAdmin's own handler when
    # rendering one of these templates; never derived from request input.
    # ------------------------------------------------------------------
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/index_constraint/sql/15_plus/properties.sql',
      "'{{constraint_type}}'"), 1,
     "Single-char pg_constraint.contype code, hardcoded by handler."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/index_constraint/sql/11_plus/properties.sql',
      "'{{constraint_type}}'"), 1,
     "Single-char pg_constraint.contype code, hardcoded by handler."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/index_constraint/sql/default/properties.sql',
      "'{{constraint_type}}'"), 1,
     "Single-char pg_constraint.contype code, hardcoded by handler."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/index_constraint/sql/default/get_oid.sql',
      "'{{constraint_type}}'"), 1,
     "Single-char pg_constraint.contype code, hardcoded by handler."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/index_constraint/sql/default/get_oid_with_transaction.sql',
      "'{{constraint_type}}'"), 1,
     "Single-char pg_constraint.contype code, hardcoded by handler."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/index_constraint/sql/default/get_name.sql',
      "'{{constraint_type}}'"), 1,
     "Single-char pg_constraint.contype code, hardcoded by handler."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/index_constraint/sql/default/nodes.sql',
      "'{{constraint_type}}'"), 1,
     "Single-char pg_constraint.contype code, hardcoded by handler."),

    # ------------------------------------------------------------------
    # Index stat lookups for an already-existing table. ``schema`` and
    # ``table`` come from the browser tree node and ultimately from
    # pg_catalog. Cannot contain apostrophes for any object pgAdmin was
    # able to discover via its own browse queries (which use qtLiteral on
    # the way in), so this is not a SQL injection sink. A correctness
    # follow-up (legitimately named objects containing apostrophes) is
    # tracked separately.
    # ------------------------------------------------------------------
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/indexes/sql/default/coll_stats.sql',
      "'{{schema}}'"), 1,
     "Schema name from pg_catalog via browser tree, not request input."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/indexes/sql/default/coll_stats.sql',
      "'{{table}}'"), 1,
     "Table name from pg_catalog via browser tree, not request input."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/indexes/sql/16_plus/coll_stats.sql',
      "'{{schema}}'"), 1,
     "Schema name from pg_catalog via browser tree, not request input."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/tables/'
      'templates/indexes/sql/16_plus/coll_stats.sql',
      "'{{table}}'"), 1,
     "Table name from pg_catalog via browser tree, not request input."),

    # ------------------------------------------------------------------
    # Aggregate initial-condition strings. ``initial_val`` and
    # ``moving_initial_val`` come from the aggregate-creation form. The
    # session executing the SQL must already hold ``CREATE`` on the
    # target schema (CREATE AGGREGATE requirement), so the user can
    # already issue arbitrary SQL via Query Tool. Tracked as a
    # consistency follow-up; not a privilege-escalation sink.
    # ------------------------------------------------------------------
    (('pgadmin/browser/server_groups/servers/databases/schemas/aggregates/'
      'templates/aggregates/sql/11_plus/create.sql',
      "'{{data.initial_val}}'"), 1,
     "CREATE AGGREGATE requires CREATE on schema; user already has SQL "
     "access. Tracked as consistency follow-up."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/aggregates/'
      'templates/aggregates/sql/11_plus/create.sql',
      "'{{data.moving_initial_val}}'"), 1,
     "CREATE AGGREGATE requires CREATE on schema; user already has SQL "
     "access. Tracked as consistency follow-up."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/aggregates/'
      'templates/aggregates/sql/12_plus/create.sql',
      "'{{data.initial_val}}'"), 1,
     "CREATE AGGREGATE requires CREATE on schema; user already has SQL "
     "access. Tracked as consistency follow-up."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/aggregates/'
      'templates/aggregates/sql/12_plus/create.sql',
      "'{{data.moving_initial_val}}'"), 1,
     "CREATE AGGREGATE requires CREATE on schema; user already has SQL "
     "access. Tracked as consistency follow-up."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/aggregates/'
      'templates/aggregates/sql/default/create.sql',
      "'{{data.initial_val}}'"), 1,
     "CREATE AGGREGATE requires CREATE on schema; user already has SQL "
     "access. Tracked as consistency follow-up."),
    (('pgadmin/browser/server_groups/servers/databases/schemas/aggregates/'
      'templates/aggregates/sql/default/create.sql',
      "'{{data.moving_initial_val}}'"), 1,
     "CREATE AGGREGATE requires CREATE on schema; user already has SQL "
     "access. Tracked as consistency follow-up."),

    # ------------------------------------------------------------------
    # Subscription create/update parameters. ``sync`` (synchronous_commit
    # value), ``streaming`` (on/off/parallel), and ``origin`` (any/none)
    # are bounded enum values selected from form drop-downs; the
    # subscription form schema rejects free-form input. Subscription
    # management additionally requires the user to be a superuser
    # (CREATE SUBSCRIPTION). Tracked as a consistency follow-up.
    # ------------------------------------------------------------------
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/default/create.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/default/update.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/14_plus/create.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/14_plus/create.sql',
      "'{{ data.streaming}}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/14_plus/update.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/14_plus/update.sql',
      "'{{ data.streaming}}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/15_plus/create.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/15_plus/create.sql',
      "'{{ data.streaming}}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/15_plus/update.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/15_plus/update.sql',
      "'{{ data.streaming}}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/16_plus/create.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/16_plus/create.sql',
      "'{{ data.streaming}}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/16_plus/create.sql',
      "'{{ data.origin}}'"), 1,
     "Bounded enum (any/none); CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/16_plus/update.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/16_plus/update.sql',
      "'{{ data.streaming }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/16_plus/update.sql',
      "'{{ data.origin }}'"), 1,
     "Bounded enum (any/none); CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/17_plus/create.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/17_plus/create.sql',
      "'{{ data.streaming}}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/17_plus/create.sql',
      "'{{ data.origin}}'"), 1,
     "Bounded enum (any/none); CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/17_plus/update.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/17_plus/update.sql',
      "'{{ data.streaming }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/17_plus/update.sql',
      "'{{ data.origin }}'"), 1,
     "Bounded enum (any/none); CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/18_plus/update.sql',
      "'{{ data.sync }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/18_plus/update.sql',
      "'{{ data.streaming }}'"), 1,
     "Bounded enum from form schema; CREATE SUBSCRIPTION needs superuser."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/18_plus/update.sql',
      "'{{ data.origin }}'"), 1,
     "Bounded enum (any/none); CREATE SUBSCRIPTION needs superuser."),

    # ------------------------------------------------------------------
    # Subscription / publication name lookups. ``subname``, ``pubname``
    # and ``pname`` come from the browser tree (resolved from OID
    # references in pg_catalog), not from request body input.
    # ------------------------------------------------------------------
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/default/get_position.sql',
      "'{{ subname }}'"), 1,
     "Subscription name from pg_catalog via browser tree."),
    (('pgadmin/browser/server_groups/servers/databases/subscriptions/'
      'templates/subscriptions/sql/default/dependencies.sql',
      "'{{subname}}'"), 1,
     "Subscription name from pg_catalog via browser tree."),
    (('pgadmin/browser/server_groups/servers/databases/publications/'
      'templates/publications/pg/default/sql/get_position.sql',
      "'{{ pubname }}'"), 1,
     "Publication name from pg_catalog via browser tree."),
    (('pgadmin/browser/server_groups/servers/databases/publications/'
      'templates/publications/pg/default/sql/dependencies.sql',
      "'{{ pname }}'"), 1,
     "Publication name from pg_catalog via browser tree."),
    (('pgadmin/browser/server_groups/servers/databases/publications/'
      'templates/publications/ppas/default/sql/get_position.sql',
      "'{{ pubname }}'"), 1,
     "Publication name from pg_catalog via browser tree."),
    (('pgadmin/browser/server_groups/servers/databases/publications/'
      'templates/publications/ppas/default/sql/dependencies.sql',
      "'{{ pname }}'"), 1,
     "Publication name from pg_catalog via browser tree."),

    # ------------------------------------------------------------------
    # DBMS job scheduler ``CREATE`` templates emit lines that are entirely
    # inside SQL ``--`` line comments (display-only headers, never
    # executed by pgAdmin). Each scheduler entity has two such lines.
    # ------------------------------------------------------------------
    (('pgadmin/browser/server_groups/servers/databases/dbms_job_scheduler/'
      'dbms_jobs/templates/dbms_jobs/ppas/16_plus/create.sql',
      "'{{ job_name }}'"), 2,
     "Inside ``--`` SQL line comment (display header), not executed."),
    (('pgadmin/browser/server_groups/servers/databases/dbms_job_scheduler/'
      'dbms_schedules/templates/dbms_schedules/ppas/16_plus/create.sql',
      "'{{ schedule_name }}'"), 2,
     "Inside ``--`` SQL line comment (display header), not executed."),
    (('pgadmin/browser/server_groups/servers/databases/dbms_job_scheduler/'
      'dbms_programs/templates/dbms_programs/ppas/16_plus/create.sql',
      "'{{ program_name }}'"), 2,
     "Inside ``--`` SQL line comment (display header), not executed."),

    # ------------------------------------------------------------------
    # grant_wizard SQL templates emit hardcoded display/typing constants
    # (object_type, icon, prokind, relkind, node_type) that the wizard's
    # own handler supplies as fixed string literals — not user input.
    # ------------------------------------------------------------------
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/pg/default/sql/'
      'function.sql', "'{{ func_type }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/pg/default/sql/'
      'function.sql', "'{{ icon }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/pg/default/sql/'
      'view.sql', "'{{ ntype }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/pg/default/sql/'
      'view.sql', "'{{ node_type }}'"), 1,
     "Hardcoded pg_class.relkind char supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/pg/11_plus/sql/'
      'function.sql', "'{{ func_type }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/pg/11_plus/sql/'
      'function.sql', "'{{ icon }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/pg/11_plus/sql/'
      'function.sql', "'{{ kind }}'"), 1,
     "Hardcoded pg_proc.prokind char supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/default/sql/'
      'function.sql', "'{{ func_type }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/default/sql/'
      'function.sql', "'{{ icon }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/default/sql/'
      'view.sql', "'{{ ntype }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/default/sql/'
      'view.sql', "'{{ view_icon }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/default/sql/'
      'view.sql', "'{{ node_type }}'"), 1,
     "Hardcoded pg_class.relkind char supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/11_plus/sql/'
      'function.sql', "'{{ func_type }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/11_plus/sql/'
      'function.sql', "'{{ icon }}'"), 1,
     "Hardcoded display constant supplied by grant_wizard handler."),
    (('pgadmin/tools/grant_wizard/templates/grant_wizard/ppas/11_plus/sql/'
      'function.sql', "'{{ kind }}'"), 1,
     "Hardcoded pg_proc.prokind char supplied by grant_wizard handler."),

    # ------------------------------------------------------------------
    # search_objects: ``obj_type`` is one of the fixed object-kind strings
    # baked into the search handler's own dispatch table.
    # ------------------------------------------------------------------
    (('pgadmin/tools/search_objects/templates/search_objects/sql/ppas/'
      '11_plus/search.sql', "'{{ obj_type }}'"), 1,
     "Fixed object-kind enum supplied by search_objects handler."),
    (('pgadmin/tools/search_objects/templates/search_objects/sql/ppas/'
      '12_plus/search.sql', "'{{ obj_type }}'"), 1,
     "Fixed object-kind enum supplied by search_objects handler."),
    (('pgadmin/tools/search_objects/templates/search_objects/sql/ppas/'
      'default/search.sql', "'{{ obj_type }}'"), 1,
     "Fixed object-kind enum supplied by search_objects handler."),
]


def _scan_sql_templates():
    """Return Counter[(rel_path, fragment)] of every ``'{{ ... }}'``
    occurrence under SCAN_ROOT."""
    counter = Counter()
    for dirpath, _dirs, files in os.walk(SCAN_ROOT):
        for fname in files:
            if not fname.endswith('.sql'):
                continue
            full = os.path.join(dirpath, fname)
            rel = os.path.relpath(full, WEB_ROOT).replace(os.sep, '/')
            with open(full, encoding='utf-8') as fh:
                for line in fh:
                    for m in PATTERN.finditer(line):
                        counter[(rel, m.group(0))] += 1
    return counter


def _allowlist_counter():
    counter = Counter()
    for key, count, _reason in ALLOWLIST:
        counter[key] += count
    return counter


def _allowlist_reasons():
    return {key: reason for key, _count, reason in ALLOWLIST}


class SQLStringLiteralInterpolationLintTestCase(BaseTestGenerator):
    """Fail if any new ``'{{ ... }}'`` single-quote-wrapped Jinja
    interpolation appears in a SQL template without being either replaced
    with ``qtLiteral`` or added to ``ALLOWLIST`` above."""

    scenarios = [('Lint *.sql templates for unescaped Jinja literals',
                  dict())]

    def runTest(self):
        actual = _scan_sql_templates()
        expected = _allowlist_counter()
        reasons = _allowlist_reasons()

        new = []      # found in code, not allowlisted (or count too high)
        stale = []    # allowlisted, not found in code (or count too low)

        for key, n in actual.items():
            allowed = expected.get(key, 0)
            if n > allowed:
                new.append((key, n - allowed))

        for key, n in expected.items():
            present = actual.get(key, 0)
            if n > present:
                stale.append((key, n - present, reasons[key]))

        messages = []
        if new:
            lines = [
                ('FOUND unallowed single-quote-wrapped Jinja '
                 'interpolations. Replace with `{{ x|qtLiteral(conn) }}` '
                 '(no surrounding quotes) — and pass conn= to '
                 'render_template — or add an explicit ALLOWLIST entry '
                 'in test_sql_string_literal_lint.py with a reason.\n')
            ]
            for (rel, frag), n in sorted(new):
                lines.append('  + {} :: {} (x{})'.format(rel, frag, n))
            messages.append('\n'.join(lines))
        if stale:
            lines = [
                ('STALE ALLOWLIST entries (no longer present in code). '
                 'Remove them from test_sql_string_literal_lint.py.\n')
            ]
            for (rel, frag), n, reason in sorted(stale):
                lines.append('  - {} :: {} (x{})  // {}'
                             .format(rel, frag, n, reason))
            messages.append('\n'.join(lines))
        if messages:
            self.fail('\n\n'.join(messages))
