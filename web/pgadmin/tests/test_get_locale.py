##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that the Babel locale_selector registered in create_app() reads
the selected UI language back from the session and cookie on requests that
don't include the 'language' form field (issue #10347).
"""

import config
from pgadmin.utils.route import BaseTestGenerator


class GetLocaleTestCase(BaseTestGenerator):
    """Exercises pgadmin.__init__.create_app()'s get_locale() directly via
    the Babel extension, bypassing the need for a database connection.
    """

    # No server interaction needed, so skip BaseTestGenerator.setUp's
    # connect_server().
    def setUp(self):
        self._orig_server_mode = config.SERVER_MODE
        config.SERVER_MODE = True

    def tearDown(self):
        config.SERVER_MODE = self._orig_server_mode

    def _get_locale(self):
        return self.app.extensions['babel'].locale_selector()

    def runTest(self):
        from flask import session
        from werkzeug.http import parse_cookie
        cookie_name = self.app.config['SESSION_COOKIE_NAME']

        # The 'language' form field sets the language for this request and
        # must persist it to the session. Save the session through the app's
        # real session interface to get the cookie a browser would send back.
        with self.app.test_request_context(
                '/', method='POST', data={'language': 'fr'}):
            self.assertEqual(self._get_locale(), 'fr')
            response = self.app.response_class()
            self.app.session_interface.save_session(
                self.app, session, response)

        session_cookie = None
        for header in response.headers.getlist('Set-Cookie'):
            value = parse_cookie(header).get(cookie_name)
            if value:
                session_cookie = value
        self.assertIsNotNone(session_cookie)

        # A later request with no 'language' field, carrying only the
        # session cookie, must restore the language from the saved session.
        with self.app.test_request_context(
                '/', headers={'Cookie': '%s=%s' % (cookie_name,
                                                   session_cookie)}):
            self.assertEqual(self._get_locale(), 'fr')

        # With no session value, the PGADMIN_LANGUAGE cookie must be read.
        with self.app.test_request_context(
                '/', headers={'Cookie': 'PGADMIN_LANGUAGE=it'}):
            self.assertEqual(self._get_locale(), 'it')

        # Values that aren't a key of config.LANGUAGES must fall back to the
        # default and must never be stored in the session, since flask-babel
        # raises on unknown locales and a stored bad value would then break
        # every later request.
        with self.app.test_request_context(
                '/', headers={'Cookie': 'PGADMIN_LANGUAGE=xx'}):
            self.assertEqual(self._get_locale(), 'en')
            self.assertNotIn('PGADMIN_LANGUAGE', session)

        with self.app.test_request_context(
                '/', method='POST', data={'language': 'xx'}):
            self.assertEqual(self._get_locale(), 'en')
            self.assertEqual(session.get('PGADMIN_LANGUAGE'), 'en')

        with self.app.test_request_context(
                '/', method='POST', data={'language': '<script>'}):
            self.assertEqual(self._get_locale(), 'en')
            self.assertEqual(session.get('PGADMIN_LANGUAGE'), 'en')

        # A session that already holds a bad value (for example one written
        # before this validation existed) must not be trusted either.
        with self.app.test_request_context('/'):
            session['PGADMIN_LANGUAGE'] = 'xx'
            self.assertEqual(self._get_locale(), 'en')

        # Go through flask-babel's own get_locale(), which passes whatever
        # the selector returns to Locale.parse(): an unknown language in the
        # form, and a planted cookie, must not raise. This is deliberately
        # not a request to a real page, since the app may have been created
        # in desktop mode (as CI does) and page templates then differ from
        # the server mode this test switches on.
        from flask_babel import get_locale as babel_get_locale
        with self.app.test_request_context(
                '/', method='POST', data={'language': 'xx'}):
            self.assertEqual(str(babel_get_locale()), 'en')
        with self.app.test_request_context(
                '/', headers={'Cookie': 'PGADMIN_LANGUAGE=xx'}):
            self.assertEqual(str(babel_get_locale()), 'en')
