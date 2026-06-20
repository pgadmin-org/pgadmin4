##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test: ``qtLiteral`` must not silently degrade to the raw,
unescaped input value when the inner ``psycopg.sql.Literal(...)
.as_string(conn)`` call raises.

Historical behaviour was:

    res = value          # raw input held as the default
    try:
        ...
        res = Literal(value).as_string(conn).strip()
    except Exception:
        print(...)       # swallowed — `res` stays as the raw value

That is the same SQL-injection sink the missing-``conn`` fail-fast
guards against, just gated on a different failure mode (psycopg
inability to adapt a value rather than absence of a connection). This
test exercises the inner-except path with an object that ``psycopg.sql
.Literal`` cannot adapt, and asserts the call raises rather than
returning the raw object.
"""

from pgadmin.utils.driver import get_driver
from pgadmin.utils.route import BaseTestGenerator
from config import PG_DEFAULT_DRIVER


class _Unadaptable:
    """Custom object psycopg has no registered adapter for. The
    ``psycopg.sql.Literal(...).as_string(conn)`` call must raise on
    this — it has no idea how to render the value as a SQL literal."""

    def __repr__(self):
        return '<_Unadaptable>'


class _MinimalConn:
    """Stand-in for a real psycopg Connection. The driver's qtLiteral
    sees this as truthy (so the missing-conn fail-fast is bypassed)
    and dereferences `.conn` to the psycopg-side connection. We set
    that to None to ensure the inner Literal.as_string call raises
    (psycopg requires a real context to render adapted SQL)."""

    conn = None

    def __bool__(self):
        return True


class QtLiteralRaisesOnUnadaptableValueTestCase(BaseTestGenerator):
    """The inner ``psycopg.sql.Literal(...).as_string(conn)`` failure
    path must propagate — not silently return the raw value."""

    scenarios = [
        ('Unadaptable Python object surfaces as an exception',
         dict(value=_Unadaptable())),
    ]

    def runTest(self):
        driver = get_driver(PG_DEFAULT_DRIVER)
        with self.assertRaises(Exception) as ctx:
            driver.qtLiteral(self.value, _MinimalConn())

        # And specifically: the original value must NOT be returned —
        # if it were, the exception would not have been raised.
        # The ``with self.assertRaises`` block guarantees a raise; this
        # assertion documents the contract that the call site relies
        # on (no silent unescaped passthrough).
        self.assertNotIsInstance(
            ctx.exception, type(None),
            msg='qtLiteral must raise on unadaptable input, not '
                'silently return it.'
        )
