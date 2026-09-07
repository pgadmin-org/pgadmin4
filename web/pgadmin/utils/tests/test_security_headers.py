##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for pgadmin.utils.security_headers.SecurityHeaders.

Covers the per-request CSP nonce (SecurityHeaders.get_nonce), the
``{nonce}`` substitution and pass-through behaviour of
get_content_security_policy, and the wiring in set_response_headers that
emits the Content-Security-Policy header only when a policy is configured.

Also covers the dev-mode 'unsafe-eval' behaviour of
get_content_security_policy:

  * When config.DEBUG is True AND the configured policy is a nonce policy
    (originally contained ``{nonce}``), ``'unsafe-eval'`` is appended to
    the ``script-src`` directive (without duplicating it if already
    present).
  * When config.DEBUG is False, or the policy is a non-nonce custom
    policy, the policy is returned unchanged (no forced 'unsafe-eval').
"""

import re
import unittest
from html.parser import HTMLParser
from unittest.mock import patch

from flask import Flask, g

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils import security_headers
from pgadmin.utils.security_headers import SecurityHeaders


# A nonce policy: contains the {nonce} placeholder in script-src.
NONCE_POLICY = (
    "default-src 'self' ws: http: data: blob:;"
    " script-src 'self' 'nonce-{nonce}';"
    " style-src 'self' 'unsafe-inline';"
)

# A custom policy WITHOUT the {nonce} placeholder - must be passed through
# byte-for-byte unchanged.
CUSTOM_NO_NONCE_POLICY = (
    "default-src 'self'; script-src 'self'; style-src 'self';"
)

# A nonce policy that already lists 'unsafe-eval' in script-src - dev-mode
# must NOT duplicate it.
NONCE_POLICY_WITH_UNSAFE_EVAL = (
    "default-src 'self' ws: http: data: blob:;"
    " script-src 'self' 'nonce-{nonce}' 'unsafe-eval';"
    " style-src 'self' 'unsafe-inline';"
)

# A nonce policy where the nonce sits only on default-src, with NO explicit
# script-src directive. Dev-mode has nothing to append to, so 'unsafe-eval'
# must be added nowhere (the agreed edge-case behaviour).
NONCE_POLICY_NO_SCRIPT_SRC = (
    "default-src 'self' 'nonce-{nonce}';"
    " style-src 'self' 'unsafe-inline';"
)

# A nonce policy that also carries a look-alike script-src-elem directive.
# Dev-mode must append 'unsafe-eval' to the exact 'script-src' only, never
# to 'script-src-elem'.
NONCE_POLICY_WITH_SCRIPT_SRC_ELEM = (
    "default-src 'self';"
    " script-src 'self' 'nonce-{nonce}';"
    " script-src-elem 'self';"
    " style-src 'self' 'unsafe-inline';"
)


class _SkipServerSetUpMixin:
    """Bypass BaseTestGenerator's Postgres server setUp - these are pure
    logic/wiring tests that need no live server or HTTP infrastructure."""

    def setUp(self):
        unittest.TestCase.setUp(self)


def _make_app():
    app = Flask(__name__)
    app.secret_key = 'test'
    return app


# ---------------------------------------------------------------------------
# get_nonce
# ---------------------------------------------------------------------------

class TestGetNonceCachedWithinRequest(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Within a single request context the nonce is generated once and
    cached on flask.g, so two calls return the identical value."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            first = SecurityHeaders.get_nonce()
            second = SecurityHeaders.get_nonce()

            self.assertEqual(first, second)
            # It really is cached on g (not merely equal by coincidence).
            self.assertEqual(g.csp_nonce, first)


class TestGetNonceDiffersAcrossRequests(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """Two separate request contexts get two independently generated
    nonces - a nonce must be unique per request."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            first = SecurityHeaders.get_nonce()
        with app.test_request_context():
            second = SecurityHeaders.get_nonce()

        self.assertNotEqual(first, second)


