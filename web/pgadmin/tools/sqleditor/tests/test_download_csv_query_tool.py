# -*- coding: utf-8 -*-
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import codecs
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


class TestDownloadCSV(BaseTestGenerator):
    """
    This class validates download csv
    """
    scenarios = [
        (
            'Download csv URL with valid query',
            dict(
                sql='SELECT 1 as "A",2 as "B",3 as "C",2300::numeric'
                    ' as "Price"',
                init_url='/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}',
                donwload_url="/sqleditor/query_tool/download/{0}",
                output_columns='"A","B","C","Price"',
                output_values='1,2,3,2300',
                is_valid_tx=True,
                is_valid=True,
                download_as_txt=False,
                filename='test.csv',
                query_commited=True
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
                filename='test.csv',
                query_commited=False
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
                filename='test.csv',
                query_commited=False
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
                filename=None,
                query_commited=False
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
                filename=None,
                query_commited=False
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

        return async_poll(tester=self.tester,
                          poll_url='/sqleditor/poll/{0}'.format(trans_id))

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
        response = self.tester.post(url, data=json.dumps({
            "dbname": self._db_name
        }))
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
            # The result will be null and status code will be 500
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
            data = {
                "query": self.sql,
                "filename": self.filename,
                "query_commited": self.query_commited
            }
            response = self.tester.post(
                url,
                data=data
            )
            headers = dict(response.headers)
            # Enable the console logging from Flask logger
            self.app.logger.disabled = False
            if self.is_valid:
                # when valid query
                self.assertEqual(response.status_code, 200)
                csv_data = response.data.decode()
                self.assertIn(self.output_columns, csv_data)
                self.assertIn(self.output_values, csv_data)
                self.assertIn('text/csv', headers['Content-Type'])
                self.assertIn(self.filename, headers['Content-Disposition'])
            elif not self.is_valid and self.is_valid_tx:
                # When user enters wrong query
                self.assertEqual(response.status_code, 200)
                response_data = json.loads(response.data.decode('utf-8'))
                self.assertFalse(response_data['data']['status'])
                self.assertIn(
                    'relation "this_table_does_not_exist" does not exist',
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


class TestDownloadResultFormats(BaseTestGenerator):
    """
    Validates downloading query results as JSON and XML, the UTF BOM option
    and the output file encoding option.
    """
    SQL = 'SELECT 1 as "A", 2 as "B", \'x\' as "C"'
    INIT_URL = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'
    DOWNLOAD_URL = '/sqleditor/query_tool/download/{0}'

    scenarios = [
        (
            'Download results as JSON',
            dict(data_format='json', add_bom=False, encoding='utf-8',
                 expected_content_type='application/json',
                 expected_extension='.json')
        ),
        (
            'Download results as XML',
            dict(data_format='xml', add_bom=False, encoding='utf-8',
                 expected_content_type='application/xml',
                 expected_extension='.xml')
        ),
        (
            'Download CSV with a UTF BOM',
            dict(data_format='csv', add_bom=True, encoding='utf-8',
                 expected_content_type='text/csv',
                 expected_extension='.csv')
        ),
        (
            'Download CSV with a non-UTF output encoding',
            dict(data_format='csv', add_bom=True, encoding='latin-1',
                 expected_content_type='text/csv',
                 expected_extension='.csv')
        ),
        (
            # utf-16 (without endianness) self-emits a BOM, so the result
            # must contain exactly one BOM, not two (a hand-prepended one
            # plus the codec's own).
            'Download CSV as utf-16 has exactly one BOM',
            dict(data_format='csv', add_bom=True, encoding='utf-16',
                 expected_content_type='text/csv',
                 expected_extension='.csv')
        ),
        (
            # A bogus, non-existent codec must be rejected up front with a
            # clean 400, rather than blowing up mid-stream after a 200.
            'Download CSV with an invalid output encoding returns 400',
            dict(data_format='csv', add_bom=False, encoding='not-a-codec',
                 expected_status=400, expected_content_type=None,
                 expected_extension='.csv')
        ),
    ]

    def setUp(self):
        self._db_name = 'download_results_fmt_' + str(
            secrets.choice(range(10000, 65535)))
        self._sid = self.server_information['server_id']
        server_utils.connect_server(self, self._sid)
        self._did = test_utils.create_database(self.server, self._db_name)

    def initiate_sql_query_tool(self, trans_id, sql_query):
        url = '/sqleditor/query_tool/start/{0}'.format(trans_id)
        response = self.tester.post(url, data=json.dumps({"sql": sql_query}),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)
        return async_poll(tester=self.tester,
                          poll_url='/sqleditor/poll/{0}'.format(trans_id))

    def runTest(self):
        db_con = database_utils.connect_database(self,
                                                 test_utils.SERVER_GROUP,
                                                 self._sid,
                                                 self._did)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = self.INIT_URL.format(
            self.trans_id, test_utils.SERVER_GROUP, self._sid, self._did)
        response = self.tester.post(url, data=json.dumps({
            "dbname": self._db_name
        }))
        self.assertEqual(response.status_code, 200)

        self.initiate_sql_query_tool(self.trans_id, self.SQL)

        url = self.DOWNLOAD_URL.format(self.trans_id)
        self.app.logger.disabled = True
        filename = 'test{0}'.format(self.expected_extension)
        with patch('pgadmin.tools.sqleditor.blueprint.'
                   'csv_add_bom.get', return_value=self.add_bom), \
            patch('pgadmin.tools.sqleditor.blueprint.'
                  'csv_output_encoding.get', return_value=self.encoding):
            response = self.tester.post(url, data={
                "query": self.SQL,
                "filename": filename,
                "format": self.data_format,
                "query_commited": True,
            })
        self.app.logger.disabled = False

        headers = dict(response.headers)

        # An invalid encoding must be rejected up front with a clean error
        # status, before the streaming Response is constructed.
        expected_status = getattr(self, 'expected_status', 200)
        if expected_status != 200:
            self.assertEqual(response.status_code, expected_status)
            url = '/sqleditor/close/{0}'.format(self.trans_id)
            response = self.tester.delete(url)
            self.assertEqual(response.status_code, 200)
            database_utils.disconnect_database(self, self._sid, self._did)
            return

        self.assertEqual(response.status_code, 200)
        self.assertIn(self.expected_content_type, headers['Content-Type'])
        self.assertIn('charset={0}'.format(self.encoding),
                      headers['Content-Type'])
        self.assertIn(filename, headers['Content-Disposition'])

        raw = response.data
        normalized = self.encoding.lower().replace('-', '').replace('_', '')
        if self.add_bom and normalized.startswith('utf'):
            # The output must carry exactly one BOM for the encoding, never
            # two (which happened when a BOM was hand-prepended for codecs
            # that already self-emit one, e.g. utf-16/utf-32).
            bom = {
                'utf8': codecs.BOM_UTF8,
                'utf16': codecs.BOM_UTF16,
                'utf32': codecs.BOM_UTF32,
            }[normalized]
            self.assertTrue(raw.startswith(bom))
            # No second, redundant BOM immediately after the first.
            self.assertFalse(raw[len(bom):].startswith(bom))
        else:
            self.assertFalse(raw.startswith(b'\xef\xbb\xbf'))

        body = raw.decode(self.encoding)

        if self.data_format == 'json':
            parsed = json.loads(body)
            self.assertIsInstance(parsed, list)
            self.assertEqual(parsed[0]['A'], 1)
            self.assertEqual(parsed[0]['B'], 2)
            self.assertEqual(parsed[0]['C'], 'x')
        elif self.data_format == 'xml':
            self.assertIn('<data_output>', body)
            self.assertIn('<column name="A">1</column>', body)
            self.assertIn('<column name="C">x</column>', body)
            self.assertIn('</data_output>', body)
        else:
            self.assertIn('"A","B","C"', body)

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
