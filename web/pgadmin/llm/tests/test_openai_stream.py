##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for OpenAI streaming tool-call accumulation."""

import json

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.llm.models import LLMResponse
from pgadmin.llm.providers.openai import OpenAIClient


class _FakeStream:
    """Minimal response stand-in exposing readline() over SSE lines."""

    def __init__(self, lines):
        # Each yielded line mimics the bytes a real socket returns,
        # including the trailing newline the parser strips.
        self._lines = [(line + '\n').encode('utf-8') for line in lines]
        self._idx = 0

    def readline(self):
        if self._idx >= len(self._lines):
            return b''
        line = self._lines[self._idx]
        self._idx += 1
        return line


def _sse(obj):
    return 'data: ' + json.dumps(obj)


class OpenAIStreamToolCallTestCase(BaseTestGenerator):
    """Accumulating tool-call deltas must tolerate empty/null fields."""

    scenarios = [
        ('Null name/id in continuation delta is ignored', dict(
            stream=[
                _sse({'choices': [{'index': 0, 'delta': {
                    'role': 'assistant',
                    'tool_calls': [{
                        'index': 0, 'id': 'call_abc',
                        'function': {'name': 'get_database_schema',
                                     'arguments': ''}}]}}]}),
                _sse({'choices': [{'index': 0, 'delta': {
                    'tool_calls': [{
                        'index': 0, 'id': None,
                        'function': {'name': None,
                                     'arguments': '{}'}}]}}]}),
                _sse({'choices': [{'index': 0,
                                   'finish_reason': 'tool_calls',
                                   'delta': {}}]}),
                'data: [DONE]',
            ],
            expected_name='get_database_schema',
            expected_arguments={},
            expected_id='call_abc',
        )),
        ('Arguments streamed across chunks are concatenated', dict(
            stream=[
                _sse({'choices': [{'index': 0, 'delta': {
                    'tool_calls': [{
                        'index': 0, 'id': 'call_xyz',
                        'function': {'name': 'run_query',
                                     'arguments': '{"sql":'}}]}}]}),
                _sse({'choices': [{'index': 0, 'delta': {
                    'tool_calls': [{
                        'index': 0,
                        'function': {'arguments': '"SELECT 1"}'}}]}}]}),
                _sse({'choices': [{'index': 0,
                                   'finish_reason': 'tool_calls',
                                   'delta': {}}]}),
                'data: [DONE]',
            ],
            expected_name='run_query',
            expected_arguments={'sql': 'SELECT 1'},
            expected_id='call_xyz',
        )),
        ('Null function object in a delta does not raise', dict(
            stream=[
                _sse({'choices': [{'index': 0, 'delta': {
                    'tool_calls': [{
                        'index': 0, 'id': 'call_1',
                        'function': {'name': 'noop',
                                     'arguments': '{}'}}]}}]}),
                _sse({'choices': [{'index': 0, 'delta': {
                    'tool_calls': [{'index': 0, 'function': None}]}}]}),
                _sse({'choices': [{'index': 0,
                                   'finish_reason': 'tool_calls',
                                   'delta': {}}]}),
                'data: [DONE]',
            ],
            expected_name='noop',
            expected_arguments={},
            expected_id='call_1',
        )),
    ]

    def runTest(self):
        client = OpenAIClient(api_key='test-key', model='gpt-4o')
        result = None
        for item in client._read_openai_stream(_FakeStream(self.stream)):
            if isinstance(item, LLMResponse):
                result = item

        self.assertIsNotNone(result)
        self.assertEqual(len(result.tool_calls), 1)
        tc = result.tool_calls[0]
        self.assertEqual(tc.name, self.expected_name)
        self.assertEqual(tc.arguments, self.expected_arguments)
        # The real provider id must survive a null id in a later delta,
        # rather than being clobbered (and replaced by a random uuid).
        self.assertEqual(tc.id, self.expected_id)


class OpenAIResponsesStreamToolCallTestCase(BaseTestGenerator):
    """Responses API function-call deltas must be correlated on item_id,
    not call_id (issue #10348): response.function_call_arguments.delta
    events carry item_id, not call_id.
    """

    scenarios = [
        ('A single streamed tool call keeps its name and arguments '
         'together', dict(
             stream=[
                 _sse({'type': 'response.output_item.added', 'item': {
                     'type': 'function_call', 'id': 'item_1',
                     'call_id': 'call_abc', 'name': 'get_database_schema'
                 }}),
                 _sse({'type': 'response.function_call_arguments.delta',
                       'item_id': 'item_1', 'delta': '{"table":'}),
                 _sse({'type': 'response.function_call_arguments.delta',
                       'item_id': 'item_1', 'delta': '"users"}'}),
                 _sse({'type': 'response.completed', 'response': {}}),
             ],
             expected=[
                 ('call_abc', 'get_database_schema', {'table': 'users'}),
             ],
         )),
        ('Two parallel tool calls are not merged into one', dict(
            stream=[
                _sse({'type': 'response.output_item.added', 'item': {
                    'type': 'function_call', 'id': 'item_1',
                    'call_id': 'call_1', 'name': 'run_query'
                }}),
                _sse({'type': 'response.output_item.added', 'item': {
                    'type': 'function_call', 'id': 'item_2',
                    'call_id': 'call_2', 'name': 'get_database_schema'
                }}),
                _sse({'type': 'response.function_call_arguments.delta',
                      'item_id': 'item_1', 'delta': '{"sql": "SELECT 1"}'}),
                _sse({'type': 'response.function_call_arguments.delta',
                      'item_id': 'item_2', 'delta': '{}'}),
                _sse({'type': 'response.completed', 'response': {}}),
            ],
            expected=[
                ('call_1', 'run_query', {'sql': 'SELECT 1'}),
                ('call_2', 'get_database_schema', {}),
            ],
        )),
    ]

    def runTest(self):
        client = OpenAIClient(api_key='test-key', model='gpt-5')
        result = None
        for item in client._read_responses_stream(_FakeStream(self.stream)):
            if isinstance(item, LLMResponse):
                result = item

        self.assertIsNotNone(result)
        self.assertEqual(len(result.tool_calls), len(self.expected))
        actual = [(tc.id, tc.name, tc.arguments)
                  for tc in result.tool_calls]
        self.assertEqual(actual, self.expected)
