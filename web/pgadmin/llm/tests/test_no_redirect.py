##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that LLM API requests never follow HTTP redirects.

validate_api_url() only checks the URL pgAdmin was configured with, so a
redirect would otherwise reach a destination that check was never applied
to. urlopen_no_redirect() must refuse every redirect status code instead.
"""

import json
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.llm.utils import urlopen_no_redirect


def _make_server(redirect_code):
    """
    Start a local server that redirects /redirect to /target.

    Returns (base_url, server, target_hits), where target_hits has the
    request method appended to it every time /target is actually
    reached, so a test can prove the redirect was not followed.
    """
    target_hits = []

    class Handler(BaseHTTPRequestHandler):
        def _respond(self):
            length = int(self.headers.get('Content-Length') or 0)
            if length:
                self.rfile.read(length)

            if self.path == '/redirect':
                self.send_response(redirect_code)
                self.send_header('Location', '/target')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return

            if self.path == '/target':
                target_hits.append(self.command)

            body = json.dumps({'path': self.path}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        do_GET = _respond
        do_POST = _respond

        def log_message(self, fmt, *args):
            """Keep the test output quiet."""
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    host, port = server.server_address[:2]
    return 'http://%s:%d' % (host, port), server, target_hits


class NoRedirectTestCase(BaseTestGenerator):
    """urlopen_no_redirect() must refuse every redirect status code."""

    scenarios = [
        ('%s %d is refused' % (method, code), dict(method=method, code=code))
        for code in (301, 302, 303, 307, 308)
        for method in ('GET', 'POST')
    ]

    def setUp(self):
        self.base_url, self.server, self.target_hits = \
            _make_server(self.code)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def runTest(self):
        request = urllib.request.Request(
            self.base_url + '/redirect',
            data=b'{}' if self.method == 'POST' else None,
            method=self.method
        )

        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urlopen_no_redirect(request, timeout=10)

        self.assertEqual(ctx.exception.code, self.code)
        self.assertIn('ALLOWED_LLM_API_URLS', str(ctx.exception))
        # The redirect target must never have been contacted.
        self.assertEqual(self.target_hits, [])


class RedirectFixtureControlTestCase(BaseTestGenerator):
    """Control cases for the refusal tests above.

    Without the first of these, NoRedirectTestCase could pass simply
    because the test server never issued a redirect in the first place.
    """

    scenarios = [
        ('Default urlopen does follow the redirect', dict(follow=True)),
        ('A normal 200 response is returned unchanged', dict(follow=False)),
    ]

    def setUp(self):
        self.base_url, self.server, self.target_hits = _make_server(302)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def runTest(self):
        if self.follow:
            request = urllib.request.Request(self.base_url + '/redirect')
            with urllib.request.urlopen(request, timeout=10) as response:
                body = json.loads(response.read().decode('utf-8'))
            self.assertEqual(body['path'], '/target')
            self.assertEqual(self.target_hits, ['GET'])
        else:
            request = urllib.request.Request(self.base_url + '/target')
            with urlopen_no_redirect(request, timeout=10) as response:
                body = json.loads(response.read().decode('utf-8'))
            self.assertEqual(body['path'], '/target')
            self.assertEqual(self.target_hits, ['GET'])
