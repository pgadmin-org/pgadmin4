##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the NLQ (Natural Language Query) chat endpoint."""

import json
import re
from unittest.mock import patch, MagicMock

from pgadmin.utils.route import BaseTestGenerator


class NLQChatTestCase(BaseTestGenerator):
    """Test cases for NLQ chat streaming endpoint"""

    scenarios = [
        ('NLQ Chat - LLM Disabled', dict(
            llm_enabled=False,
            expected_error=True,
            error_contains='AI features are not configured'
        )),
        ('NLQ Chat - Invalid Transaction', dict(
            llm_enabled=True,
            valid_transaction=False,
            expected_error=True,
            error_contains='Transaction ID'
        )),
        ('NLQ Chat - Empty Message', dict(
            llm_enabled=True,
            valid_transaction=True,
            message='',
            expected_error=True,
            error_contains='provide a message'
        )),
        ('NLQ Chat - Success', dict(
            llm_enabled=True,
            valid_transaction=True,
            message='Find all users',
            expected_error=False,
            mock_response=(
                'Here are all users:\n\n'
                '```sql\nSELECT * FROM users;\n```\n\n'
                'This retrieves all rows from the users table.'
            )
        )),
        ('NLQ Chat - With History', dict(
            llm_enabled=True,
            valid_transaction=True,
            message='Now filter by active users',
            history=[
                {'role': 'user', 'content': 'Find all users'},
                {'role': 'assistant',
                 'content': '{"sql": "SELECT * FROM users;", '
                            '"explanation": "Gets all users"}'},
            ],
            expected_error=False,
            mock_response=(
                '{"sql": "SELECT * FROM users WHERE active = true;", '
                '"explanation": "Gets active users"}'
            )
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test NLQ chat endpoint"""
        trans_id = 12345

        # Build the mock chain
        patches = []

        # Mock LLM availability (patch where it's imported from)
        mock_llm_enabled = patch(
            'pgadmin.llm.utils.is_llm_enabled',
            return_value=self.llm_enabled
        )
        patches.append(mock_llm_enabled)

        # Mock check_transaction_status
        if hasattr(self, 'valid_transaction') and self.valid_transaction:
            mock_trans_obj = MagicMock()
            mock_trans_obj.sid = 1
            mock_trans_obj.did = 1

            mock_conn = MagicMock()
            mock_conn.connected.return_value = True

            mock_session = {'sid': 1, 'did': 1}

            mock_check_trans = patch(
                'pgadmin.tools.sqleditor.check_transaction_status',
                return_value=(
                    True, None, mock_conn, mock_trans_obj, mock_session
                )
            )
        else:
            mock_check_trans = patch(
                'pgadmin.tools.sqleditor.check_transaction_status',
                return_value=(
                    False, 'Transaction ID not found', None, None, None
                )
            )
        patches.append(mock_check_trans)

        # Mock chat_with_database_stream
        mock_chat_patcher = None
        if hasattr(self, 'mock_response'):
            def mock_stream_gen(*args, **kwargs):
                yield self.mock_response
                yield ('complete', self.mock_response, [])
            mock_chat_patcher = patch(
                'pgadmin.llm.chat.chat_with_database_stream',
                side_effect=mock_stream_gen
            )
            patches.append(mock_chat_patcher)

        # Mock CSRF protection
        mock_csrf = patch(
            'pgadmin.authenticate.mfa.utils.mfa_required',
            lambda f: f
        )
        patches.append(mock_csrf)

        # Start all patches
        started_mocks = []
        for p in patches:
            m = p.start()
            started_mocks.append(m)

        try:
            # Make request
            message = getattr(self, 'message', 'test query')
            request_data = {'message': message}
            if hasattr(self, 'history'):
                request_data['history'] = self.history
            response = self.tester.post(
                f'/sqleditor/nlq/chat/{trans_id}/stream',
                data=json.dumps(request_data),
                content_type='application/json',
                follow_redirects=True
            )

            if self.expected_error:
                # For error cases, we expect JSON response
                if response.status_code == 200 and \
                   response.content_type == 'application/json':
                    data = json.loads(response.data)
                    self.assertFalse(data.get('success', True))
                    if hasattr(self, 'error_contains'):
                        self.assertIn(
                            self.error_contains,
                            data.get('errormsg', '')
                        )
            else:
                # For success, we expect SSE stream
                self.assertEqual(response.status_code, 200)
                self.assertIn('text/event-stream', response.content_type)

                # Consume the SSE stream so the generator executes
                # fully (including the chat_with_database_stream call)
                _ = response.data

        finally:
            # Stop all patches
            for p in patches:
                p.stop()

    def tearDown(self):
        pass


class NLQSystemPromptTestCase(BaseTestGenerator):
    """Test cases for NLQ system prompt"""

    scenarios = [
        ('NLQ Prompt - Import', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test NLQ system prompt can be imported"""
        from pgadmin.llm.prompts.nlq import NLQ_SYSTEM_PROMPT

        # Verify prompt is a non-empty string
        self.assertIsInstance(NLQ_SYSTEM_PROMPT, str)
        self.assertGreater(len(NLQ_SYSTEM_PROMPT), 100)

        # Verify key content is present
        self.assertIn('PostgreSQL', NLQ_SYSTEM_PROMPT)
        self.assertIn('SQL', NLQ_SYSTEM_PROMPT)
        self.assertIn('get_database_schema', NLQ_SYSTEM_PROMPT)

    def tearDown(self):
        pass


class NLQSqlExtractionTestCase(BaseTestGenerator):
    """Test cases for SQL extraction from markdown responses"""

    scenarios = [
        ('SQL Extraction - Single SQL block', dict(
            response_text=(
                'Here is the query:\n\n'
                '```sql\nSELECT * FROM users;\n```\n\n'
                'This returns all users.'
            ),
            expected_sql='SELECT * FROM users'
        )),
        ('SQL Extraction - Multiple SQL blocks', dict(
            response_text=(
                'First get users:\n\n'
                '```sql\nSELECT * FROM users;\n```\n\n'
                'Then get orders:\n\n'
                '```sql\nSELECT * FROM orders;\n```'
            ),
            expected_sql='SELECT * FROM users;\n\nSELECT * FROM orders'
        )),
        ('SQL Extraction - pgsql language tag', dict(
            response_text='```pgsql\nSELECT 1;\n```',
            expected_sql='SELECT 1'
        )),
        ('SQL Extraction - postgresql language tag', dict(
            response_text='```postgresql\nSELECT 1;\n```',
            expected_sql='SELECT 1'
        )),
        ('SQL Extraction - No SQL blocks', dict(
            response_text=(
                'I cannot generate a query without '
                'knowing your table structure.'
            ),
            expected_sql=None
        )),
        ('SQL Extraction - Non-SQL code block only', dict(
            response_text=(
                'Here is some Python:\n\n'
                '```python\nprint("hello")\n```'
            ),
            expected_sql=None
        )),
        ('SQL Extraction - JSON fallback', dict(
            response_text='{"sql": "SELECT 1;", "explanation": "test"}',
            expected_sql='SELECT 1;'
        )),
        ('SQL Extraction - Multiline SQL', dict(
            response_text=(
                '```sql\n'
                'SELECT u.name, o.total\n'
                'FROM users u\n'
                'JOIN orders o ON u.id = o.user_id\n'
                'WHERE o.total > 100;\n'
                '```'
            ),
            expected_sql=(
                'SELECT u.name, o.total\n'
                'FROM users u\n'
                'JOIN orders o ON u.id = o.user_id\n'
                'WHERE o.total > 100'
            )
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test SQL extraction from markdown response text"""
        response_text = self.response_text

        # Extract SQL using the same regex as the endpoint
        sql_blocks = re.findall(
            r'```(?:sql|pgsql|postgresql)\s*\n(.*?)```',
            response_text,
            re.DOTALL | re.IGNORECASE
        )
        sql = ';\n\n'.join(
            block.strip().rstrip(';') for block in sql_blocks
        ) if sql_blocks else None

        # JSON fallback
        if sql is None:
            try:
                result = json.loads(response_text.strip())
                if isinstance(result, dict):
                    sql = result.get('sql')
            except (json.JSONDecodeError, TypeError):
                pass

        self.assertEqual(sql, self.expected_sql)

    def tearDown(self):
        pass


class NLQStreamingSSETestCase(BaseTestGenerator):
    """Test cases for SSE event format in streaming responses"""

    scenarios = [
        ('SSE - Text with SQL produces complete event', dict(
            mock_response=(
                '```sql\nSELECT 1;\n```'
            ),
            check_complete_has_sql=True
        )),
        ('SSE - Text without SQL has no sql field', dict(
            mock_response='I need more information about your schema.',
            check_complete_has_sql=False
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test SSE events from NLQ streaming endpoint"""
        trans_id = 12345

        patches = []

        mock_llm_enabled = patch(
            'pgadmin.llm.utils.is_llm_enabled',
            return_value=True
        )
        patches.append(mock_llm_enabled)

        mock_trans_obj = MagicMock()
        mock_trans_obj.sid = 1
        mock_trans_obj.did = 1

        mock_conn = MagicMock()
        mock_conn.connected.return_value = True

        mock_session = {'sid': 1, 'did': 1}

        mock_check_trans = patch(
            'pgadmin.tools.sqleditor.check_transaction_status',
            return_value=(
                True, None, mock_conn, mock_trans_obj, mock_session
            )
        )
        patches.append(mock_check_trans)

        def mock_stream_gen(*args, **kwargs):
            # Yield text chunks
            for chunk in [self.mock_response[i:i + 10]
                          for i in range(0, len(self.mock_response), 10)]:
                yield chunk
            # Yield final 3-tuple
            yield ('complete', self.mock_response, [])

        mock_chat = patch(
            'pgadmin.llm.chat.chat_with_database_stream',
            side_effect=mock_stream_gen
        )
        patches.append(mock_chat)

        mock_csrf = patch(
            'pgadmin.authenticate.mfa.utils.mfa_required',
            lambda f: f
        )
        patches.append(mock_csrf)

        for p in patches:
            p.start()

        try:
            response = self.tester.post(
                f'/sqleditor/nlq/chat/{trans_id}/stream',
                data=json.dumps({'message': 'test query'}),
                content_type='application/json',
                follow_redirects=True
            )

            self.assertEqual(response.status_code, 200)
            self.assertIn('text/event-stream', response.content_type)

            # Parse SSE events
            events = []
            raw = response.data.decode('utf-8')
            for line in raw.split('\n'):
                if line.startswith('data: '):
                    try:
                        events.append(json.loads(line[6:]))
                    except json.JSONDecodeError:
                        pass

            # Should have at least one text_delta and one complete
            event_types = [e.get('type') for e in events]
            self.assertIn('text_delta', event_types)
            self.assertIn('complete', event_types)

            # Check the complete event
            complete_events = [
                e for e in events if e.get('type') == 'complete'
            ]
            self.assertEqual(len(complete_events), 1)
            complete = complete_events[0]

            # Verify content is present
            self.assertIn('content', complete)
            self.assertEqual(complete['content'], self.mock_response)

            # Verify SQL extraction
            if self.check_complete_has_sql:
                self.assertIsNotNone(complete.get('sql'))
            else:
                self.assertIsNone(complete.get('sql'))

        finally:
            for p in patches:
                p.stop()

    def tearDown(self):
        pass


class NLQPromptMarkdownFormatTestCase(BaseTestGenerator):
    """Test that NLQ prompt instructs markdown code fences"""

    scenarios = [
        ('NLQ Prompt - Markdown format', dict()),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test NLQ prompt requires markdown SQL code fences"""
        from pgadmin.llm.prompts.nlq import NLQ_SYSTEM_PROMPT

        # Prompt should instruct use of fenced code blocks
        self.assertIn('fenced code block', NLQ_SYSTEM_PROMPT.lower())
        self.assertIn('sql', NLQ_SYSTEM_PROMPT.lower())

        # Should NOT instruct JSON format
        self.assertNotIn('"sql":', NLQ_SYSTEM_PROMPT)
        self.assertNotIn('"explanation":', NLQ_SYSTEM_PROMPT)

    def tearDown(self):
        pass
