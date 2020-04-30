##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import random

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils
from pgadmin.utils import server_utils


class TestSQLASCIIEncoding(BaseTestGenerator):
    """
    This class validates character support in pgAdmin4 for
    SQL_ASCII encodings
    """
    skip_on_database = ['gpdb']
    scenarios = [
        (
            'Test SQL_ASCII data with multiple backslashes',
            dict(
                table_name='test_sql_ascii',
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str='\\\\Four\\\Three\\Two\One'
            )),
        (
            'Test SQL_ASCII data with file path',
            dict(
                table_name='test_sql_ascii',
                db_encoding='SQL_ASCII',
                lc_collate='C',
                test_str='\\test\Documents\2017\12\19\AD93E646-'
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
    ]

    def setUp(self):
        self.encode_db_name = 'test_encoding_' + self.db_encoding + \
                              str(random.randint(1000, 65535))
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

        test_utils.create_table_with_query(
            self.server,
            self.encode_db_name,
            """CREATE TABLE {0}(
                name character varying(200) COLLATE pg_catalog."default")
            """.format(self.table_name))

    def runTest(self):
        db_con = test_utils.get_db_connection(
            self.encode_db_name,
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port'],
            self.server['sslmode']
        )

        old_isolation_level = db_con.isolation_level
        db_con.set_isolation_level(0)
        db_con.set_client_encoding(self.db_encoding)
        pg_cursor = db_con.cursor()
        query = """INSERT INTO {0} VALUES('{1}')""".format(
            self.table_name, self.test_str)
        pg_cursor.execute(query)
        db_con.set_isolation_level(old_isolation_level)
        db_con.commit()

        query = """SELECT * FROM {0}""".format(self.table_name)
        pg_cursor.execute(query)
        resp = pg_cursor.fetchone()

        self.assertEqual(resp[0], self.test_str)

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
