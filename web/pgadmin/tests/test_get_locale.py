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
        # The 'language' form field sets the language for this request and
        # must persist it to the session for subsequent requests.
        from flask import session
        with self.app.test_request_context(
                '/', method='POST', data={'language': 'fr'}):
            self.assertEqual(self._get_locale(), 'fr')
            self.assertEqual(session.get('PGADMIN_LANGUAGE'), 'fr')

        # A request with no 'language' field but an existing session value
        # must keep using that language.
        with self.app.test_request_context('/'):
            session['PGADMIN_LANGUAGE'] = 'de'
            self.assertEqual(self._get_locale(), 'de')

        # With no session value, the PGADMIN_LANGUAGE cookie must be read.
        with self.app.test_request_context(
                '/', headers={'Cookie': 'PGADMIN_LANGUAGE=it'}):
            self.assertEqual(self._get_locale(), 'it')
