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
``_validate_readonly_query``.  It rejects the original Isaac Chen
report from 2026-06-08 (a transaction-control statement such as COMMIT,
END, ROLLBACK, ABORT followed by writes) whenever sqlparse and
PostgreSQL agree on where the statement boundary is.

``_validate_readonly_query`` is a fast pre-filter, not the security
boundary -- see ``ValidateReadonlyQueryLexerDifferentialTestCase``
below and the module docstring in ``database.py`` for why sqlparse
cannot be the load-bearing check, and ``ExecuteReadonlyQueryProtocolTestCase``
for the protocol-level enforcement that actually is (Kai Aizen /
SnailSploit report, 2026-07-23, on the bf4792444446 fix).

Most of these tests are pure unit tests (no DB, no Flask client) --
they exercise the validator directly. Anything that reaches the
connection layer is already too late for validator, which is exactly
why the protocol-level fix exists.
"""

from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.llm.tools.database import (
    DatabaseToolError,
    _validate_readonly_query,
    _connect_readonly,
    execute_readonly_query,
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
        # Parser corner cases lifted from Dave's v2 patch -- exercise
        # whitespace / comment / paren handling around the leading
        # keyword and confirm semicolons inside strings don't fool
        # the statement splitter.
        ('SELECT with leading whitespace', dict(
            query='   \n\tSELECT 1',
        )),
        ('SELECT with trailing semicolon + whitespace', dict(
            query='SELECT 1;   \n',
        )),
        ('SELECT with leading line comment', dict(
            query='-- comment\nSELECT 1',
        )),
        ('SELECT containing semicolon in string literal', dict(
            query="SELECT ';' AS col",
        )),
        ('Parenthesised SELECT with UNION', dict(
            query='(SELECT 1) UNION (SELECT 2)',
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

        # --- Sandbox-weakening / RO-bypass single statements ---
        # These are not just generic writes -- they directly attack
        # the BEGIN TRANSACTION READ ONLY wrapper. Pinning them here
        # so a future allowlist edit that lets any of these through
        # is caught loudly. (Imported from Dave's v2 patch.)
        ('Bare COMMIT', dict(
            query='COMMIT',
            expected_code='INVALID_QUERY',
        )),
        ('Bare END', dict(
            query='END',
            expected_code='INVALID_QUERY',
        )),
        ('Bare ROLLBACK', dict(
            query='ROLLBACK',
            expected_code='INVALID_QUERY',
        )),
        ('Bare ABORT', dict(
            query='ABORT',
            expected_code='INVALID_QUERY',
        )),
        ('Bare BEGIN', dict(
            query='BEGIN',
            expected_code='INVALID_QUERY',
        )),
        ('START TRANSACTION', dict(
            query='START TRANSACTION',
            expected_code='INVALID_QUERY',
        )),
        ('SAVEPOINT', dict(
            query='SAVEPOINT foo',
            expected_code='INVALID_QUERY',
        )),
        ('SET LOCAL transaction_read_only off', dict(
            query='SET LOCAL transaction_read_only = off',
            expected_code='INVALID_QUERY',
        )),
        ('SET SESSION default_transaction_read_only off', dict(
            query='SET SESSION default_transaction_read_only = off',
            expected_code='INVALID_QUERY',
        )),
        ('DISCARD ALL', dict(
            query='DISCARD ALL',
            expected_code='INVALID_QUERY',
        )),

        # --- Multi-statement with allowed leading keyword + write ---
        # Closer to a real attack shape than the trailing-COMMIT PoC:
        # legitimate-looking SELECT/WITH prefix, then transaction
        # teardown, then DML. Must still be rejected by the
        # single-statement check.
        ('Multi-stmt SELECT prefix then ROLLBACK + DELETE', dict(
            query='SELECT 1; ROLLBACK; DELETE FROM x',
            expected_code='INVALID_QUERY',
        )),
        ('Multi-stmt WITH prefix then ROLLBACK', dict(
            query='WITH cte AS (SELECT 1) SELECT * FROM cte; ROLLBACK',
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


class ValidateReadonlyQueryLexerDifferentialTestCase(BaseTestGenerator):
    """Pins a KNOWN, ACCEPTED limitation of the sqlparse-based validator.

    sqlparse's string-literal lexing does not always match PostgreSQL's.
    Under standard_conforming_strings = on (the default), a backslash
    inside a '...'-quoted literal is an ordinary character to PostgreSQL
    but sqlparse treats it as escaping the following quote, so it keeps
    reading past what PostgreSQL considers the end of the string. That
    lets a payload like the one below smuggle ``;COMMIT;<write>;`` past
    the "exactly one statement" check disguised as a single string
    literal, even though PostgreSQL executes it as four statements --
    the report from Kai Aizen / SnailSploit (2026-07-23) against the
    bf4792444446 fix.

    This is NOT something ``_validate_readonly_query`` can be made to
    catch in general (it would require re-implementing PostgreSQL's
    lexer, including its dependence on server-side GUCs like
    standard_conforming_strings). The test below asserts the validator
    accepts the payload -- documenting that this is expected -- and
    exists only to point at where the real protection lives: see
    ExecuteReadonlyQueryProtocolTestCase, which pins that the query is
    always executed with prepare=True. That forces PostgreSQL's own
    Parse step -- not a client-side approximation of it -- to reject
    any text containing more than one statement, regardless of how it
    is lexed.
    """

    scenarios = [
        ('Backslash-quote smuggled COMMIT + DDL', dict(
            query=(
                "SELECT '\\';COMMIT;CREATE TABLE pwn(x int);"
                "SELECT 1 --'"
            ),
        )),
        ('Backslash-quote smuggled COMMIT + COPY TO PROGRAM', dict(
            query=(
                "SELECT '\\';COMMIT;COPY (SELECT 1) TO PROGRAM 'id';"
                "SELECT 1 --'"
            ),
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        # Documents current, accepted behavior -- must NOT raise.
        # If this ever starts raising, _validate_readonly_query has
        # changed in a way that may be worth understanding, but the
        # query is still safe only because of prepare=True downstream;
        # don't mistake a change here for the security fix itself.
        keyword = _validate_readonly_query(self.query)
        self.assertIsNone(keyword)


class ExecuteReadonlyQueryProtocolTestCase(BaseTestGenerator):
    """Pins that execute_readonly_query always runs the LLM's query with
    prepare=True.

    This is the actual load-bearing defense against statement-boundary
    smuggling (see ValidateReadonlyQueryLexerDifferentialTestCase):
    prepare=True forces psycopg3's extended query protocol, whose Parse
    step is answered by PostgreSQL's own parser and rejects a query
    string containing more than one SQL statement -- independent of
    sqlparse, and independent of any particular payload shape. Verified
    end-to-end against a live PostgreSQL 16 instance during the
    SnailSploit report triage (2026-07-23): the smuggled-COMMIT payload
    that _validate_readonly_query accepts is rejected by PostgreSQL's
    Parse step with "cannot insert multiple commands into a prepared
    statement" once prepare=True is set, both before and after the
    max_rows LIMIT-wrapping applied to SELECT queries.

    This test mocks the connection layer (no DB) and only pins the
    wiring: that prepare=True is passed on every call, not just for
    inputs that look suspicious. A future refactor that drops the
    keyword argument, or only sets it conditionally, must fail this
    test.
    """

    scenarios = [
        ('Benign SELECT', dict(
            query='SELECT 1',
        )),
        ('Backslash-quote smuggled COMMIT + DDL', dict(
            query=(
                "SELECT '\\';COMMIT;CREATE TABLE pwn(x int);"
                "SELECT 1 --'"
            ),
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        mock_manager = MagicMock()
        mock_conn = MagicMock()
        mock_conn.execute_void.return_value = (True, None)
        mock_conn.execute_2darray.return_value = (
            True, {'columns': [], 'rows': []}
        )

        with patch(
            'pgadmin.llm.tools.database._get_connection',
            return_value=(mock_manager, mock_conn)
        ), patch(
            'pgadmin.llm.tools.database._connect_readonly',
            return_value=(True, None)
        ):
            execute_readonly_query(sid=1, did=1, query=self.query)

        mock_conn.execute_2darray.assert_called_once()
        _args, kwargs = mock_conn.execute_2darray.call_args
        self.assertTrue(
            kwargs.get('prepare') is True,
            "execute_readonly_query must run the LLM-supplied query "
            "with prepare=True so PostgreSQL's own Parse step -- not "
            "the sqlparse pre-filter -- enforces the single-statement "
            "guarantee."
        )


class ConnectReadonlyForcesPrepareThresholdTestCase(BaseTestGenerator):
    """Pins that _connect_readonly forces conn.conn.prepare_threshold = 0.

    prepare=True on the execute_2darray call is necessary but NOT
    sufficient: psycopg3's PrepareManager.get() returns Prepare.NO --
    silently falling back to the multi-statement-capable simple query
    protocol -- whenever the connection's prepare_threshold is None,
    *before* it even inspects the prepare argument. pgAdmin's per-server
    "Prepare threshold" field defaults to blank/None, so on a default
    server the prepare=True guarantee never engages and the
    CVE-2026-12045 smuggled-COMMIT bypass stays live (Kai Aizen /
    SnailSploit follow-up, verified live against PostgreSQL on
    2026-07-24).

    _connect_readonly() therefore forces prepare_threshold = 0 on the
    LLM's single-use connection. This test pins that override so a
    future refactor that drops it -- reopening the bypass -- fails here,
    without needing a live server.
    """

    def setUp(self):
        pass

    def runTest(self):
        mock_manager = MagicMock()
        mock_conn = MagicMock()
        mock_conn.connected.return_value = True
        mock_conn.execute_void.return_value = (True, None)
        # Emulate pgAdmin's default: extended protocol disabled.
        mock_conn.conn.prepare_threshold = None

        status, msg = _connect_readonly(
            mock_manager, mock_conn, 'llm_test_conn')

        self.assertTrue(status, msg)
        self.assertEqual(
            mock_conn.conn.prepare_threshold, 0,
            "_connect_readonly must force prepare_threshold=0 on the "
            "LLM connection; otherwise psycopg3 ignores prepare=True "
            "(when the server's Prepare threshold is blank/None, the "
            "default) and falls back to the multi-statement-capable "
            "simple query protocol, reopening CVE-2026-12045."
        )
