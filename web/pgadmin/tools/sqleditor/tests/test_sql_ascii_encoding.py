##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import secrets
import json

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils
from pgadmin.utils import server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
import config
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import async_poll


class TestSQLASCIIEncoding(BaseTestGenerator):
    """
    This class validates character support in pgAdmin4 for
    SQL_ASCII encodings
    """
    scenarios = [
        (
            'Test SQL_ASCII data with multiple backslashes',
            dict(
                table_name='test_sql_ascii',
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str=r'\\\\Four\\\Three\\Two\One'
            )),
        (
            'Test SQL_ASCII data with file path',
            dict(
                table_name='test_sql_ascii',
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str=r'\\test\Documents\2017\12\19\AD93E646-'
                         'E5FE-11E7-85AE-EB2E217F96F0.tif'
            )),
        (
            'Test SQL_ASCII data with multiple forward slashes',
            dict(
                table_name='test_sql_ascii',
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str='////4///3//2/1'
            )),
        (
            'Test SQL_ASCII data with blob string',
            dict(
                table_name='test_sql_ascii',
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str='Blob: \xf4\xa5\xa3\xa5'
            )),
        (
            'Test SQL_ASCII data with blob string & ascii table name',
            dict(
                table_name='ü',
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str='Blob: \xf4\xa5\xa3\xa5'
            )),
    ]

    def setUp(self):
        self.encode_db_name = 'test_encoding_' + self.db_encoding + \
                              str(secrets.choice(range(1000, 65535)))
        self.encode_sid = self.server_information['server_id']

        server_con = server_utils.connect_server(self, self.encode_sid)
        if hasattr(self, 'skip_on_database'):
            if 'data' in server_con and 'type' in server_con['data']:
                if server_con['data']['type'] in self.skip_on_database:
                    self.skipTest('cannot run in: %s' %
                                  server_con['data']['type'])

        self.encode_did = test_utils.create_database(
            self.server, self.encode_db_name,
            (self.db_encoding, self.lc_collate))

    def runTest(self):
        db_con = database_utils.connect_database(self,
                                                 test_utils.SERVER_GROUP,
                                                 self.encode_sid,
                                                 self.encode_did)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

        # Initialize query tool
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'\
            .format(self.trans_id, test_utils.SERVER_GROUP, self.encode_sid,
                    self.encode_did)
        response = self.tester.post(url, data=json.dumps({
            "dbname": self.encode_db_name
        }))
        self.assertEqual(response.status_code, 200)

        # Check character
        url = "/sqleditor/query_tool/start/{0}".format(self.trans_id)
        sql = "select '{0}';".format(self.test_str)
        response = self.tester.post(url, data=json.dumps({"sql": sql}),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)
        response = async_poll(tester=self.tester,
                              poll_url='/sqleditor/poll/{0}'.format(
                                  self.trans_id))
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['data']['rows_fetched_to'], 1)
        result = response_data['data']['result'][0][0]
        self.assertEqual(result, self.test_str)

        # Close query tool
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)

        database_utils.disconnect_database(self, self.encode_sid,
                                           self.encode_did)

    def tearDown(self):
        main_conn = test_utils.get_db_connection(
            self.server['db'],
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )
        test_utils.drop_database(main_conn, self.encode_db_name)
