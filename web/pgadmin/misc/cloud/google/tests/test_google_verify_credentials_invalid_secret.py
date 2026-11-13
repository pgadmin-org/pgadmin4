##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""#10673: a bad Google client secret file is a 400, not a 500."""

import inspect
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import quote

from flask import session
from flask.sessions import SessionInterface
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.session import ManagedSession


INVALID = ('The client secret file is not a valid Google OAuth client '
           'secret JSON file.')
UNREADABLE = 'The client secret file could not be read.'
NOT_FOUND = 'Client secret path not found'

CONFIG = {'client_id': 'id', 'auth_uri': 'https://a', 'token_uri': 'https://t',
          'client_secret': 'secret', 'redirect_uris': ['http://localhost']}
MAPPED = dict(CONFIG, client_id='mapped-client-id')
ENCODED = dict(CONFIG, client_id='encoded-client-id')
INSTALLED = json.dumps({'installed': CONFIG})
NO_AUTH_URI = json.dumps({'installed': {'client_id': 'i',
                                        'token_uri': 'https://t'}})
DEEP_JSON = '[' * 100000 + ']' * 100000


class _SkipServerSetUpMixin:
    """Skip BaseTestGenerator's Postgres connection; pure logic tests."""

    def setUp(self):
        unittest.TestCase.setUp(self)


def _path_for(tmp, content, directory, input_kind):
    if input_kind in ('absent', 'int', 'empty'):
        if input_kind == 'int':
            return 123
        if input_kind == 'empty':
            return ''
        return None
    if directory:
        return tmp
    path = os.path.join(tmp, 'client_secret.json')
    if content is None:
        return os.path.join(tmp, 'missing.json')
    with open(path, 'wb' if isinstance(content, bytes) else 'w') as f:
        f.write(content)
    return path


class TestGoogleClientSecret(_SkipServerSetUpMixin, BaseTestGenerator):

    scenarios = [
        ('non-JSON file', dict(content='SELECT 1;', input_kind='value',
                               status=400, error=INVALID)),
        ('non-UTF-8 file', dict(content=b'{"web": "\xe9"}',
                                input_kind='value', status=400,
                                error=INVALID)),
        ('directory path', dict(content=None, directory=True,
                                input_kind='value', status=400,
                                error=UNREADABLE)),
        ('deeply nested JSON', dict(content=DEEP_JSON, input_kind='value',
                                    status=400, error=INVALID)),
        ('non-object JSON', dict(content='1', input_kind='value',
                                 status=400, error=INVALID)),
        ('wrong-shaped installed key', dict(content='{"installed": 5}',
                                            input_kind='value', status=400,
                                            error=INVALID)),
        ('wrong-shaped web key', dict(content='{"web": []}',
                                      input_kind='value', status=400,
                                      error=INVALID)),
        ('falsy non-object web with object installed', dict(
            content='{"web": 0, "installed": {"client_id": "i"}}',
            input_kind='value', status=400, error=INVALID)),
        ('unreadable file', dict(content=INSTALLED, input_kind='value',
                                 open_error=PermissionError('denied'),
                                 status=400, error=UNREADABLE)),
        ('path component is a file', dict(
            content=INSTALLED, input_kind='value', parent_is_file=True,
            status=200, error=NOT_FOUND)),
        ('file vanished before open', dict(
            content=INSTALLED, input_kind='value',
            open_error=FileNotFoundError('gone'), status=400,
            error=UNREADABLE)),
        ('I/O error is not turned into a 400', dict(
            content=INSTALLED, input_kind='value',
            open_error=OSError(5, 'EIO'), expect_exception=OSError)),
        ('missing client_secret_file', dict(content=None, input_kind='absent',
                                            status=200, error=NOT_FOUND)),
        ('empty client_secret_file', dict(content=None, input_kind='empty',
                                          status=200, error=NOT_FOUND)),
        ('non-string client_secret_file', dict(content=None,
                                               input_kind='int', status=200,
                                               error=NOT_FOUND)),
        ('path does not exist', dict(content=None, input_kind='value',
                                     status=200, error=NOT_FOUND)),
        ('valid installed secret', dict(content=INSTALLED, input_kind='value',
                                        status=200, success=True)),
        ('valid JSON without auth_uri', dict(content=NO_AUTH_URI,
                                             input_kind='value', status=200,
                                             success=False,
                                             skip_error=True)),
        ('the resolved path is the one opened', dict(
            content='SELECT 1;', input_kind='value', status=200,
            success=True, mapped=True, client_id='mapped-client-id')),
        ('an encoded path is decoded once', dict(
            content=INSTALLED, input_kind='value', status=200, success=True,
            encoded=True, client_id='encoded-client-id')),
    ]

    def runTest(self):
        from flask import Flask
        from flask_babel import Babel
        from pgadmin.misc.cloud import google as google_mod

        tmp = tempfile.mkdtemp()
        try:
            value = _path_for(tmp, self.content,
                              getattr(self, 'directory', False),
                              self.input_kind)
            payload = {'cloud': 'google', 'secret': {}}
            if getattr(self, 'parent_is_file', False):
                value = os.path.join(value, 'client_secret.json')
            if self.input_kind != 'absent':
                payload['secret']['client_secret_file'] = value
            resolver_called = []
            mapped = None
            if getattr(self, 'mapped', False):
                mapped = os.path.join(tmp, 'mapped.json')
                with open(mapped, 'w') as f:
                    f.write(json.dumps({'installed': MAPPED}))
            if getattr(self, 'encoded', False):
                # literal %2F in the dir name catches double-unquote
                spot = os.path.join(tmp, 'a%2Fb')
                os.mkdir(spot)
                target = os.path.join(spot, 'client_secret.json')
                with open(target, 'w') as f:
                    f.write(json.dumps({'installed': ENCODED}))
                value = target
                payload['secret']['client_secret_file'] = quote(value, safe='')

            def resolve(path, *args, **kwargs):
                resolver_called.append(path)
                return mapped if mapped else path

            app = Flask(__name__)
            app.secret_key = 'test'
            Babel(app)
            real_open = open
            open_error = getattr(self, 'open_error', None)
            opened = []

            def guarded_open(path, *args, **kwargs):
                if open_error is not None and path == value:
                    raise open_error
                opened.append((path, args, kwargs))
                return real_open(path, *args, **kwargs)

            with app.test_request_context(
                    '/google/verify_credentials/', method='POST',
                    headers={'Origin': 'http://localhost'},
                    data=json.dumps(payload),
                    content_type='application/json'):
                with patch.object(
                        google_mod, 'filename_with_file_manager_path',
                        side_effect=resolve), \
                        patch('builtins.open', side_effect=guarded_open):
                    if getattr(self, 'expect_exception', None):
                        with self.assertRaises(self.expect_exception) as cm:
                            inspect.unwrap(
                                google_mod.verify_credentials)()
                        self.assertIs(cm.exception, self.open_error)
                        return
                    response = inspect.unwrap(
                        google_mod.verify_credentials)()

            body = json.loads(response.data)
            self.assertEqual(response.status_code, self.status, body)
            if not getattr(self, 'skip_error', False):
                self.assertEqual(body.get('errormsg'),
                                 getattr(self, 'error', None), body)
            else:
                self.assertTrue(body.get('errormsg'), body)
                self.assertNotEqual(body.get('errormsg'), INVALID, body)
            if getattr(self, 'success', False):
                self.assertTrue(body.get('success'), body)
                auth_url = (body.get('data') or {}).get('auth_url', '')
                self.assertTrue(auth_url.startswith('https://'), body)
                if getattr(self, 'client_id', None):
                    self.assertIn('client_id=' + self.client_id, auth_url,
                                  body)
                expected = mapped if mapped else value
                self.assertEqual([c[0] for c in opened], [expected],
                                 'exactly the resolved path is opened')
                self.assertEqual(opened[0][1], ('r',),
                                 'the file is opened for reading')
                self.assertEqual(opened[0][2].get('encoding'), 'utf-8',
                                 'the file is read as UTF-8')
            else:
                self.assertFalse(body.get('success'), body)
            if self.input_kind in ('absent', 'empty', 'int'):
                self.assertEqual(resolver_called, [],
                                 'the resolver must not run without a path')
            elif getattr(self, 'encoded', False):
                self.assertEqual(resolver_called, [value],
                                 'the path must be URL-decoded first')
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class _ManagedSessionInterface(SessionInterface):
    def open_session(self, app, request):
        return ManagedSession()

    def save_session(self, app, session, response):
        pass


