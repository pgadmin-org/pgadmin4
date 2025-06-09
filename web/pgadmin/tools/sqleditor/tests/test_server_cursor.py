# -*- coding: utf-8 -*-
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression.python_test_utils import test_utils
import json
from pgadmin.utils import server_utils
import secrets
import config
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import async_poll


class TestExecuteServerCursor(BaseTestGenerator):
    """
    This class validates download csv
    """
    scenarios = [
        (
            'Execute with server cursor',
            dict(
                sql='SELECT 1',
                init_url='/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}',
            )
        )
    ]

    def setUp(self):
        self._db_name = 'server_cursor_' + str(
            secrets.choice(range(10000, 65535)))
        self._sid = self.server_information['server_id']

        server_con = server_utils.connect_server(self, self._sid)

        self._did = test_utils.create_database(
            self.server, self._db_name
        )

    # This method is responsible for initiating query hit at least once,
    # so that download csv works
    def initiate_sql_query_tool(self, trans_id, sql_query):

        # This code is to ensure to create a async cursor so that downloading
        # csv can work.
        # Start query tool transaction

        url = '/sqleditor/query_tool/start/{0}'.format(trans_id)
        response = self.tester.post(url, data=json.dumps({"sql": sql_query}),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        return async_poll(tester=self.tester,
                          poll_url='/sqleditor/poll/{0}'.format(trans_id))

    def set_server_cursor(self, server_cursor):
        _url = '/sqleditor/server_cursor/{0}'.format(self.trans_id)
        print(_url)
        res = self.tester.post(_url, data=json.dumps({
            "server_cursor": server_cursor
        }))

        print(res)
        self.assertEqual(res.status_code, 200)

    def runTest(self):

        db_con = database_utils.connect_database(self,
                                                 test_utils.SERVER_GROUP,
                                                 self._sid,
                                                 self._did)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        # Initialize query tool
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = self.init_url.format(
            self.trans_id, test_utils.SERVER_GROUP, self._sid, self._did)
        res = self.tester.post(url, data=json.dumps({
            "dbname": self._db_name
        }))
        self.assertEqual(res.status_code, 200)

        self.set_server_cursor(True)

        response = self.initiate_sql_query_tool(self.trans_id, self.sql)

        self.assertEqual(response.status_code, 200)
        csv_data = response.data.decode()
        print(csv_data)

        self.set_server_cursor(False)

        # Close query tool
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)


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
