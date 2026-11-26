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
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import async_poll

# Every possible byte value, so the round trip covers all of them.
ALL_BYTES = bytes(range(256))
ALL_BYTES_HEX = '\\x' + ALL_BYTES.hex()

SQL = (
    "SELECT decode(string_agg(lpad(to_hex(i), 2, '0'), '' ORDER BY i), "
    "'hex') AS b, NULL::bytea AS n, "
    "ARRAY['\\x01'::bytea, '\\xff'::bytea] AS a "
    "FROM generate_series(0, 255) i"
)


class TestByteaDisplayHex(BaseTestGenerator):
    """Check the 'Show binary data as hex?' preference for bytea values
    in the Query Tool results."""

    scenarios = [
        ('bytea is shown as a placeholder when the preference is off',
         dict(bytea_as_hex=False,
              expected=['binary data', None, 'binary data'])),
        ('bytea is shown as hex when the preference is on',
         dict(bytea_as_hex=True,
              expected=[ALL_BYTES_HEX, None, '{"\\\\x01","\\\\xff"}'])),
    ]

    def setUp(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]
        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps({
            "dbname": self.db_name
        }))
        self.assertEqual(response.status_code, 200)

    def runTest(self):
        with patch('pgadmin.tools.sqleditor.utils.start_running_query'
                   '.get_display_bytea_as_hex',
                   return_value=self.bytea_as_hex):
            response = self.tester.post(
                '/sqleditor/query_tool/start/{0}'.format(self.trans_id),
                data=json.dumps({"sql": SQL}), content_type='html/json')
        self.assertEqual(response.status_code, 200)

        response = async_poll(
            tester=self.tester,
            poll_url='/sqleditor/poll/{0}'.format(self.trans_id))
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data.decode('utf-8'))['data']['result']
        self.assertEqual(result[0], self.expected)

        if self.bytea_as_hex:
            self._check_round_trip(result[0][0])

    def _check_round_trip(self, hex_text):
        # The hex text shown must be valid bytea input that gives back
        # exactly the original bytes, so a copied value is never corrupted.
        conn = utils.get_db_connection(
            self.db_name, self.server['username'],
            self.server['db_password'], self.server['host'],
            self.server['port'], self.server['sslmode'])
        try:
            # Compare on the server: pgAdmin registers a text loader for
            # bytea globally, so the driver would not hand back bytes here.
            cur = conn.cursor()
            cur.execute("SELECT %s::bytea = decode(%s, 'hex')",
                        (hex_text, ALL_BYTES.hex()))
            self.assertTrue(cur.fetchone()[0])
        finally:
            conn.close()

    def tearDown(self):
        response = self.tester.delete(
            '/sqleditor/close/{0}'.format(self.trans_id))
        self.assertEqual(response.status_code, 200)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
