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
        ('Parallel tool calls without item ids are keyed on '
         'output_index', dict(
             stream=[
                 _sse({'type': 'response.output_item.added',
                       'output_index': 0, 'item': {
                           'type': 'function_call',
                           'call_id': 'call_1', 'name': 'run_query'
                       }}),
                 _sse({'type': 'response.output_item.added',
                       'output_index': 1, 'item': {
                           'type': 'function_call',
                           'call_id': 'call_2',
                           'name': 'get_database_schema'
                       }}),
                 _sse({'type': 'response.function_call_arguments.delta',
                       'output_index': 0,
                       'delta': '{"sql": "SELECT 1"}'}),
                 _sse({'type': 'response.function_call_arguments.delta',
                       'output_index': 1, 'delta': '{}'}),
                 _sse({'type': 'response.completed', 'response': {}}),
             ],
             expected=[
                 ('call_1', 'run_query', {'sql': 'SELECT 1'}),
                 ('call_2', 'get_database_schema', {}),
             ],
         )),
        ('An added event without an item id is matched to deltas that '
         'carry item_id', dict(
             stream=[
                 _sse({'type': 'response.output_item.added',
                       'output_index': 0, 'item': {
                           'type': 'function_call',
                           'call_id': 'call_abc',
                           'name': 'get_database_schema'
                       }}),
                 _sse({'type': 'response.function_call_arguments.delta',
                       'item_id': 'item_1', 'output_index': 0,
                       'delta': '{"table":'}),
                 _sse({'type': 'response.function_call_arguments.delta',
                       'item_id': 'item_1', 'output_index': 0,
                       'delta': '"users"}'}),
                 _sse({'type': 'response.output_item.done',
                       'output_index': 0, 'item': {
                           'type': 'function_call', 'id': 'item_1',
                           'call_id': 'call_abc',
                           'name': 'get_database_schema',
                           'arguments': '{"table": "users"}'
                       }}),
                 _sse({'type': 'response.completed', 'response': {}}),
             ],
             expected=[
                 ('call_abc', 'get_database_schema', {'table': 'users'}),
             ],
         )),
        ('Deltas that omit output_index are matched to the added event '
         'by item id', dict(
             stream=[
                 _sse({'type': 'response.output_item.added',
                       'output_index': 0, 'item': {
                           'type': 'function_call', 'id': 'item_1',
                           'call_id': 'call_abc', 'name': 'run_query'
                       }}),
                 _sse({'type': 'response.function_call_arguments.delta',
                       'item_id': 'item_1',
                       'delta': '{"sql": "SELECT 1"}'}),
                 _sse({'type': 'response.completed', 'response': {}}),
             ],
             expected=[
                 ('call_abc', 'run_query', {'sql': 'SELECT 1'}),
             ],
         )),
        ('output_item.done supplies the final name, call_id and '
         'arguments', dict(
             stream=[
                 # A delta with no matching output_item.added seeds an
                 # entry with an empty name and call_id, and partial
                 # arguments; the done event must complete it.
                 _sse({'type': 'response.function_call_arguments.delta',
                       'item_id': 'item_1', 'output_index': 0,
                       'delta': '{"table":'}),
                 _sse({'type': 'response.output_item.done',
                       'output_index': 0, 'item': {
                           'type': 'function_call', 'id': 'item_1',
                           'call_id': 'call_abc',
                           'name': 'get_database_schema',
                           'arguments': '{"table": "users"}',
                           'status': 'completed'
                       }}),
                 _sse({'type': 'response.output_item.done',
                       'output_index': 1, 'item': {
                           'type': 'message', 'id': 'msg_1',
                           'content': []
                       }}),
                 _sse({'type': 'response.completed', 'response': {}}),
             ],
             expected=[
                 ('call_abc', 'get_database_schema', {'table': 'users'}),
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


class OpenAICompatibleServerTestCase(BaseTestGenerator):
    """Check adaptive requests using scripted transport, without API calls."""

    scenarios = [(name, dict(check=name)) for name in (
        'compatible_default', 'token_fallback', 'token_cache',
        'unrelated_error', 'structured_only', 'responses_cache',
        'retry_chain', 'retry_cap', 'reasoning_retry', 'reasoning_cache',
        'reasoning_success', 'reasoning_null', 'reasoning_exhausted',
        'partial_stream', 'malformed_errors', 'hostnames',
        'reasoning_content', 'responses_rejection', 'three_send_cap',
        'http_fallback', 'responses_reasoning', 'debug_once',
        'responses_model_param')]

    def runTest(self):
        """RunTest."""
        from pgadmin.llm.providers import openai as module
        module._adaptive_cache.clear()
        try:
            getattr(self, '_check_' + self.check)(False)
            module._adaptive_cache.clear()
            if self.check not in ('partial_stream', 'malformed_errors',
                                  'hostnames'):
                getattr(self, '_check_' + self.check)(True)
        finally:
            module._adaptive_cache.clear()

    def _client(self, url='https://gateway.example/v1', model='test-model'):
        """Client."""
        return OpenAIClient(api_key='test-key', api_url=url, model=model)

    def _error(self, param='max_tokens', code='unsupported_parameter',
               status=400, message='Unsupported parameter'):
        """Error."""
        import io
        import urllib.error
        from pgadmin.llm.client import LLMClientError
        body = json.dumps({'error': dict(param=param, code=code,
                                         message=message)}).encode()
        return LLMClientError(self._client()._http_error_to_llm_error(
            urllib.error.HTTPError('https://gateway.example', status,
                                   'error', {}, io.BytesIO(body))))

    def _ok(self, reasoning=None, content='hello', finish='stop'):
        """Ok."""
        return dict(choices=[dict(message=dict(content=content),
                                  finish_reason=finish)],
                    usage=dict(completion_tokens_details=dict(
                        reasoning_tokens=reasoning)))

    def _run(self, client, script, streaming, budget=500):
        """Run."""
        from pgadmin.llm.models import Message
        calls = []

        def request(payload):
            """Request."""
            calls.append((client._api_url, payload.copy()))
            item = script[len(calls) - 1]
            if isinstance(item, Exception):
                raise item
            return item

        def stream(payload):
            """Stream."""
            item = request(payload)
            if client._use_responses_api:
                events = []
                for output in item.get('output', []):
                    for part in output.get('content', []):
                        events.append(_sse(dict(
                            type='response.output_text.delta',
                            delta=part['text'])))
                events.append(_sse(dict(type='response.completed',
                                        response=item)))
                yield from client._read_responses_stream(_FakeStream(events))
            else:
                choice = item['choices'][0]
                yield from client._read_openai_stream(_FakeStream([
                    _sse(dict(choices=[dict(
                        delta=choice['message'],
                        finish_reason=choice['finish_reason'])],
                        usage=item.get('usage', {})))]))

        client._make_request = request
        client._process_stream = stream
        self.calls = calls
        messages = [Message.user('hi')]
        if streaming:
            return list(client.chat_stream(messages, max_tokens=budget))
        return client.chat(messages, max_tokens=budget)

    def _budgets(self):
        """Budgets."""
        return [next(p[k] for k in ('max_tokens', 'max_completion_tokens',
                                    'max_output_tokens') if k in p)
                for _, p in self.calls]

    def _check_compatible_default(self, streaming):
        """Check compatible default."""
        self._run(self._client(), [self._ok()], streaming)
        self.assertIn('max_tokens', self.calls[0][1])

    def _check_token_fallback(self, streaming):
        """Check token fallback."""
        self._run(self._client(), [self._error(), self._ok()], streaming)
        self.assertIn('max_tokens', self.calls[0][1])
        self.assertIn('max_completion_tokens', self.calls[1][1])

    def _check_token_cache(self, streaming):
        """Check token cache."""
        self._check_token_fallback(streaming)
        self._run(self._client(), [self._ok()], streaming)
        self.assertIn('max_completion_tokens', self.calls[0][1])
        self._run(self._client(model='other'), [self._ok()], streaming)
        self.assertIn('max_tokens', self.calls[0][1])
        self._run(self._client(url='https://other.example/v1'),
                  [self._ok()], streaming)
        self.assertIn('max_tokens', self.calls[0][1])

    def _check_unrelated_error(self, streaming):
        """Check unrelated error."""
        from pgadmin.llm.client import LLMClientError
        error = self._error(param=None, message='not a chat model')
        with self.assertRaises(LLMClientError):
            self._run(self._client(), [error], streaming)
        self.assertEqual(len(self.calls), 1)

    def _check_structured_only(self, streaming):
        """Check structured only."""
        from pgadmin.llm.client import LLMClientError
        for error in (self._error(param='other'),
                      self._error(status=500),
                      self._error(code='other')):
            with self.assertRaises(LLMClientError):
                self._run(self._client(), [error], streaming)
            self.assertEqual(len(self.calls), 1)

    def _route_error(self):
        """Route error."""
        return self._error(
            param=None, status=404,
            message='This model is only supported in v1/responses')

    def _responses_ok(self):
        """Responses ok."""
        return dict(status='completed', output=[dict(type='message',
                    content=[dict(type='output_text', text='hello')])])

    def _check_responses_cache(self, streaming):
        """Check responses cache."""
        self._run(self._client(), [self._route_error(),
                                   self._responses_ok()], streaming)
        self.assertTrue(self.calls[-1][0].endswith('/responses'))
        self._run(self._client(), [self._responses_ok()], streaming)
        self.assertTrue(self.calls[0][0].endswith('/responses'))

    def _check_retry_chain(self, streaming):
        """Check retry chain."""
        self._run(self._client(), [self._error(), self._route_error(),
                                   self._responses_ok()], streaming)
        self.assertEqual(len(self.calls), 3)

    def _check_retry_cap(self, streaming):
        """Check retry cap."""
        from pgadmin.llm.client import LLMClientError
        with self.assertRaises(LLMClientError):
            self._run(self._client(), [
                      self._error(), self._error()], streaming)
        self.assertEqual(len(self.calls), 2)

    def _exhausted(self):
        """Exhausted."""
        return self._ok(reasoning=10, content='', finish='length')

    def _check_reasoning_retry(self, streaming):
        """Check reasoning retry."""
        self._run(self._client(), [self._error(), self._exhausted(),
                                   self._ok()], streaming)
        self.assertEqual(self._budgets(), [500, 500, 1500])

    def _check_reasoning_cache(self, streaming):
        """Check reasoning cache."""
        self._check_reasoning_retry(streaming)
        self._run(self._client(), [self._ok()], streaming)
        self.assertEqual(self._budgets(), [1500])

    def _check_reasoning_success(self, streaming):
        """Check reasoning success."""
        self._run(self._client(), [self._ok(reasoning=10)], streaming)
        self._run(self._client(), [self._ok()], streaming)
        self.assertEqual(self._budgets(), [1500])

    def _check_reasoning_null(self, streaming):
        """Check reasoning null."""
        self._run(self._client(), [self._ok(reasoning=None)], streaming)
        self.assertEqual(self._budgets(), [500])

    def _check_reasoning_exhausted(self, streaming):
        """Check reasoning exhausted."""
        from pgadmin.llm.client import LLMClientError
        with self.assertRaises(LLMClientError) as caught:
            self._run(self._client(), [self._exhausted(),
                                       self._exhausted()], streaming)
        self.assertEqual(caught.exception.error.code, 'reasoning_budget')
        self.assertEqual(self._budgets(), [500, 1500])

    def _check_partial_stream(self, streaming):
        """Check partial stream."""
        from pgadmin.llm.client import LLMClientError
        from pgadmin.llm.models import Message
        client = self._client()
        calls = []

        def partial(payload):
            """Partial."""
            calls.append(payload)
            yield 'hello'
            raise self._error()

        client._process_stream = partial
        response = client.chat_stream([Message.user('hi')])
        self.assertEqual(next(response), 'hello')
        with self.assertRaises(LLMClientError):
            next(response)
        self.assertEqual(len(calls), 1)

    def _check_malformed_errors(self, streaming):
        """Check malformed errors."""
        import io
        import urllib.error
        for body in (b'[]', b'{"error": []}', b'{"error": null}',
                     b'not json'):
            error = self._client()._http_error_to_llm_error(
                urllib.error.HTTPError('https://gateway.example', 400,
                                       'error', {}, io.BytesIO(body)))
            self.assertTrue(error.message)
            self.assertEqual(error.http_status, 400)

    def _check_hostnames(self, streaming):
        """Check hostnames."""
        self.assertTrue(OpenAIClient(
            api_url='https://api.openai.com.evil.example/v1').is_available())
        self.assertFalse(OpenAIClient(
            api_url='https://api.openai.com:443/v1').is_available())

    def _check_reasoning_content(self, streaming):
        """Check reasoning content."""
        response = self._ok(content='', finish='length')
        response['choices'][0]['message']['reasoning_content'] = 'thinking'
        self._run(self._client(), [response, self._ok()], streaming)
        self.assertEqual(self._budgets(), [500, 1500])

    def _check_responses_rejection(self, streaming):
        """Check responses rejection."""
        from pgadmin.llm.client import LLMClientError
        for error in (
                self._error(param='other',
                            message='Model only supported in v1/responses'),
                self._error(
                    param=None, status=500,
                    message='Model only supported in v1/responses')):
            with self.assertRaises(LLMClientError):
                self._run(self._client(), [error], streaming)
            self.assertEqual(len(self.calls), 1)

    def _check_three_send_cap(self, streaming):
        """Check three send cap."""
        from pgadmin.llm.client import LLMClientError
        with self.assertRaises(LLMClientError):
            self._run(self._client(), [self._error(), self._exhausted(),
                                       self._route_error()], streaming)
        self.assertEqual(len(self.calls), 3)

    def _check_http_fallback(self, streaming):
        """Exercise the real request and error parser on both transports."""
        import io
        import urllib.error
        from unittest.mock import patch
        from pgadmin.llm.models import Message
        client = self._client()
        sent = []

        class Response(io.BytesIO):
            pass

        def urlopen(request, **kwargs):
            """Urlopen."""
            payload = json.loads(request.data)
            sent.append(payload)
            if len(sent) == 1:
                body = json.dumps({'error': dict(
                    param='max_tokens', code='unsupported_parameter',
                    message='Unsupported')})
                raise urllib.error.HTTPError(
                    request.full_url, 400, 'Bad Request', {},
                    io.BytesIO(body.encode()))
            if streaming:
                body = _sse(dict(choices=[dict(delta=dict(content='hello'),
                                               finish_reason='stop')])) + '\n'
            else:
                body = json.dumps(self._ok())
            return Response(body.encode())

        with patch('pgadmin.llm.providers.openai.urlopen_no_redirect',
                   side_effect=urlopen):
            if streaming:
                list(client.chat_stream([Message.user('hi')]))
            else:
                client.chat([Message.user('hi')])
        self.assertIn('max_tokens', sent[0])
        self.assertIn('max_completion_tokens', sent[1])

    def _check_responses_reasoning(self, streaming):
        """Reasoning budgets also work after a Responses API reroute."""
        exhausted = dict(
            status='incomplete', output=[],
            incomplete_details=dict(reason='max_output_tokens'),
            usage=dict(output_tokens_details=dict(reasoning_tokens=10)))
        self._run(self._client(), [self._route_error(), exhausted,
                                   self._responses_ok()], streaming)
        self.assertEqual(self._budgets(), [500, 500, 1500])
        self._run(self._client(), [self._responses_ok()], streaming)
        self.assertEqual(self._budgets(), [1500])

    def _check_debug_once(self, streaming):
        """Check debug once."""
        from unittest.mock import patch
        with patch('pgadmin.llm.providers.openai._logger.debug') as debug:
            self._check_token_cache(streaming)
        debug.assert_called_once()

    def _check_responses_model_param(self, streaming):
        """Accept the official Responses-only model error shape."""
        self._run(self._client(), [self._error(
            param='model', code=None, status=404,
            message='This model is only supported in v1/responses '
                    'and not in v1/chat/completions.'),
            self._responses_ok()], streaming)
        self.assertTrue(self.calls[-1][0].endswith('/responses'))
