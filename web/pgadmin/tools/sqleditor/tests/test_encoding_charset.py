# -*- coding: utf-8 -*-
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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


class TestEncodingCharset(BaseTestGenerator):
    """
    This class validates character support in pgAdmin4 for
    different PostgresDB encodings
    """
    scenarios = [
        (
            'With Encoding UTF8',
            dict(
                db_encoding='UTF8',
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
                test_str='Tif'
            )),
        (
            'With Encoding SQL_ASCII (additional test)',
            dict(
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str='ü'
            )),
        (
            'With Encoding LATIN1',
            dict(
                db_encoding='LATIN1',
                lc_collate='C',
                test_str='äöüßÑ'
            )),
        (
            'With Encoding LATIN2',
            dict(
                db_encoding='LATIN2',
                lc_collate='C',
                test_str='§'
            )),
        (
            'With Encoding LATIN9',
            dict(
                db_encoding='LATIN9',
                lc_collate='C',
                test_str='äöüß'
            )),
        (
            'With Encoding EUC_JIS_2004',
            dict(
                db_encoding='EUC_JIS_2004',
                lc_collate='C',
                test_str='じんぼはりんごをたべる'
            )),
        (
            'With Encoding WIN1256',
            dict(
                db_encoding='WIN1256',
                lc_collate='C',
                test_str='صباح الخير'
            )),
        (
            'With Encoding WIN866',
            dict(
                db_encoding='WIN866',
                lc_collate='C',
                test_str='Альтернативная'
            )),
        (
            'With Encoding WIN874',
            dict(
                db_encoding='WIN874',
                lc_collate='C',
                test_str='กลิ่นหอม'
            )),
        (
            'With Encoding WIN1250',
            dict(
                db_encoding='WIN1250',
                lc_collate='C',
                test_str='ŔÁÄÇ'
            )),
        (
            'With Encoding WIN1251',
            dict(
                db_encoding='WIN1251',
                lc_collate='C',
                test_str='ЖИЙЮ'
            )),
        (
            'With Encoding WIN1252',
            dict(
                db_encoding='WIN1252',
                lc_collate='C',
                test_str='ÆØÙü'
            )),
        (
            'With Encoding WIN1253',
            dict(
                db_encoding='WIN1253',
                lc_collate='C',
                test_str='ΨΪμΫ'
            )),
        (
            'With Encoding WIN1254',
            dict(
                db_encoding='WIN1254',
                lc_collate='C',
                test_str='ĞğØŠ'
            )),
        (
            'With Encoding WIN1255',
            dict(
                db_encoding='WIN1255',
                lc_collate='C',
                test_str='₪¥©¾'
            )),
        (
            'With Encoding WIN1256',
            dict(
                db_encoding='WIN1256',
                lc_collate='C',
                test_str='بؤغق'
            )),
        (
            'With Encoding WIN1257',
            dict(
                db_encoding='WIN1257',
                lc_collate='C',
                test_str='‰ķģž'
            )),
        (
            'With Encoding WIN1258',
            dict(
                db_encoding='WIN1258',
                lc_collate='C',
                test_str='₫SHYÑđ'
            )),
        (
            'With Encoding EUC_CN',
            dict(
                db_encoding='EUC_CN',
                lc_collate='C',
                test_str='汉字不灭'
            )),
        (
            'With Encoding EUC_JP',
            dict(
                db_encoding='EUC_JP',
                lc_collate='C',
                test_str='での日本'
            )),
        (
            'With Encoding EUC_KR',
            dict(
                db_encoding='EUC_KR',
                lc_collate='C',
                test_str='ㄱㄲㄴㄷ'
            )),
        (
            'With Encoding EUC_TW',
            dict(
                db_encoding='EUC_TW',
                lc_collate='C',
                test_str='中文'
            )),
        (
            'With Encoding ISO_8859_5',
            dict(
                db_encoding='ISO_8859_5',
                lc_collate='C',
                test_str='ЁЎФЮ'
            )),
        (
            'With Encoding ISO_8859_6',
            dict(
                db_encoding='ISO_8859_6',
                lc_collate='C',
                test_str='العَرَبِيَّة'
            )),
        (
            'With Encoding ISO_8859_7',
            dict(
                db_encoding='ISO_8859_7',
                lc_collate='C',
                test_str='ελληνικά'
            )),
        (
            'With Encoding ISO_8859_8',
            dict(
                db_encoding='ISO_8859_8',
                lc_collate='C',
                test_str='דבא'
            )),
        (
            'With Encoding KOI8R',
            dict(
                db_encoding='KOI8R',
                lc_collate='C',
                test_str='Альтернативная'
            )),
        (
            'With Encoding KOI8U',
            dict(
                db_encoding='KOI8U',
                lc_collate='C',
                test_str='українська'
            )),
    ]

    def setUp(self):
        self.encode_db_name = 'encoding_' + self.db_encoding + \
                              str(secrets.choice(range(10000, 65535)))
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
        response = self.tester.post(url)
        self.assertEqual(response.status_code, 200)

        # Check character
        url = "/sqleditor/query_tool/start/{0}".format(self.trans_id)
        sql = "select E'{0}';".format(self.test_str)
        response = self.tester.post(url, data=json.dumps({"sql": sql}),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)
        response = async_poll(tester=self.tester,
                              poll_url='/sqleditor/poll/{0}'.format(
                                  self.trans_id))
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
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
