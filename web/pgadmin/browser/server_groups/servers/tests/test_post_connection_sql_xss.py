##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Integration test for the XSS fix in the post-connection-SQL flow.

When an attacker-controlled (or malicious) PostgreSQL server returns an
HTML-laden ErrorResponse for a post-connection-SQL query, the JSON the
connect endpoint returns must contain the HTML-escaped (entity-encoded)
text in `errormsg`, not the raw markup. This exercises the real
execute_post_connection_sql → sanitize_driver_message → make_json_response
chain through the Flask test client, not a unit-level mock of either side.

The test sets `post_connection_sql` to a query referencing a relation
whose name contains HTML; real PostgreSQL responds with an error message
that includes the relation name verbatim, which is exactly the situation
the fix protects against.
"""

import sqlite3
import json

import config
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


XSS_RELATION = '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">'


class TestPostConnectionSqlXssEscaped(BaseTestGenerator):
    """Connect to a server whose post-connection SQL fails with a PG error
    that quotes back an HTML payload, and verify the JSON response
    `errormsg` field is HTML-escaped (entities) rather than raw markup."""

    scenarios = [
        ('post-connection SQL error is HTML-escaped in the JSON response',
         dict()),
    ]

    def setUp(self):
        self.server_id = utils.create_server(self.server)
        # post_connection_sql isn't supported by create_server — add it
        # directly. The crafted SQL references a relation that does not
        # exist; real PostgreSQL responds with an error message of the
        # form  relation "<iframe ...>" does not exist  which is exactly
        # the kind of attacker-influenced content the fix has to neutralise.
        conn = sqlite3.connect(config.TEST_SQLITE_PATH)
        try:
            cur = conn.cursor()
            cur.execute(
                'UPDATE server SET post_connection_sql=? WHERE id=?',
                ('SELECT * FROM "' + XSS_RELATION + '"', self.server_id))
            conn.commit()
        finally:
            conn.close()
        utils.write_node_info(
            "sid", {"server_id": self.server_id})

    def runTest(self):
        url = '/browser/server/connect/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        payload = dict(self.server)
        payload['password'] = self.server['db_password']
        response = self.tester.post(
            url, data=json.dumps(payload), content_type='html/json')

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # The connection itself must succeed (the failure is in the
        # post-connection SQL, not the connection handshake).
        self.assertEqual(data.get('success'), 1)
        self.assertTrue(data.get('data', {}).get('connected'))

        errmsg = data.get('errormsg') or ''
        # The PostgreSQL error must have been observed and embedded.
        self.assertIn('Failed to execute the post connection SQL', errmsg)
        # The raw HTML payload must NOT survive verbatim — it must be
        # HTML-escaped to inert entities by sanitize_driver_message.
        self.assertNotIn('<iframe', errmsg)
        self.assertNotIn('<script', errmsg)
        # The entity-encoded form must be present.
        self.assertIn('&lt;iframe', errmsg)
        # Ampersand of the inner &lt;script&gt; payload must be
        # double-encoded (&amp;lt;) — proves the escape ran end-to-end
        # rather than the input simply being passed through.
        self.assertIn('&amp;lt;script', errmsg)

    def tearDown(self):
        utils.delete_server_with_api(self.tester, self.server_id)
