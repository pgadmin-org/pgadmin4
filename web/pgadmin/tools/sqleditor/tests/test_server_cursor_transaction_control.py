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

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression.python_test_utils import test_utils
from pgadmin.utils import server_utils
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import async_poll


class TestServerCursorTransactionControl(BaseTestGenerator):
    """
    With server cursor on, the toolbar's Commit and Rollback must leave the
    poll with no result set, so that the Query Tool shows the Messages tab
    rather than the previous query's columns. #8991
    """
    scenarios = [
        ('Commit after a query', dict(steps=['COMMIT'])),
        ('Rollback after a query', dict(steps=['ROLLBACK'])),
        ('Rollback after a commit', dict(steps=['COMMIT', 'ROLLBACK'])),
    ]

    def setUp(self):
        self._db_name = 'server_cursor_tc_' + str(
            secrets.choice(range(10000, 65535)))
        self._sid = self.server_information['server_id']
        server_utils.connect_server(self, self._sid)
        self._did = test_utils.create_database(self.server, self._db_name)

    def _run(self, sql):
        url = '/sqleditor/query_tool/start/{0}'.format(self.trans_id)
        response = self.tester.post(url, data=json.dumps({"sql": sql}),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)
        response = async_poll(
            tester=self.tester,
            poll_url='/sqleditor/poll/{0}'.format(self.trans_id))
        self.assertEqual(response.status_code, 200)
        return json.loads(response.data.decode())['data']

    def runTest(self):
        db_con = database_utils.connect_database(
            self, test_utils.SERVER_GROUP, self._sid, self._did)
        if db_con["info"] != "Database connected.":
            raise Exception("Could not connect to the database.")

        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, test_utils.SERVER_GROUP, self._sid, self._did)
        res = self.tester.post(url, data=json.dumps({
            "dbname": self._db_name
        }))
        self.assertEqual(res.status_code, 200)

        res = self.tester.post(
            '/sqleditor/server_cursor/{0}'.format(self.trans_id),
            data=json.dumps(True))
        self.assertEqual(res.status_code, 200)

        data = self._run('SELECT 1 AS a')
        self.assertEqual(data['status'], 'Success')
        self.assertIsNotNone(data['colinfo'])

        # Each statement is sent as the toolbar's button sends it.
        for tag in self.steps:
            data = self._run(tag + ';')
            self.assertEqual(data['status'], 'Success')
            self.assertIsNone(data['colinfo'])
            # The command tag comes last, after any warning such as the
            # one for a ROLLBACK with no transaction in progress.
            self.assertEqual(data['result'].splitlines()[-1], tag)
            # The transaction the server cursor lived in has ended.
            self.assertEqual(data['transaction_status'], 0)

        # The next query still runs under, and reports, a server cursor.
        data = self._run('SELECT 2 AS b')
        self.assertEqual(data['status'], 'Success')
        self.assertEqual(data['colinfo'][0]['name'], 'b')
        self.assertEqual(data['result'], [[2]])

        self.tester.delete('/sqleditor/close/{0}'.format(self.trans_id))
        database_utils.disconnect_database(self, self._sid, self._did)

    def tearDown(self):
        main_conn = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(main_conn, self._db_name)