class TestGoogleClientSecretClearsSession(_SkipServerSetUpMixin,
                                          BaseTestGenerator):
    """Failed validation drops the cached Google session."""

    scenarios = [
        ('invalid file', dict(content='SELECT 1;')),
        ('wrong-shaped file', dict(content='1')),
        ('unreadable file', dict(open_error=PermissionError('denied'))),
    ]

    def runTest(self):
        from flask import Flask
        from flask_babel import Babel
        from pgadmin.misc.cloud import google as google_mod

        tmp = tempfile.mkdtemp()
        try:
            path = os.path.join(tmp, 'client_secret.json')
            with open(path, 'w') as f:
                f.write(getattr(self, 'content', None) or INSTALLED)
            app = Flask(__name__)
            app.secret_key = 'test'
            app.session_interface = _ManagedSessionInterface()
            Babel(app)
            real_open = open
            open_error = getattr(self, 'open_error', None)

            def guarded_open(target, *args, **kwargs):
                if open_error is not None and target == path:
                    raise open_error
                return real_open(target, *args, **kwargs)

            with app.test_request_context(
                    '/google/verify_credentials/', method='POST',
                    headers={'Origin': 'http://localhost'},
                    data=json.dumps({'cloud': 'google',
                                     'secret': {
                                         'client_secret_file': path}}),
                    content_type='application/json'), \
                    patch.object(google_mod,
                                 'filename_with_file_manager_path',
                                 side_effect=lambda p, *a, **k: p), \
                    patch('builtins.open', side_effect=guarded_open):
                session['google'] = {'state': {'verified': True}}
                session.force_write = False
                response = inspect.unwrap(
                    google_mod.verify_credentials)()
                self.assertEqual(response.status_code, 400)
                self.assertNotIn('google', session)
                self.assertTrue(session.force_write)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
