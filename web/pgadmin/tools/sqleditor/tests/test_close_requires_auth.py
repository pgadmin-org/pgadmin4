##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import secrets

import config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils


class TestSqlEditorCloseRequiresAuth(BaseTestGenerator):
    """
    Regression test for the unauthenticated session-deserialization RCE
    chain in the SQL Editor close/update endpoints.

    The 'close' and 'update_sqleditor_connection' routes reach
    pickle.loads on session['gridData'][trans_id]['command_obj'] via
    close_sqleditor_session() / check_transaction_status(). Both must
    require an authenticated session so the deserialization sink is
    unreachable to an attacker who possesses only a valid CSRF token
    (e.g. one harvested from GET /login) but no authenticated pgAdmin
    session.

    Skipped in DESKTOP mode because pgAdmin's before_request hook
    auto-re-authenticates as DESKTOP_USER on every request there, so
    no decorator can be exercised in an "unauthenticated" state.
    """

    scenarios = [
        ('DELETE /sqleditor/close/<trans_id> rejects unauthenticated',
         dict(
             method='delete',
             url_template='/sqleditor/close/{trans_id}',
         )),
        ('POST /sqleditor/.../update_connection/... rejects unauthenticated',
         dict(
             method='post',
             url_template=(
                 '/sqleditor/initialize/sqleditor/update_connection/'
                 '{trans_id}/{sgid}/{sid}/{did}'
             ),
         )),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest(
                'Auth decorator only exercisable in SERVER mode; '
                'DESKTOP mode auto-re-authenticates on every request.'
            )

        # Drop the authenticated session, then prime a CSRF token the way
        # the attack chain in the report does: harvest one from GET /login.
        # This isolates the test to the auth decorator — CSRF check must
        # NOT be what rejects the request.
        self.tester.logout()
        res = self.tester.get('/login', follow_redirects=False)
        self.tester.csrf_token = self.tester.fetch_csrf(res)
        self.assertIsNotNone(
            self.tester.csrf_token,
            'Could not harvest CSRF from /login; test cannot proceed.'
        )

    def runTest(self):
        url = self.url_template.format(
            trans_id=secrets.choice(range(1, 9999999)),
            sgid=utils.SERVER_GROUP,
            sid=1,
            did=1,
        )

        http = getattr(self.tester, self.method)
        response = http(url, data=json.dumps({}))

        # flask_security redirects unauthenticated browser requests to
        # the login page (302). What matters is the route body — and
        # the pickle.loads behind it — never runs.
        self.assertNotEqual(
            response.status_code, 200,
            'Unauthenticated request reached the route body — '
            '@pga_login_required is missing or bypassed (status=200).'
        )
        self.assertIn(
            response.status_code, (301, 302, 401, 403),
            'Expected auth redirect or unauthorized; got {0} body={1!r}'
            .format(response.status_code, response.data[:200])
        )

    def tearDown(self):
        if config.SERVER_MODE:
            utils.login_tester_account(self.tester)
