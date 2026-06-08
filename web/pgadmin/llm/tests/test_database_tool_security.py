##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Security regression tests for execute_sql_query input validation.

These tests pin the multi-statement / leading-keyword guard added in
``_validate_readonly_query``.  The validator is the load-bearing
defense against an attacker escaping the ``BEGIN TRANSACTION READ
ONLY`` wrapper by emitting a transaction-control statement (COMMIT,
END, ROLLBACK, ABORT) followed by writes -- the original Isaac Chen
report from 2026-06-08.

The tests are pure unit tests (no DB, no Flask client) -- they exercise
the validator directly.  Anything that reaches the connection layer is
already too late.
"""

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.llm.tools.database import (
    DatabaseToolError,
    _validate_readonly_query,
)


class ValidateReadonlyQueryAcceptTestCase(BaseTestGenerator):
    """Queries that MUST be accepted by the validator.

    These cover the six allowlisted leading keywords plus a handful of
    sqlparse edge cases (leading paren, leading block comment, dollar-
    quoted literal containing ``;``, trailing comment-only "statement")
    where over-eager rejection would break legitimate LLM usage.
    """

    scenarios = [
        ('Plain SELECT', dict(
            query='SELECT 1',
        )),
        ('SELECT with semicolon', dict(
            query='SELECT 1;',
        )),
        ('Leading paren SELECT', dict(
            query='(SELECT 1)',
        )),
        ('Leading block comment then SELECT', dict(
            query='/* hint */ SELECT 1',
        )),
        ('SELECT followed by line comment', dict(
            query='SELECT 1 -- trailing',
        )),
        ('SELECT followed by comment-only second statement', dict(
            query='SELECT 1; -- trailing',
        )),
        ('WITH plain CTE', dict(
            query='WITH x AS (SELECT 1) SELECT * FROM x',
        )),
        ('WITH RECURSIVE', dict(
            query=(
                'WITH RECURSIVE t(n) AS ('
                '  SELECT 1 UNION ALL SELECT n+1 FROM t WHERE n < 3'
                ') SELECT * FROM t'
            ),
        )),
        ('EXPLAIN SELECT', dict(
            query='EXPLAIN SELECT 1',
        )),
        ('EXPLAIN ANALYZE SELECT', dict(
            query='EXPLAIN ANALYZE SELECT 1',
        )),
        ('EXPLAIN with options', dict(
            query='EXPLAIN (ANALYZE, BUFFERS) SELECT 1',
        )),
        ('SHOW GUC', dict(
            query='SHOW search_path',
        )),
        ('VALUES list', dict(
            query='VALUES (1), (2), (3)',
        )),
        ('TABLE statement', dict(
            query='TABLE pg_catalog.pg_class',
        )),
        ('Lowercase keyword', dict(
            query='select 1',
        )),
        ('Mixed case keyword', dict(
            query='SeLeCt 1',
        )),
        ('Dollar-quoted string containing semicolon', dict(
            # Single SELECT whose literal contains ; -- the validator
            # must NOT mistake this for a multi-statement payload.
            query="SELECT $$;$$",
        )),
        ('Tagged dollar quote containing semicolon', dict(
            query="SELECT $tag$;$tag$",
        )),
        ('Standard string with doubled quote', dict(
            query="SELECT 'a''b'",
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        # Should not raise.
        _validate_readonly_query(self.query)


class ValidateReadonlyQueryRejectTestCase(BaseTestGenerator):
    """Queries that MUST be rejected by the validator.

    The first block reproduces the Isaac Chen PoC payloads (multi-
    statement with a leading transaction-control keyword to close the
    wrapping READ ONLY transaction).  The remaining scenarios pin the
    leading-keyword allowlist against every common write / state-
    changing top-level statement.
    """

    scenarios = [
        # --- Isaac Chen PoC family: transaction control + multi-stmt ---
        ('PoC: COMMIT then COPY TO PROGRAM', dict(
            query=(
                "COMMIT; "
                "COPY (SELECT 1) TO PROGRAM 'id > /tmp/id.txt 2>&1'; "
                "SELECT 1"
            ),
            expected_code='INVALID_QUERY',
        )),
        ('PoC: COMMIT then DELETE', dict(
            query='COMMIT; DELETE FROM t; SELECT 1',
            expected_code='INVALID_QUERY',
        )),
        ('PoC: END then DELETE', dict(
            query='END; DELETE FROM t; SELECT 1',
            expected_code='INVALID_QUERY',
        )),
        ('PoC: ROLLBACK then INSERT', dict(
            query="ROLLBACK; INSERT INTO t VALUES (1); SELECT 1",
            expected_code='INVALID_QUERY',
        )),
        ('PoC: ABORT then UPDATE', dict(
            query='ABORT; UPDATE t SET c = 1; SELECT 1',
            expected_code='INVALID_QUERY',
        )),
        ('PoC: SET then DELETE', dict(
            query=(
                "SET role superuser; "
                "DELETE FROM t; "
                "SELECT 1"
            ),
            expected_code='INVALID_QUERY',
        )),
        ('PoC: BEGIN then SELECT', dict(
            query='BEGIN; SELECT 1',
            expected_code='INVALID_QUERY',
        )),
        ('PoC: trailing COMMIT after SELECT', dict(
            query='SELECT 1; COMMIT',
            expected_code='INVALID_QUERY',
        )),

        # --- Multi-statement: comments don't smuggle past the count ---
        ('Multi-statement masked by block comment', dict(
            query='SELECT 1; /* hide */ DROP TABLE t',
            expected_code='INVALID_QUERY',
        )),
        ('Multi-statement masked by line comment', dict(
            query='SELECT 1; -- ignore\nDROP TABLE t',
            expected_code='INVALID_QUERY',
        )),

        # --- Disallowed leading keywords (single-statement) ---
        ('Leading UPDATE', dict(
            query='UPDATE t SET c = 1',
            expected_code='INVALID_QUERY',
        )),
        ('Leading DELETE', dict(
            query='DELETE FROM t',
            expected_code='INVALID_QUERY',
        )),
        ('Leading INSERT', dict(
            query='INSERT INTO t VALUES (1)',
            expected_code='INVALID_QUERY',
        )),
        ('Leading MERGE', dict(
            query=(
                'MERGE INTO t USING s ON t.id = s.id '
                'WHEN MATCHED THEN UPDATE SET c = s.c'
            ),
            expected_code='INVALID_QUERY',
        )),
        ('Leading CALL', dict(
            query="CALL bad_proc()",
            expected_code='INVALID_QUERY',
        )),
        ('Leading COPY TO PROGRAM', dict(
            query="COPY (SELECT 1) TO PROGRAM 'id'",
            expected_code='INVALID_QUERY',
        )),
        ('Leading DO block', dict(
            query="DO $$ BEGIN PERFORM 1; END $$",
            expected_code='INVALID_QUERY',
        )),
        ('Leading SET', dict(
            query='SET role superuser',
            expected_code='INVALID_QUERY',
        )),
        ('Leading RESET', dict(
            query='RESET role',
            expected_code='INVALID_QUERY',
        )),
        ('Leading CREATE', dict(
            query='CREATE TABLE t (c int)',
            expected_code='INVALID_QUERY',
        )),
        ('Leading DROP', dict(
            query='DROP TABLE t',
            expected_code='INVALID_QUERY',
        )),
        ('Leading ALTER', dict(
            query='ALTER TABLE t ADD COLUMN c int',
            expected_code='INVALID_QUERY',
        )),
        ('Leading TRUNCATE', dict(
            query='TRUNCATE t',
            expected_code='INVALID_QUERY',
        )),
        ('Leading LOCK', dict(
            query='LOCK TABLE t',
            expected_code='INVALID_QUERY',
        )),
        ('Leading GRANT', dict(
            query='GRANT ALL ON t TO public',
            expected_code='INVALID_QUERY',
        )),
        ('Leading REVOKE', dict(
            query='REVOKE ALL ON t FROM public',
            expected_code='INVALID_QUERY',
        )),
        ('Leading NOTIFY', dict(
            query="NOTIFY chan, 'msg'",
            expected_code='INVALID_QUERY',
        )),
        ('Leading LISTEN', dict(
            query='LISTEN chan',
            expected_code='INVALID_QUERY',
        )),
        ('Leading PREPARE', dict(
            query='PREPARE p AS SELECT 1',
            expected_code='INVALID_QUERY',
        )),
        ('Leading EXECUTE', dict(
            query='EXECUTE p',
            expected_code='INVALID_QUERY',
        )),
        ('Leading REFRESH MATERIALIZED VIEW', dict(
            query='REFRESH MATERIALIZED VIEW mv',
            expected_code='INVALID_QUERY',
        )),
        ('Leading VACUUM', dict(
            query='VACUUM t',
            expected_code='INVALID_QUERY',
        )),
        ('Leading ANALYZE (standalone)', dict(
            # 'ANALYZE foo' is a maintenance command, not EXPLAIN
            # ANALYZE -- must be rejected because the validator looks
            # at the *first* keyword only.
            query='ANALYZE t',
            expected_code='INVALID_QUERY',
        )),
        ('Leading CHECKPOINT', dict(
            query='CHECKPOINT',
            expected_code='INVALID_QUERY',
        )),
        ('Leading CLUSTER', dict(
            query='CLUSTER t',
            expected_code='INVALID_QUERY',
        )),
        ('Leading REINDEX', dict(
            query='REINDEX TABLE t',
            expected_code='INVALID_QUERY',
        )),

        # --- Empty / degenerate inputs ---
        ('Empty string', dict(
            query='',
            expected_code='INVALID_QUERY',
        )),
        ('Whitespace only', dict(
            query='   \n\t  ',
            expected_code='INVALID_QUERY',
        )),
        ('Only semicolons', dict(
            query=';;;',
            expected_code='INVALID_QUERY',
        )),
        ('Only a block comment', dict(
            query='/* nothing here */',
            expected_code='INVALID_QUERY',
        )),
        ('Quoted identifier "SELECT" is not the keyword', dict(
            # PostgreSQL: references a column/table named SELECT.
            # The validator must NOT treat the quoted identifier as
            # the allowlisted keyword.
            query='"SELECT" 1',
            expected_code='INVALID_QUERY',
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        try:
            _validate_readonly_query(self.query)
        except DatabaseToolError as e:
            self.assertEqual(e.code, self.expected_code)
            return
        self.fail(
            f"Validator accepted query that should have been "
            f"rejected: {self.query!r}"
        )
