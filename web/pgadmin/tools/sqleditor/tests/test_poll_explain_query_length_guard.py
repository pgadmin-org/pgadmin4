##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for a review comment on PR #10321 (pgAdmin issue
#8991): poll()'s error-handling branch built the 'explain_query_length'
value with::

    get_explain_query_length(conn._Connection__async_cursor._query)
    if conn._Connection__async_cursor else 0

which only guarded against the cached async cursor itself being falsy,
not against its ``_query`` attribute being ``None``. PR #10321's own fix
runs BEGIN/COMMIT/ROLLBACK through a throwaway plain cursor under
"server cursor" mode; once that has happened the cached async cursor
that poll() sees next can be a cursor that has not yet executed a real
statement, so ``_query`` is still ``None``. get_explain_query_length()
then immediately does ``query_obj.query.decode()``, and with
``query_obj`` being ``None`` that crashes with::

    AttributeError: 'NoneType' object has no attribute 'query'

turning any query error that follows a commit under "server cursor"
mode into an unhandled 500 and leaving the Query Tool unusable, instead
of the normal JSON error response."""

import json
import secrets
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator


class TestPollExplainQueryLengthGuard(BaseTestGenerator):
    """poll() must not crash while building 'explain_query_length' when
    the cached async cursor has not yet executed any statement."""

    scenarios = [
        ('Cached async cursor has not executed a statement yet '
         '(_query is None) - poll() must not crash', dict())
    ]

    def runTest(self):
        trans_id = secrets.choice(range(1, 9999999))

        # A cursor left over from execute_void()'s throwaway plain
        # cursor (or a freshly (re)created server-side cursor) that has
        # not executed a real statement yet - exactly the state PR
        # #10321's own fix can leave behind after a commit under
        # "server cursor" mode.
        async_cursor = MagicMock()
        async_cursor._query = None

        conn = MagicMock()
        conn.poll.return_value = (False, 'some query error')
        conn.connected.return_value = True
        conn.messages.return_value = []
        conn.transaction_status.return_value = 0
        conn._Connection__async_cursor = async_cursor

        trans_obj = MagicMock()
        trans_obj.get_thread_native_id.return_value = None

        session_obj = {}

        with patch(
            'pgadmin.tools.sqleditor.check_transaction_status',
            return_value=(True, None, conn, trans_obj, session_obj)
        ):
            response = self.tester.get(
                '/sqleditor/poll/{0}'.format(trans_id))

        # Before the fix this either raised AttributeError outright, or
        # (via the app's generic exception handler) came back as a 500
        # whose errormsg was the raw AttributeError text instead of the
        # intended query-error response.
        response_text = response.data.decode('utf-8')
        self.assertNotIn(
            "'NoneType' object has no attribute 'query'", response_text)

        response_data = json.loads(response_text)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response_data['errormsg'], 'some query error')
        self.assertEqual(
            response_data['data']['explain_query_length'], 0)
