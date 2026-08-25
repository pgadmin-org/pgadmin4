##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""End-to-end regression test for the CVE-2026-12045 bypass fix, driven
through the REAL /sqleditor/nlq/chat/<trans_id>/stream HTTP route.

The existing NLQ tests in test_nlq_chat.py all patch
``pgadmin.llm.chat.chat_with_database_stream`` directly, which stubs out
the entire tool-call loop and never touches ``execute_tool`` /
``execute_readonly_query`` in ``pgadmin.llm.tools.database``. That leaves
a gap: nothing exercises the actual production code path a real AI
Assistant request takes -- Flask route -> chat_with_database_stream's
tool-dispatch loop -> execute_tool -> execute_readonly_query ->
conn.execute_2darray -- to confirm prepare=True is still wired through
when the "chosen" query originates from an LLM tool call rather than a
direct Python call (as in test_database_tool_security.py's
ExecuteReadonlyQueryProtocolTestCase).

This test closes that gap without needing a real LLM API key: it patches
only ``pgadmin.llm.chat.get_llm_client`` (the same patch point the
project's own EXPLAIN-analysis and NLQ tests already use for other
scenarios) to return a fake client whose ``chat_stream()`` simulates the
model choosing to call ``execute_sql_query`` with the smuggled-COMMIT
payload from the Kai Aizen / SnailSploit report (2026-07-23). Everything
below that -- chat.py's real tool-dispatch loop, execute_tool,
execute_readonly_query -- runs for real. Only the DB connection object
itself is mocked (as in ExecuteReadonlyQueryProtocolTestCase), since a
real PostgreSQL connection isn't available in this test environment.
"""

import json
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.llm.models import LLMResponse, ToolCall, StopReason


BYPASS_PAYLOAD = (
    "SELECT '\\';COMMIT;CREATE TABLE pwn_marker(x int);SELECT 1 --'"
)


def _make_mock_llm_client(tool_query, final_text='Here is what I found.'):
    """A fake LLM client whose chat_stream() first requests a tool call
    with `tool_query`, then (once the tool result is fed back) ends the
    turn with `final_text`. Mirrors the shape client.chat_stream() is
    expected to yield: str chunks and/or a terminal LLMResponse.
    """
    state = {'iteration': 0}

    def chat_stream_side_effect(*_args, **_kwargs):
        state['iteration'] += 1
        if state['iteration'] == 1:
            yield LLMResponse(
                content='',
                tool_calls=[ToolCall(
                    id='tc-1',
                    name='execute_sql_query',
                    arguments={'query': tool_query},
                )],
                stop_reason=StopReason.TOOL_USE,
            )
        else:
            yield final_text
            yield LLMResponse(
                content=final_text,
                stop_reason=StopReason.END_TURN,
            )

    mock_client = MagicMock()
    mock_client.chat_stream.side_effect = chat_stream_side_effect
    return mock_client


class NLQToolDispatchProtocolTestCase(BaseTestGenerator):
    """Pins that a real request through /sqleditor/nlq/chat/.../stream,
    when the model chooses to call execute_sql_query with the
    backslash-quote smuggled-COMMIT payload, still reaches
    conn.execute_2darray with prepare=True -- through the full
    production dispatch path, not just a direct Python call.

    The DB connection is mocked (no real PostgreSQL available here), so
    this does not re-prove that PostgreSQL itself rejects the payload
    -- that is already covered by ExecuteReadonlyQueryProtocolTestCase
    (mock-based) and by manual verification against a live server. This
    test's job is narrower and complementary: prove the HTTP route
    really drives execute_readonly_query with this exact attacker-
    controlled string and that prepare=True is not lost or made
    conditional anywhere along the way.
    """

    scenarios = [
        ('Tool call with bypass payload reaches DB layer with '
         'prepare=True', dict(
             mock_execute_2darray_result=(True, {
                 'columns': [], 'rows': []
             }),
         )),
        ('Tool call failure (simulating real Postgres Parse-step '
         'rejection) is surfaced, not a crash', dict(
             mock_execute_2darray_result=(
                 False,
                 'cannot insert multiple commands into a prepared '
                 'statement'
             ),
         )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        trans_id = 12345

        mock_trans_obj = MagicMock()
        mock_trans_obj.sid = 1
        mock_trans_obj.did = 1

        mock_session_conn = MagicMock()
        mock_session_conn.connected.return_value = True

        mock_session = {'sid': 1, 'did': 1}

        # The connection object *inside* pgadmin.llm.tools.database --
        # this is what execute_2darray(prepare=True) is called on.
        mock_llm_conn = MagicMock()
        mock_llm_conn.execute_void.return_value = (True, None)
        mock_llm_conn.execute_2darray.return_value = \
            self.mock_execute_2darray_result

        mock_client = _make_mock_llm_client(BYPASS_PAYLOAD)

        patches = [
            patch('pgadmin.llm.utils.is_llm_enabled', return_value=True),
            patch('pgadmin.llm.chat.is_llm_available', return_value=True),
            patch(
                'pgadmin.llm.chat.get_llm_client',
                return_value=mock_client
            ),
            patch(
                'pgadmin.tools.sqleditor.check_transaction_status',
                return_value=(
                    True, None, mock_session_conn, mock_trans_obj,
                    mock_session
                )
            ),
            patch(
                'pgadmin.llm.tools.database._get_connection',
                return_value=(MagicMock(), mock_llm_conn)
            ),
            patch(
                'pgadmin.llm.tools.database._connect_readonly',
                return_value=(True, None)
            ),
            patch(
                'pgadmin.authenticate.mfa.utils.mfa_required',
                lambda f: f
            ),
        ]

        for p in patches:
            p.start()

        try:
            response = self.tester.post(
                f'/sqleditor/nlq/chat/{trans_id}/stream',
                data=json.dumps({'message': 'please run my query'}),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            self.assertIn('text/event-stream', response.content_type)

            # Consume the stream so the generator (and therefore the
            # real tool-dispatch loop) actually executes.
            raw = response.data.decode('utf-8')

            # The route must not blow up with an unhandled exception --
            # either a 'complete' event (tool succeeded from the
            # model's perspective) or the loop simply continuing to a
            # final answer after a tool-error message is acceptable;
            # what must NOT happen is the request dying before
            # execute_2darray is ever reached.
            events = []
            for line in raw.split('\n'):
                if line.startswith('data: '):
                    try:
                        events.append(json.loads(line[6:]))
                    except json.JSONDecodeError:
                        pass
            event_types = [e.get('type') for e in events]
            self.assertIn('complete', event_types)

            # The actual security-critical assertion: regardless of
            # whether the simulated DB call "succeeded" or "failed",
            # it was invoked with the attacker's exact payload and
            # prepare=True -- proving the fix is wired all the way
            # through the real HTTP route, not bypassed by some
            # earlier short-circuit.
            mock_llm_conn.execute_2darray.assert_called_once()
            call_args, call_kwargs = \
                mock_llm_conn.execute_2darray.call_args
            # execute_readonly_query wraps SELECT-prefixed queries with
            # a LIMIT subquery before executing (see database.py) -- the
            # attacker's payload must still be present verbatim inside
            # that wrapper, and it's the wrapped string that actually
            # gets sent with prepare=True.
            self.assertIn(BYPASS_PAYLOAD, call_args[0])
            self.assertTrue(
                call_kwargs.get('prepare') is True,
                "The real /sqleditor/nlq/chat/.../stream route must "
                "still invoke execute_2darray(query, prepare=True) "
                "for an LLM-chosen query, even when that query is the "
                "backslash-quote smuggled-COMMIT bypass payload."
            )
        finally:
            for p in patches:
                p.stop()

    def tearDown(self):
        pass
