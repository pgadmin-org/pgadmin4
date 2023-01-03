# -*- coding: utf-8 -*-
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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


class TestDownloadCSV(BaseTestGenerator):
    """
    This class validates download csv
    """
    scenarios = [
        (
            'Download csv URL with valid query',
            dict(
                sql='SELECT 1 as "A",2 as "B",3 as "C"',
                init_url='/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}',
                donwload_url="/sqleditor/query_tool/download/{0}",
                output_columns='"A","B","C"',
                output_values='1,2,3',
                is_valid_tx=True,
                is_valid=True,
                download_as_txt=False,
                filename='test.csv'
            )
        ),
        (
            'Download csv URL with wrong TX id',
            dict(
                sql='SELECT 1 as "A",2 as "B",3 as "C"',
                init_url='/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}',
                donwload_url="/sqleditor/query_tool/download/{0}",
                output_columns=None,
                output_values=None,
                is_valid_tx=False,
                is_valid=False,
                download_as_txt=False,
                filename='test.csv'
            )
        ),
        (
            'Download csv URL with wrong query',
            dict(
                sql='SELECT * FROM this_table_does_not_exist',
                init_url='/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}',
                donwload_url="/sqleditor/query_tool/download/{0}",
                output_columns=None,
                output_values=None,
                is_valid_tx=True,
                is_valid=False,
                download_as_txt=False,
                filename='test.csv'
            )
        ),
        (
            'Download as txt without filename parameter',
            dict(
                sql='SELECT 1 as "A",2 as "B",3 as "C"',
                init_url='/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}',
                donwload_url="/sqleditor/query_tool/download/{0}",
                output_columns='"A";"B";"C"',
                output_values='1;2;3',
                is_valid_tx=True,
                is_valid=True,
                download_as_txt=True,
                filename=None
            )
        ),
        (
            'Download as csv without filename parameter',
            dict(
                sql='SELECT 1 as "A",2 as "B",3 as "C"',
                init_url='/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}',
                donwload_url="/sqleditor/query_tool/download/{0}",
                output_columns='"A","B","C"',
                output_values='1,2,3',
                is_valid_tx=True,
                is_valid=True,
                download_as_txt=False,
                filename=None
            )
        ),
    ]

    def setUp(self):
        self._db_name = 'download_results_' + str(
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

        # Query tool polling
        url = '/sqleditor/poll/{0}'.format(trans_id)
        response = self.tester.get(url)
        return response

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
        response = self.tester.post(url)
        self.assertEqual(response.status_code, 200)

        res = self.initiate_sql_query_tool(self.trans_id, self.sql)

        # If invalid tx test then make the Tx id invalid so that tests fails
        if not self.is_valid_tx:
            self.trans_id = self.trans_id + '007'

        # Check character
        url = self.donwload_url.format(self.trans_id)
        # Disable the console logging from Flask logger
        self.app.logger.disabled = True
        if not self.is_valid and self.is_valid_tx:
            # When user enters wrong query, poll will throw 500, so expecting
            # 500, as poll is never called for a wrong query.
            self.assertEqual(res.status_code, 500)
        elif self.filename is None:
            if self.download_as_txt:
                with patch('pgadmin.tools.sqleditor.blueprint.'
                           'csv_field_separator.get', return_value=';'), patch(
                        'time.time', return_value=1587031962.3808076):
                    response = self.tester.post(url, data={"query": self.sql})
                    headers = dict(response.headers)
                    # when valid query
                    self.assertEqual(response.status_code, 200)
                    csv_data = response.data.decode()
                    self.assertTrue(self.output_columns in csv_data)
                    self.assertTrue(self.output_values in csv_data)
                    self.assertIn('text/plain', headers['Content-Type'])
                    self.assertIn('1587031962.txt',
                                  headers['Content-Disposition'])
            else:
                with patch('time.time', return_value=1587031962.3808076):
                    response = self.tester.post(url, data={"query": self.sql})
                    headers = dict(response.headers)
                    # when valid query
                    self.assertEqual(response.status_code, 200)
                    csv_data = response.data.decode()
                    self.assertTrue(self.output_columns in csv_data)
                    self.assertTrue(self.output_values in csv_data)
                    self.assertIn('text/csv', headers['Content-Type'])
                    self.assertIn('1587031962.csv',
                                  headers['Content-Disposition'])

        else:
            response = self.tester.post(
                url,
                data={"query": self.sql, "filename": self.filename}
            )
            headers = dict(response.headers)
            # Enable the console logging from Flask logger
            self.app.logger.disabled = False
            if self.is_valid:
                # when valid query
                self.assertEqual(response.status_code, 200)
                csv_data = response.data.decode()
                self.assertTrue(self.output_columns in csv_data)
                self.assertTrue(self.output_values in csv_data)
                self.assertIn('text/csv', headers['Content-Type'])
                self.assertIn(self.filename, headers['Content-Disposition'])
            elif not self.is_valid and self.is_valid_tx:
                # When user enters wrong query
                self.assertEqual(response.status_code, 200)
                response_data = json.loads(response.data.decode('utf-8'))
                self.assertFalse(response_data['data']['status'])
                self.assertTrue(
                    'relation "this_table_does_not_exist" does not exist' in
                    response_data['data']['result']
                )
            else:
                # when TX id is invalid
                self.assertEqual(response.status_code, 500)

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
