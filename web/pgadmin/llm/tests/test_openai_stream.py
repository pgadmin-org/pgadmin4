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
    """Adaptive behaviour for OpenAI-compatible servers and reasoning models.

    Each scenario drives chat() with _make_request replaced by a script of
    canned responses/errors, and asserts on the requests that would have
    been sent. No network access is involved.
    """

    scenarios = [
        ('Unsupported max_completion_tokens falls back to max_tokens', dict(
            kind='token_fallback',
            api_url='http://localhost:1234/v1',
            model='glm-4',
        )),
        ('Token parameter fallback is remembered for new clients', dict(
            kind='token_cache',
            api_url='http://localhost:1234/v1',
            model='glm-4',
        )),
        ('Custom host is never rerouted to the Responses API', dict(
            kind='no_reroute',
            api_url='http://localhost:1234/v1',
            model='glm-4',
        )),
        ('Reasoning exhaustion retries with a tripled budget', dict(
            kind='reasoning_retry',
            api_url='http://localhost:1234/v1',
            model='deepseek-r1',
        )),
        ('Lookalike hostname is treated as a custom provider', dict(
            kind='host_check',
            api_url='https://api.openai.com.evil.example/v1',
            model='gpt-4o',
        )),
        ('Streaming falls back to max_tokens on unsupported parameter', dict(
            kind='stream_token_fallback',
            api_url='http://localhost:1234/v1',
            model='glm-4',
        )),
        ('Structured error fields still trigger the fallback', dict(
            kind='structured_token_fallback',
            api_url='http://localhost:1234/v1',
            model='glm-4',
        )),
        ('Reasoning budget is retried only once', dict(
            kind='reasoning_retry_once',
            api_url='http://localhost:1234/v1',
            model='deepseek-r1',
        )),
        ('Streaming falls back on structured error fields', dict(
            kind='stream_structured_fallback',
            api_url='http://localhost:1234/v1',
            model='glm-4',
        )),
        ('Malformed error bodies still produce a usable error', dict(
            kind='malformed_error_body',
            api_url='http://localhost:1234/v1',
            model='glm-4',
        )),
        ('Reasoning exhaustion detected from usage details', dict(
            kind='reasoning_from_usage',
            api_url='http://localhost:1234/v1',
            model='o3-mini',
        )),
        ('Streaming reasoning exhaustion retries with tripled budget', dict(
            kind='stream_reasoning_retry',
            api_url='http://localhost:1234/v1',
            model='deepseek-r1',
        )),
        ('Default host with explicit port is still the official API', dict(
            kind='explicit_port_host',
            api_url='https://api.openai.com:443/v1',
            model='gpt-4o',
        )),
    ]

    def runTest(self):
        from pgadmin.llm.providers import openai as openai_module
        from pgadmin.llm.client import LLMClientError
        from pgadmin.llm.models import LLMError, Message

        openai_module._token_param_cache.clear()

        def make_client():
            return OpenAIClient(
                api_key='test-key', model=self.model, api_url=self.api_url)

        def ok_response(content='hello'):
            return {
                'choices': [{'message': {'content': content},
                             'finish_reason': 'stop'}],
                'usage': {'prompt_tokens': 1, 'completion_tokens': 1,
                          'total_tokens': 2},
                'model': self.model,
            }

        if self.kind == 'token_fallback':
            client = make_client()
            sent_params = []

            def fake_request(payload):
                sent_params.append(
                    'max_completion_tokens'
                    if 'max_completion_tokens' in payload else 'max_tokens')
                if sent_params[-1] == 'max_completion_tokens':
                    raise LLMClientError(LLMError(
                        message="Unsupported parameter: "
                                "'max_completion_tokens' is not supported "
                                "with this model.",
                        code='unsupported_parameter',
                        provider='openai'))
                return ok_response()

            client._make_request = fake_request
            result = client.chat([Message(role='user', content='hi')])
            self.assertEqual(
                sent_params, ['max_completion_tokens', 'max_tokens'])
            self.assertEqual(result.content, 'hello')

        elif self.kind == 'token_cache':
            # A new client for the same (server, model) pair must use the
            # remembered parameter immediately, without another rejection.
            openai_module._token_param_cache[
                ('http://localhost:1234/v1', 'glm-4')] = 'max_tokens'
            client = make_client()
            sent_params = []

            def fake_request(payload):
                sent_params.append(
                    'max_completion_tokens'
                    if 'max_completion_tokens' in payload else 'max_tokens')
                return ok_response()

            client._make_request = fake_request
            result = client.chat([Message(role='user', content='hi')])
            self.assertEqual(sent_params, ['max_tokens'])
            self.assertEqual(result.content, 'hello')

        elif self.kind == 'no_reroute':
            client = make_client()
            urls = []

            def fake_request(payload):
                urls.append(client._api_url)
                raise LLMClientError(LLMError(
                    message='This model requires the v1/responses endpoint',
                    code='bad_request', provider='openai'))

            client._make_request = fake_request
            with self.assertRaises(LLMClientError):
                client.chat([Message(role='user', content='hi')])
            self.assertEqual(
                urls, ['http://localhost:1234/v1/chat/completions'])

        elif self.kind == 'reasoning_retry':
            client = make_client()
            budgets = []

            def fake_request(payload):
                budgets.append(
                    payload.get('max_completion_tokens') or
                    payload.get('max_tokens'))
                if len(budgets) == 1:
                    return {
                        'choices': [{'message': {
                            'content': '',
                            'reasoning_content': 'thinking...'},
                            'finish_reason': 'length'}],
                        'usage': {'prompt_tokens': 1, 'completion_tokens': 100,
                                  'total_tokens': 101},
                        'model': self.model,
                    }
                return ok_response('done')

            client._make_request = fake_request
            result = client.chat(
                [Message(role='user', content='hi')], max_tokens=1000)
            self.assertEqual(budgets, [1000, 3000])
            self.assertEqual(result.content, 'done')

        elif self.kind == 'stream_token_fallback':
            client = make_client()
            sent_params = []

            def fake_process_stream(payload):
                sent_params.append(
                    'max_completion_tokens'
                    if 'max_completion_tokens' in payload else 'max_tokens')
                self.assertTrue(payload.get('stream'))
                if sent_params[-1] == 'max_completion_tokens':
                    raise LLMClientError(LLMError(
                        message="Unsupported parameter: "
                                "'max_completion_tokens' is not supported "
                                "with this model.",
                        code='unsupported_parameter',
                        provider='openai'))
                yield 'chunk'

            client._process_stream = fake_process_stream
            chunks = list(client.chat_stream(
                [Message(role='user', content='hi')]))
            self.assertEqual(
                sent_params, ['max_completion_tokens', 'max_tokens'])
            self.assertEqual(chunks, ['chunk'])

        elif self.kind == 'structured_token_fallback':
            # A server reporting the rejection only through structured
            # error fields (generic message, code + parameter) must still
            # trigger the fallback.
            client = make_client()
            sent_params = []

            def fake_request(payload):
                sent_params.append(
                    'max_completion_tokens'
                    if 'max_completion_tokens' in payload else 'max_tokens')
                if sent_params[-1] == 'max_completion_tokens':
                    raise LLMClientError(LLMError(
                        message="Invalid request (parameter: "
                                "'max_completion_tokens')",
                        code='unsupported_parameter',
                        provider='openai'))
                return ok_response()

            client._make_request = fake_request
            result = client.chat([Message(role='user', content='hi')])
            self.assertEqual(
                sent_params, ['max_completion_tokens', 'max_tokens'])
            self.assertEqual(result.content, 'hello')

        elif self.kind == 'reasoning_retry_once':
            # The tripled-budget retry happens once; a second exhausted
            # response surfaces the budget error to the caller.
            client = make_client()
            budgets = []

            def fake_request(payload):
                budgets.append(
                    payload.get('max_completion_tokens') or
                    payload.get('max_tokens'))
                return {
                    'choices': [{'message': {
                        'content': '',
                        'reasoning_content': 'thinking...'},
                        'finish_reason': 'length'}],
                    'usage': {'prompt_tokens': 1, 'completion_tokens': 100,
                              'total_tokens': 101},
                    'model': self.model,
                }

            client._make_request = fake_request
            with self.assertRaises(LLMClientError) as ctx:
                client.chat(
                    [Message(role='user', content='hi')], max_tokens=1000)
            self.assertEqual(budgets, [1000, 3000])
            self.assertEqual(ctx.exception.error.code, 'reasoning_budget')

        elif self.kind == 'stream_structured_fallback':
            # Exercises the real _process_stream HTTP error branch: a
            # streaming server reporting the rejection only through
            # structured error fields must still trigger the fallback.
            import io
            import urllib.error

            client = make_client()
            calls = []
            body = json.dumps({'error': {
                'message': 'Invalid request',
                'code': 'unsupported_parameter',
                'param': 'max_completion_tokens'}}).encode('utf-8')

            def fake_urlopen(request, timeout=None, context=None):
                payload = json.loads(request.data.decode('utf-8'))
                calls.append(
                    'max_completion_tokens'
                    if 'max_completion_tokens' in payload else 'max_tokens')
                if calls[-1] == 'max_completion_tokens':
                    raise urllib.error.HTTPError(
                        request.full_url, 400, 'Bad Request', {},
                        io.BytesIO(body))
                stream = _FakeStream([
                    _sse({'choices': [{'index': 0, 'delta': {
                        'role': 'assistant', 'content': 'hi'}}]}),
                    _sse({'choices': [{'index': 0,
                                       'finish_reason': 'stop',
                                       'delta': {}}]}),
                    'data: [DONE]',
                ])
                stream.close = lambda: None
                return stream

            original = openai_module.urlopen_no_redirect
            openai_module.urlopen_no_redirect = fake_urlopen
            try:
                chunks = list(client.chat_stream(
                    [Message(role='user', content='hi')]))
            finally:
                openai_module.urlopen_no_redirect = original
            self.assertEqual(
                calls, ['max_completion_tokens', 'max_tokens'])
            self.assertIn('hi', chunks)

        elif self.kind == 'malformed_error_body':
            import io
            import urllib.error

            client = make_client()

            def http_error(body):
                return urllib.error.HTTPError(
                    'http://localhost:1234/v1/chat/completions',
                    400, 'Bad Request', {},
                    io.BytesIO(body.encode('utf-8')))

            # error as a plain string
            err = client._http_error_to_llm_error(
                http_error('{"error": "invalid model"}'))
            self.assertEqual(err.message, 'invalid model')
            self.assertEqual(err.code, '400')

            # JSON null body
            err = client._http_error_to_llm_error(http_error('null'))
            self.assertEqual(err.message, 'null')

            # non-JSON body
            err = client._http_error_to_llm_error(http_error('oops'))
            self.assertEqual(err.message, 'oops')

        elif self.kind == 'reasoning_from_usage':
            # No reasoning_content in the message; the reasoning spend is
            # only visible in usage.completion_tokens_details.
            client = make_client()
            budgets = []

            def fake_request(payload):
                budgets.append(
                    payload.get('max_completion_tokens') or
                    payload.get('max_tokens'))
                if len(budgets) == 1:
                    return {
                        'choices': [{'message': {'content': ''},
                                     'finish_reason': 'length'}],
                        'usage': {
                            'prompt_tokens': 1, 'completion_tokens': 100,
                            'total_tokens': 101,
                            'completion_tokens_details': {
                                'reasoning_tokens': 100}},
                        'model': self.model,
                    }
                return ok_response('done')

            client._make_request = fake_request
            result = client.chat(
                [Message(role='user', content='hi')], max_tokens=1000)
            self.assertEqual(budgets, [1000, 3000])
            self.assertEqual(result.content, 'done')

        elif self.kind == 'stream_reasoning_retry':
            import io
            import urllib.error  # noqa: F401

            client = make_client()
            budgets = []

            exhausted_stream = _FakeStream([
                _sse({'choices': [{'index': 0, 'delta': {
                    'role': 'assistant',
                    'reasoning_content': 'thinking...'}}]}),
                _sse({'choices': [{'index': 0,
                                   'finish_reason': 'length',
                                   'delta': {}}],
                      'usage': {
                          'prompt_tokens': 1, 'completion_tokens': 100,
                          'total_tokens': 101,
                          'completion_tokens_details': {
                              'reasoning_tokens': 100}}}),
                'data: [DONE]',
            ])
            ok_stream = _FakeStream([
                _sse({'choices': [{'index': 0, 'delta': {
                    'role': 'assistant', 'content': 'hi'}}]}),
                _sse({'choices': [{'index': 0,
                                   'finish_reason': 'stop',
                                   'delta': {}}]}),
                'data: [DONE]',
            ])
            for s in (exhausted_stream, ok_stream):
                s.close = lambda: None
            streams = [exhausted_stream, ok_stream]

            def fake_urlopen(request, timeout=None, context=None):
                payload = json.loads(request.data.decode('utf-8'))
                budgets.append(
                    payload.get('max_completion_tokens') or
                    payload.get('max_tokens'))
                return streams[len(budgets) - 1]

            original = openai_module.urlopen_no_redirect
            openai_module.urlopen_no_redirect = fake_urlopen
            try:
                chunks = list(client.chat_stream(
                    [Message(role='user', content='hi')], max_tokens=1000))
            finally:
                openai_module.urlopen_no_redirect = original
            self.assertEqual(budgets, [1000, 3000])
            self.assertIn('hi', chunks)

        elif self.kind == 'explicit_port_host':
            # An explicit default port must not make the official endpoint
            # look like a custom provider.
            self.assertTrue(make_client()._is_default_host)
            self.assertFalse(
                OpenAIClient(api_key=None, model='gpt-4o',
                             api_url=self.api_url).is_available())
            client = make_client()
            err = LLMClientError(LLMError(
                message='use v1/responses endpoint',
                code='bad', provider='openai'))
            self.assertTrue(client._should_use_responses_api(err))

        elif self.kind == 'host_check':
            # A hostname merely starting with api.openai.com must not be
            # treated as the official endpoint.
            self.assertTrue(make_client().is_available())
            self.assertFalse(
                OpenAIClient(api_key=None, model='gpt-4o').is_available())

        openai_module._token_param_cache.clear()
