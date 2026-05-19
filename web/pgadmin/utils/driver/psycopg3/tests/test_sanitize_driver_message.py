##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.driver.psycopg3.text_sanitize \
    import sanitize_driver_message


class TestSanitizeDriverMessage(BaseTestGenerator):
    """Defense-in-depth scrub for driver-returned text used in user-facing
    error messages. Strips C0 control characters and DEL (preserving TAB,
    LF, CR) and HTML-escapes the result so any markup-like sequence
    rendered downstream is inert text."""

    scenarios = [
        ('strips NUL byte',
         dict(input='hello\x00world', expected='helloworld')),
        ('strips ESC for ANSI escape sequence',
         dict(input='red \x1b[31malert\x1b[0m', expected='red [31malert[0m')),
        ('strips DEL (0x7F)',
         dict(input='a\x7fb', expected='ab')),
        ('strips backspace and other C0 controls except TAB/LF/CR',
         dict(input='a\x01b\x02c\x08d', expected='abcd')),
        ('preserves TAB',
         dict(input='col\tvalue', expected='col\tvalue')),
        ('preserves LF',
         dict(input='line one\nline two', expected='line one\nline two')),
        ('preserves CR',
         dict(input='ret\rurn', expected='ret\rurn')),
        ('preserves CRLF as a pair',
         dict(input='one\r\ntwo', expected='one\r\ntwo')),
        ('HTML-escapes angle-bracket payload',
         dict(
             input='<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">',
             expected=(
                 '&lt;iframe srcdoc=&quot;'
                 '&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;'
                 '&quot;&gt;'),
         )),
        ('HTML-escapes a bare script tag',
         dict(input='<script>alert(1)</script>',
              expected='&lt;script&gt;alert(1)&lt;/script&gt;')),
        ('HTML-escapes ampersand and quotes',
         dict(input='a & b "c" \'d\'',
              expected='a &amp; b &quot;c&quot; &#x27;d&#x27;')),
        ('preserves unicode',
         dict(input='naïve résumé 中文', expected='naïve résumé 中文')),
        ('None input is returned unchanged',
         dict(input=None, expected=None)),
        ('non-string is stringified then scrubbed',
         dict(input=12345, expected='12345')),
        ('empty string round-trips',
         dict(input='', expected='')),
        ('preserves non-C0 whitespace (NBSP, narrow no-break space)',
         dict(input='a b c', expected='a b c')),
        ('preserves emoji and surrogate pairs',
         dict(input='warn \U0001f6a8 \U0001f4a5 done',
              expected='warn \U0001f6a8 \U0001f4a5 done')),
        ('strips controls interleaved with multibyte UTF-8 without '
         'corrupting the surrounding characters',
         dict(input='中\x00文 \x01naïve',
              expected='中文 naïve')),
        ('handles a long multi-line PG error',
         dict(input='ERROR:  ' + 'x' * 4096 + '\nDETAIL: y',
              expected='ERROR:  ' + 'x' * 4096 + '\nDETAIL: y')),
        ('escape order: controls stripped first, then HTML escape',
         dict(input='<\x00script\x01>',
              expected='&lt;script&gt;')),
        ('null byte adjacent to ampersand escapes correctly',
         dict(input='a\x00&b', expected='a&amp;b')),
    ]

    def runTest(self):
        observed = sanitize_driver_message(self.input)
        self.assertEqual(observed, self.expected)


class TestExecutePostConnectionSqlScrubsControlChars(BaseTestGenerator):
    """Wiring test: execute_post_connection_sql must route the
    driver-returned status string through sanitize_driver_message before
    embedding it into the user-facing errmsg. The body is exercised
    directly with a small stand-in for self._execute and a patched
    current_app.logger so the test does not need a real psycopg
    connection."""

    scenarios = [
        ('no post-connection SQL configured returns None',
         dict(post_sql='', execute_result='ignored',
              expected_is_none=True)),
        ('successful execute returns None',
         dict(post_sql='SELECT 1', execute_result=None,
              expected_is_none=True)),
        ('control bytes are scrubbed from the error text',
         dict(post_sql='SELECT 1',
              execute_result='boom\x00\x1b[31m\x7falert',
              expected_contains='boom[31malert',
              expected_excludes=['\x00', '\x1b', '\x7f'])),
        ('HTML payload is escaped to inert entities in the errmsg',
         dict(post_sql='SELECT 1',
              execute_result=(
                  '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">'),
              expected_contains='&lt;iframe srcdoc=&quot;',
              expected_excludes=['<iframe', '<script'])),
        ('multi-line PG error text is preserved',
         dict(post_sql='SELECT 1',
              execute_result='line one\nline two',
              expected_contains='line one\nline two',
              expected_excludes=[])),
    ]

    def runTest(self):
        from unittest.mock import MagicMock
        from flask import Flask
        from flask_babel import Babel
        from pgadmin.utils.driver.psycopg3.connection import Connection

        class FakeConn:
            def __init__(self, result):
                self._result = result

            def _execute(self, cur, sql):
                return self._result

        fake = FakeConn(self.execute_result)
        manager = MagicMock(post_connection_sql=self.post_sql)
        cur = MagicMock()

        # Real Flask app + Flask-Babel — the production code path uses
        # flask_babel.gettext, and an uninitialised Babel raises KeyError.
        # Initialising Babel here exercises the real gettext fallback
        # (return the source string verbatim when no translation matches).
        app = Flask(__name__)
        Babel(app)
        with app.app_context():
            errmsg = Connection.execute_post_connection_sql(
                fake, cur, manager)

        if getattr(self, 'expected_is_none', False):
            self.assertIsNone(errmsg)
            return

        self.assertIsNotNone(errmsg)
        self.assertIn(self.expected_contains, errmsg)
        for needle in self.expected_excludes:
            self.assertNotIn(needle, errmsg)
