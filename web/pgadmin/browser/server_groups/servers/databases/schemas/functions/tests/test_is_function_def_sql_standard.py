##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from .. import FunctionView


class TestIsFunctionDefSqlStandard(BaseTestGenerator):
    """
    Unit tests for FunctionView._is_function_def_sql_standard.

    This guards against a regression (issue #10059) where a plain SQL
    function/procedure body that merely contained the substring "return"
    (e.g. a "RETURNING" clause) was wrongly detected as a SQL-standard
    body, causing the generated CREATE OR REPLACE statement to drop the
    "AS $BODY$ ... $BODY$" wrapper and fail with a syntax error.
    """

    scenarios = [
        ('SQL-standard BEGIN ATOMIC body is detected', dict(
            data=dict(lanname='sql',
                      prosrc='\nBEGIN ATOMIC\n  INSERT INTO t VALUES (1);\nEND'
                      ),
            expected=True
        )),
        ('SQL-standard RETURN body is detected', dict(
            data=dict(lanname='sql', prosrc='RETURN $1 + $2'),
            expected=True
        )),
        ('SQL-standard RETURN body with leading whitespace is detected',
         dict(
             data=dict(lanname='sql', prosrc='\n  return a;'),
             expected=True
         )),
        ('Plain SQL body with a RETURNING clause is not SQL-standard', dict(
            data=dict(lanname='sql',
                      prosrc='INSERT INTO t(a) VALUES (1) RETURNING a;'),
            expected=False
        )),
        ('Plain SQL body referencing a "returned" identifier is not '
         'SQL-standard', dict(
             data=dict(lanname='sql',
                       prosrc='SELECT my_returned_value FROM t;'),
             expected=False
         )),
        ('Plain SQL body is not SQL-standard', dict(
            data=dict(lanname='sql', prosrc='SELECT 1;'),
            expected=False
        )),
        ('Non-sql language is never SQL-standard', dict(
            data=dict(lanname='plpgsql',
                      prosrc='BEGIN\n  RETURN;\nEND;'),
            expected=False
        )),
        ('Empty body is not SQL-standard', dict(
            data=dict(lanname='sql', prosrc=''),
            expected=False
        )),
    ]

    def runTest(self):
        result = FunctionView._is_function_def_sql_standard(self.data)
        self.assertEqual(result, self.expected)
