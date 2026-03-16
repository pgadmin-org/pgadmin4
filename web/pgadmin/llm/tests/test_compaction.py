##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the conversation history compaction module."""

import json
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.llm.models import Message, Role, ToolCall, ToolResult
from pgadmin.llm.compaction import (
    estimate_tokens,
    estimate_message_tokens,
    estimate_history_tokens,
    compact_history,
    deserialize_history,
    filter_conversational,
)


class TokenEstimationTestCase(BaseTestGenerator):
    """Test cases for token estimation functions."""

    scenarios = [
        ('Token Estimation - Empty String', dict(
            text='',
            provider='openai',
            expected_tokens=0
        )),
        ('Token Estimation - Short Text', dict(
            text='Hello world',
            provider='openai',
            # 11 chars / 4.0 = 2.75 + 10 overhead = ~12
            expected_min=10,
            expected_max=15
        )),
        ('Token Estimation - SQL Content', dict(
            text='SELECT id, name FROM users WHERE active = true',
            provider='openai',
            # SQL gets a 1.2x multiplier
            expected_min=15,
            expected_max=30
        )),
        ('Token Estimation - Anthropic Provider', dict(
            text='Hello world test string',
            provider='anthropic',
            # 23 chars / 3.8 = ~6 + 10 overhead = ~16
            expected_min=14,
            expected_max=20
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Test token estimation."""
        result = estimate_tokens(self.text, self.provider)

        if hasattr(self, 'expected_tokens'):
            self.assertEqual(result, self.expected_tokens)
        else:
            self.assertGreaterEqual(result, self.expected_min)
            self.assertLessEqual(result, self.expected_max)

    def tearDown(self):
        pass


class CompactHistoryTestCase(BaseTestGenerator):
    """Test cases for conversation history compaction."""

    scenarios = [
        ('Compact - Empty History', dict(
            test_method='test_empty_history'
        )),
        ('Compact - Within Budget', dict(
            test_method='test_within_budget'
        )),
        ('Compact - Preserves First And Recent', dict(
            test_method='test_preserves_first_and_recent'
        )),
        ('Compact - Drops Low Value Messages', dict(
            test_method='test_drops_low_value'
        )),
        ('Compact - Keeps Tool Pairs Together', dict(
            test_method='test_tool_pairs'
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Run the specified test method."""
        getattr(self, self.test_method)()

    def test_empty_history(self):
        """Empty history should return empty list."""
        result = compact_history([], max_tokens=1000)
        self.assertEqual(result, [])

    def test_within_budget(self):
        """History within budget should be returned unchanged."""
        messages = [
            Message.user('Hello'),
            Message.assistant('Hi there!'),
        ]
        result = compact_history(messages, max_tokens=100000)
        self.assertEqual(len(result), 2)

    def test_preserves_first_and_recent(self):
        """First message and recent window should always be preserved."""
        messages = [Message.user('First message')]
        for i in range(20):
            messages.append(Message.user(f'Message {i}'))
            messages.append(Message.assistant(f'Response {i}'))

        # Use a very small token budget to force compaction
        result = compact_history(
            messages, max_tokens=500, recent_window=4
        )

        # First message should be preserved
        self.assertEqual(result[0].content, 'First message')
        # Last 4 messages should be preserved
        self.assertGreaterEqual(len(result), 5)
        self.assertEqual(
            [m.content for m in result[-4:]],
            [m.content for m in messages[-4:]],
        )

    def test_drops_low_value(self):
        """Low-value messages should be dropped first."""
        # Filler only on important messages to inflate token count;
        # keep transient messages short so they classify as low-value.
        filler = ' This is extra text to increase token count.' * 5
        messages = [
            Message.user('First important query' + filler),
            # Short transient messages (low value) - no filler
            Message.user('ok'),
            Message.assistant('ok'),
            Message.user('thanks'),
            Message.assistant('sure'),
            # More substantial messages
            Message.user('Show me the schema with CREATE TABLE' + filler),
            Message.assistant(
                'Here is the schema with CREATE TABLE...' + filler
            ),
            # Recent messages
            Message.user('Final question' + filler),
            Message.assistant('Final answer with details' + filler),
        ]

        result = compact_history(
            messages, max_tokens=200, recent_window=2
        )

        # Should have fewer messages than original
        self.assertLess(len(result), len(messages))
        # First message preserved
        self.assertIn('First important query', result[0].content)
        # Last 2 preserved
        self.assertIn('Final answer with details', result[-1].content)
        # Transient messages should be dropped
        contents = [m.content for m in result]
        for short_msg in ['ok', 'thanks', 'sure']:
            self.assertNotIn(short_msg, contents)

    def test_tool_pairs(self):
        """Tool call/result pairs should be dropped together."""
        tc = ToolCall(id='tc1', name='get_schema', arguments={})
        messages = [
            Message.user('Get schema'),
            Message.assistant('', tool_calls=[tc]),
            Message.tool_result(
                tool_call_id='tc1',
                content='{"tables": ["users", "orders"]}' * 100
            ),
            Message.assistant('Found tables: users and orders'),
            Message.user('Recent query'),
            Message.assistant('Recent response'),
        ]

        result = compact_history(
            messages, max_tokens=200, recent_window=2
        )

        # If assistant+tool_call is dropped, tool_result should
        # also be dropped (not left orphaned)
        has_tool_call = any(
            m.role == Role.ASSISTANT and m.tool_calls
            for m in result
        )
        has_tool_result = any(
            m.role == Role.TOOL for m in result
        )
        # Both should be present or both absent
        self.assertEqual(has_tool_call, has_tool_result)

    def tearDown(self):
        pass


class DeserializeHistoryTestCase(BaseTestGenerator):
    """Test cases for deserializing conversation history."""

    scenarios = [
        ('Deserialize - Empty', dict(
            test_method='test_empty'
        )),
        ('Deserialize - Basic Messages', dict(
            test_method='test_basic_messages'
        )),
        ('Deserialize - With Tool Calls', dict(
            test_method='test_with_tool_calls'
        )),
        ('Deserialize - Skips Unknown Roles', dict(
            test_method='test_unknown_roles'
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Run the specified test method."""
        getattr(self, self.test_method)()

    def test_empty(self):
        """Empty list should return empty list."""
        result = deserialize_history([])
        self.assertEqual(result, [])

    def test_basic_messages(self):
        """Should deserialize user and assistant messages."""
        data = [
            {'role': 'user', 'content': 'Hello'},
            {'role': 'assistant', 'content': 'Hi there!'},
        ]
        result = deserialize_history(data)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].role, Role.USER)
        self.assertEqual(result[0].content, 'Hello')
        self.assertEqual(result[1].role, Role.ASSISTANT)
        self.assertEqual(result[1].content, 'Hi there!')

    def test_with_tool_calls(self):
        """Should deserialize messages with tool calls."""
        data = [
            {
                'role': 'assistant',
                'content': '',
                'tool_calls': [{
                    'id': 'tc1',
                    'name': 'get_schema',
                    'arguments': {'schema': 'public'}
                }]
            },
        ]
        result = deserialize_history(data)
        self.assertEqual(len(result), 1)
        self.assertEqual(len(result[0].tool_calls), 1)
        self.assertEqual(result[0].tool_calls[0].name, 'get_schema')

    def test_unknown_roles(self):
        """Should skip messages with unknown roles."""
        data = [
            {'role': 'user', 'content': 'Hello'},
            {'role': 'unknown_role', 'content': 'Skip me'},
            {'role': 'assistant', 'content': 'Hi'},
        ]
        result = deserialize_history(data)
        self.assertEqual(len(result), 2)

    def tearDown(self):
        pass


class FilterConversationalTestCase(BaseTestGenerator):
    """Test cases for filtering conversational messages."""

    scenarios = [
        ('Filter - Keeps User And Final Assistant', dict(
            test_method='test_keeps_conversational'
        )),
        ('Filter - Drops Tool Messages', dict(
            test_method='test_drops_tool_messages'
        )),
        ('Filter - Drops Intermediate Assistant', dict(
            test_method='test_drops_intermediate_assistant'
        )),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """Run the specified test method."""
        getattr(self, self.test_method)()

    def test_keeps_conversational(self):
        """Should keep user messages and final assistant responses."""
        messages = [
            Message.user('Hello'),
            Message.assistant('Hi there!'),
            Message.user('Show me users'),
            Message.assistant('Here is the SQL'),
        ]
        result = filter_conversational(messages)
        self.assertEqual(len(result), 4)

    def test_drops_tool_messages(self):
        """Should drop tool result messages."""
        tc = ToolCall(id='tc1', name='get_schema', arguments={})
        messages = [
            Message.user('Get schema'),
            Message.assistant('', tool_calls=[tc]),
            Message.tool_result(
                tool_call_id='tc1',
                content='{"tables": ["users"]}'
            ),
            Message.assistant('Found the users table.'),
        ]
        result = filter_conversational(messages)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].role, Role.USER)
        self.assertEqual(result[1].role, Role.ASSISTANT)
        self.assertEqual(result[1].content, 'Found the users table.')

    def test_drops_intermediate_assistant(self):
        """Should drop assistant messages that have tool calls."""
        tc1 = ToolCall(id='tc1', name='get_schema', arguments={})
        tc2 = ToolCall(id='tc2', name='execute_sql', arguments={})
        messages = [
            Message.user('Complex query'),
            Message.assistant('', tool_calls=[tc1]),
            Message.tool_result(
                tool_call_id='tc1', content='schema data'
            ),
            Message.assistant('', tool_calls=[tc2]),
            Message.tool_result(
                tool_call_id='tc2', content='query results'
            ),
            Message.assistant('Here are the final results.'),
        ]
        result = filter_conversational(messages)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].content, 'Complex query')
        self.assertEqual(result[1].content,
                         'Here are the final results.')

    def tearDown(self):
        pass
