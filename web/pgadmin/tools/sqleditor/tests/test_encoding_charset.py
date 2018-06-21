##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression import parent_node_dict
from regression.python_test_utils import test_utils
import json
from pgadmin.utils import server_utils


class TestEncodingCharset(BaseTestGenerator):
    """
    This class validates character support in pgAdmin4 for
    different PostgresDB encodings
    """
    skip_on_database = ['gpdb']
    scenarios = [
        (
            'With Encoding UTF8',
            dict(
                db_encoding='UTF8',
                lc_collate='C',
                test_str='A'
            )),
        (
            'With Encoding WIN1252',
            dict(
                db_encoding='WIN1252',
                lc_collate='C',
                test_str='A'
            )),
        (
            'With Encoding EUC_CN',
            dict(
                db_encoding='EUC_CN',
                lc_collate='C',
                test_str='A'
            )),
        (
            'With Encoding SQL_ASCII',
            dict(
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str='\\255'
            )),
    ]

    def setUp(self):
        self.encode_db_name = 'encoding_' + self.db_encoding
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
        url = '/datagrid/initialize/query_tool/{0}/{1}/{2}'.format(
            test_utils.SERVER_GROUP, self.encode_sid, self.encode_did)
        response = self.tester.post(url)
        self.assertEquals(response.status_code, 200)

        response_data = json.loads(response.data.decode('utf-8'))
        self.trans_id = response_data['data']['gridTransId']

        # Check character
        url = "/sqleditor/query_tool/start/{0}".format(self.trans_id)
        sql = "select E'{0}';".format(self.test_str)
        response = self.tester.post(url, data=json.dumps({"sql": sql}),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)
        url = '/sqleditor/poll/{0}'.format(self.trans_id)
        response = self.tester.get(url)
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertEquals(response_data['data']['rows_fetched_to'], 1)

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