class TestGetNonceIsNonEmptyUrlSafe(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """The nonce is a non-empty URL-safe token (secrets.token_urlsafe),
    i.e. only [A-Za-z0-9_-] characters."""

    scenarios = [('default', dict())]

    def runTest(self):
        import string

        allowed = set(string.ascii_letters + string.digits + '-_')
        app = _make_app()
        with app.test_request_context():
            nonce = SecurityHeaders.get_nonce()

        self.assertIsInstance(nonce, str)
        self.assertTrue(len(nonce) > 0)
        self.assertTrue(
            set(nonce).issubset(allowed),
            "nonce contains non-urlsafe characters: %r" % nonce)


# ---------------------------------------------------------------------------
# get_content_security_policy
# ---------------------------------------------------------------------------

class TestCspNonceSubstituted(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """{nonce} in the configured policy is replaced with 'nonce-<value>'
    and that value equals get_nonce() for the same request."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config,
                              'CONTENT_SECURITY_POLICY', NONCE_POLICY):
                nonce = SecurityHeaders.get_nonce()
                csp = SecurityHeaders.get_content_security_policy()

        # The placeholder must be gone and the real nonce present.
        self.assertNotIn('{nonce}', csp)
        self.assertIn("'nonce-%s'" % nonce, csp)


class TestCspCustomPolicyUnchanged(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """A custom policy WITHOUT {nonce} is returned byte-for-byte
    unchanged."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config,
                              'CONTENT_SECURITY_POLICY',
                              CUSTOM_NO_NONCE_POLICY):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertEqual(csp, CUSTOM_NO_NONCE_POLICY)


class TestCspNonePolicyReturnsNone(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """A None / absent policy yields None (no CSP)."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config,
                              'CONTENT_SECURITY_POLICY', None):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertIsNone(csp)


class TestCspEmptyPolicyStaysFalsy(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """An empty-string policy stays falsy so no header is emitted."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config,
                              'CONTENT_SECURITY_POLICY', ''):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertFalse(csp)


# ---------------------------------------------------------------------------
# Dev-mode 'unsafe-eval' behaviour
#
# In debug mode a nonce based policy gets 'unsafe-eval' added to script-src,
# so development bundles (built with webpack's 'eval' devtool) are not
# blocked. The tests below verify that behaviour and its boundary conditions.
# ---------------------------------------------------------------------------

class TestDevModeNoncePolicyGetsUnsafeEval(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """DEBUG=True + nonce policy => script-src must contain 'unsafe-eval'
    (dev webpack bundles need it)."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config, 'DEBUG', True), \
                    patch.object(security_headers.config,
                                 'CONTENT_SECURITY_POLICY', NONCE_POLICY):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertIsNotNone(csp)
        script_src = _extract_directive(csp, 'script-src')
        self.assertIsNotNone(
            script_src, "no script-src directive found in: %r" % csp)
        self.assertIn(
            "'unsafe-eval'", script_src,
            "DEBUG=True nonce policy must add 'unsafe-eval' to script-src; "
            "got: %r" % script_src)


class TestProdModeNoncePolicyNoUnsafeEval(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """DEBUG=False + nonce policy => script-src must NOT contain
    'unsafe-eval'."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config, 'DEBUG', False), \
                    patch.object(security_headers.config,
                                 'CONTENT_SECURITY_POLICY', NONCE_POLICY):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertNotIn("'unsafe-eval'", csp)


class TestDevModeCustomPolicyUnchanged(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """DEBUG=True + non-nonce custom policy => returned unchanged (no
    forced 'unsafe-eval')."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config, 'DEBUG', True), \
                    patch.object(security_headers.config,
                                 'CONTENT_SECURITY_POLICY',
                                 CUSTOM_NO_NONCE_POLICY):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertEqual(csp, CUSTOM_NO_NONCE_POLICY)
        self.assertNotIn("'unsafe-eval'", csp)


class TestDevModeUnsafeEvalNotDuplicated(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """DEBUG=True + nonce policy that ALREADY lists 'unsafe-eval' =>
    'unsafe-eval' appears exactly once."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config, 'DEBUG', True), \
                    patch.object(security_headers.config,
                                 'CONTENT_SECURITY_POLICY',
                                 NONCE_POLICY_WITH_UNSAFE_EVAL):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertEqual(
            csp.count("'unsafe-eval'"), 1,
            "'unsafe-eval' must not be duplicated; got: %r" % csp)


class TestDevModeNoScriptSrcLeavesEvalOut(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """DEBUG=True + a nonce policy with NO explicit script-src directive =>
    'unsafe-eval' is added nowhere (agreed edge case: default-src-only nonce
    setups are left for the operator to handle). The nonce is still
    substituted."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config, 'DEBUG', True), \
                    patch.object(security_headers.config,
                                 'CONTENT_SECURITY_POLICY',
                                 NONCE_POLICY_NO_SCRIPT_SRC):
                csp = SecurityHeaders.get_content_security_policy()

        self.assertNotIn("'unsafe-eval'", csp)
        self.assertNotIn('{nonce}', csp)


class TestDevModeUnsafeEvalOnlyOnExactScriptSrc(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """DEBUG=True: 'unsafe-eval' is appended to the exact 'script-src'
    directive only, never to a look-alike 'script-src-elem'."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config, 'DEBUG', True), \
                    patch.object(security_headers.config,
                                 'CONTENT_SECURITY_POLICY',
                                 NONCE_POLICY_WITH_SCRIPT_SRC_ELEM):
                csp = SecurityHeaders.get_content_security_policy()

        script_src = _extract_directive(csp, 'script-src')
        script_src_elem = _extract_directive(csp, 'script-src-elem')
        self.assertIn("'unsafe-eval'", script_src)
        self.assertNotIn("'unsafe-eval'", script_src_elem)


class TestDevModePreservesNonceAndOtherDirectives(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """DEBUG=True nonce policy: script-src keeps its nonce AND gains
    'unsafe-eval', and unrelated directives (style-src) survive untouched."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        with app.test_request_context():
            with patch.object(security_headers.config, 'DEBUG', True), \
                    patch.object(security_headers.config,
                                 'CONTENT_SECURITY_POLICY', NONCE_POLICY):
                nonce = SecurityHeaders.get_nonce()
                csp = SecurityHeaders.get_content_security_policy()

        script_src = _extract_directive(csp, 'script-src')
        self.assertIn("'nonce-%s'" % nonce, script_src)
        self.assertIn("'unsafe-eval'", script_src)
        self.assertIn("style-src 'self' 'unsafe-inline'", csp)


# ---------------------------------------------------------------------------
# set_response_headers
# ---------------------------------------------------------------------------

class _StubResponse:
    """Minimal stand-in for a Flask Response - only .headers is used by
    set_response_headers."""

    def __init__(self):
        self.headers = {}


class TestSetResponseHeadersEmitsCsp(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """When a policy is configured (truthy), set_response_headers writes
    the Content-Security-Policy header (with the nonce substituted)."""

    scenarios = [('default', dict())]

    def runTest(self):
        app = _make_app()
        response = _StubResponse()
        with app.test_request_context():
            with patch.object(security_headers.config,
                              'CONTENT_SECURITY_POLICY', NONCE_POLICY):
                SecurityHeaders.set_response_headers(response)

        self.assertIn('Content-Security-Policy', response.headers)
        self.assertNotIn(
            '{nonce}', response.headers['Content-Security-Policy'])


class TestSetResponseHeadersOmitsCspWhenNone(
        _SkipServerSetUpMixin, BaseTestGenerator):
    """When the policy is None or empty, no Content-Security-Policy header
    is written."""

    scenarios = [
        ('None policy', dict(policy=None)),
        ('empty policy', dict(policy='')),
    ]

    def runTest(self):
        app = _make_app()
        response = _StubResponse()
        with app.test_request_context():
            with patch.object(security_headers.config,
                              'CONTENT_SECURITY_POLICY', self.policy):
                SecurityHeaders.set_response_headers(response)

        self.assertNotIn('Content-Security-Policy', response.headers)


def _extract_directive(csp, directive):
    """Return the body of a CSP directive (without its name), or None.

    e.g. _extract_directive("a 'self'; script-src 'self' 'nonce-x';",
    'script-src') -> "'self' 'nonce-x'".
    """
    for part in csp.split(';'):
        part = part.strip()
        if part.startswith(directive + ' ') or part == directive:
            return part[len(directive):].strip()
    return None


class _InlineTagCollector(HTMLParser):
    """Collect inline <script> (no src) and <style> tags with their nonce.

    Records one dict per inline tag: {'tag': ..., 'nonce': <value|None>}.
    External <script src=...> is ignored - the nonce requirement is about
    inline content only (external scripts are governed by the source list).
    """

    def __init__(self):
        super().__init__()
        self.inline_tags = []

    def handle_starttag(self, tag, attrs):
        if tag not in ('script', 'style'):
            return
        attr = dict(attrs)
        if tag == 'script' and attr.get('src') is not None:
            return
        self.inline_tags.append({'tag': tag, 'nonce': attr.get('nonce')})


class TestRenderedPageInlineTagsCarryNonce(BaseTestGenerator):
    """Rendered-page regression test (goes through the real test client).

    Asserts the two properties the isolated unit tests cannot cover:

      1. Every inline <script>/<style> in the returned HTML carries a
         nonce equal to the nonce in the Content-Security-Policy header.
      2. There are therefore no untagged inline <script>/<style> tags -
         the failure mode when someone adds one to a template later.

    Harness quirk (documented so nobody "fixes" it): regression/runtests.py
    pushes a long-lived app context and the nonce is cached on flask.g, so
    the nonce does NOT change between requests here. This test asserts only
    the header/DOM *match* and tag coverage - never nonce freshness.
    """

    scenarios = [('login page', dict())]

    def runTest(self):
        # Pin a nonce policy so the header is deterministic regardless of
        # the harness's configured CONTENT_SECURITY_POLICY.
        with patch.object(security_headers.config,
                          'CONTENT_SECURITY_POLICY', NONCE_POLICY):
            res = self.tester.get('/login', follow_redirects=True)

        self.assertEqual(res.status_code, 200)

        csp = res.headers.get('Content-Security-Policy', '')
        match = re.search(r"'nonce-([^']+)'", csp)
        self.assertIsNotNone(
            match, "CSP header carried no nonce: %r" % csp)
        header_nonce = match.group(1)

        collector = _InlineTagCollector()
        collector.feed(res.data.decode('utf-8', 'replace'))

        # Sanity: the page must contain inline tags, else the test proves
        # nothing (e.g. wrong route, or template stopped rendering).
        self.assertTrue(
            collector.inline_tags,
            "No inline <script>/<style> found; test target is wrong.")

        untagged = [t for t in collector.inline_tags if t['nonce'] is None]
        self.assertEqual(
            untagged, [],
            "Untagged inline tag(s) missing a nonce: %r" % untagged)

        mismatched = [t for t in collector.inline_tags
                      if t['nonce'] != header_nonce]
        self.assertEqual(
            mismatched, [],
            "Inline tag nonce(s) do not match CSP header nonce %r: %r"
            % (header_nonce, mismatched))
