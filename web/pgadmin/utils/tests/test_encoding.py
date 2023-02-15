#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import config
from pgadmin.utils.driver.psycopg2.encoding import get_encoding
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.constants import PSYCOPG3


class TestEncoding(BaseTestGenerator):
    scenarios = [
        (
            'When the database encoding is SQL_ASCII',
            dict(
                db_encoding='raw_unicode_escape',
                expected_return_value=['SQL_ASCII', 'raw-unicode-escape',
                                       'unicode-escape']
            )
        ), (
            'When the database encoding is LATIN1',
            dict(
                db_encoding='latin1',
                expected_return_value=['LATIN1', 'iso8859-1', 'iso8859-1']
            )
        ), (
            'When the database encoding is LATIN2',
            dict(
                db_encoding='latin2',
                expected_return_value=['LATIN2', 'iso8859-2', 'iso8859-2']
            )
        ), (
            'When the database encoding is LATIN3',
            dict(
                db_encoding='latin3',
                expected_return_value=['LATIN3', 'iso8859-3', 'iso8859-3']
            )
        ), (
            'When the database encoding is LATIN4',
            dict(
                db_encoding='latin4',
                expected_return_value=['LATIN4', 'iso8859-4', 'iso8859-4']
            )
        ), (
            'When the database encoding is LATIN5',
            dict(
                db_encoding='latin5',
                expected_return_value=['LATIN5', 'iso8859-9', 'iso8859-9']
            )
        ), (
            'When the database encoding is LATIN6',
            dict(
                db_encoding='latin6',
                expected_return_value=['LATIN6', 'iso8859-10', 'iso8859-10']
            )
        ), (
            'When the database encoding is LATIN7',
            dict(
                db_encoding='latin7',
                expected_return_value=['LATIN7', 'iso8859-13', 'iso8859-13']
            )
        ), (
            'When the database encoding is LATIN8',
            dict(
                db_encoding='latin8',
                expected_return_value=['LATIN8', 'iso8859-14', 'iso8859-14']
            )
        ), (
            'When the database encoding is LATIN9',
            dict(
                db_encoding='latin9',
                expected_return_value=['LATIN9', 'iso8859-15', 'iso8859-15']
            )
        ), (
            'When the database encoding is LATIN10',
            dict(
                db_encoding='latin10',
                expected_return_value=['LATIN10', 'iso8859-16', 'iso8859-16']
            )
        ), (
            'When the database encoding is WIN1250',
            dict(
                db_encoding='cp1250',
                expected_return_value=['WIN1250', 'cp1250', 'cp1250']
            )
        ), (
            'When the database encoding is WIN1251',
            dict(
                db_encoding='cp1251',
                expected_return_value=['WIN1251', 'cp1251', 'cp1251']
            )
        ), (
            'When the database encoding is WIN1252',
            dict(
                db_encoding='cp1252',
                expected_return_value=['WIN1252', 'cp1252', 'cp1252']
            )
        ), (
            'When the database encoding is WIN1253',
            dict(
                db_encoding='cp1253',
                expected_return_value=['WIN1253', 'cp1253', 'cp1253']
            )
        ), (
            'When the database encoding is WIN1254',
            dict(
                db_encoding='cp1254',
                expected_return_value=['WIN1254', 'cp1254', 'cp1254']
            )
        ), (
            'When the database encoding is WIN1255',
            dict(
                db_encoding='cp1255',
                expected_return_value=['WIN1255', 'cp1255', 'cp1255']
            )
        ), (
            'When the database encoding is WIN1256',
            dict(
                db_encoding='cp1256',
                expected_return_value=['WIN1256', 'cp1256', 'cp1256']
            )
        ), (
            'When the database encoding is WIN1257',
            dict(
                db_encoding='cp1257',
                expected_return_value=['WIN1257', 'cp1257', 'cp1257']
            )
        ), (
            'When the database encoding is WIN1258',
            dict(
                db_encoding='cp1258',
                expected_return_value=['WIN1258', 'cp1258', 'cp1258']
            )
        ), (
            'When the database encoding is EUC_JIS_2004',
            dict(
                db_encoding='eucjis2004',
                expected_return_value=['EUC_JIS_2004', 'euc_jis_2004',
                                       'euc_jis_2004']
            )
        ), (
            'When the database encoding is EUC_CN',
            dict(
                db_encoding='euc-cn',
                expected_return_value=['EUC_CN', 'gb2312', 'gb2312']
            )
        ), (
            'When the database encoding is EUC_JP',
            dict(
                db_encoding='euc_jp',
                expected_return_value=['EUC_JP', 'euc_jp', 'euc_jp']
            )
        ), (
            'When the database encoding is EUC_KR',
            dict(
                db_encoding='euc_kr',
                expected_return_value=['EUC_KR', 'euc_kr', 'euc_kr']
            )
        ), (
            'When the database encoding is EUC_TW',
            dict(
                db_encoding='big5',
                expected_return_value=['BIG5', 'big5', 'big5']
            )
        ), (
            'When the database encoding is ISO_8859_5',
            dict(
                db_encoding='iso8859_5',
                expected_return_value=['ISO_8859_5', 'iso8859-5', 'iso8859-5']
            )
        ), (
            'When the database encoding is ISO_8859_6',
            dict(
                db_encoding='iso8859_6',
                expected_return_value=['ISO_8859_6', 'iso8859-6', 'iso8859-6']
            )
        ), (
            'When the database encoding is ISO_8859_7',
            dict(
                db_encoding='iso8859_7',
                expected_return_value=['ISO_8859_7', 'iso8859-7', 'iso8859-7']
            )
        ), (
            'When the database encoding is ISO_8859_8',
            dict(
                db_encoding='iso8859_8',
                expected_return_value=['ISO_8859_8', 'iso8859-8', 'iso8859-8']
            )
        ), (
            'When the database encoding is KOI8R',
            dict(
                db_encoding='koi8_r',
                expected_return_value=['KOI8R', 'koi8-r', 'koi8-r']
            )
        ), (
            'When the database encoding is KOI8U',
            dict(
                db_encoding='koi8_u',
                expected_return_value=['KOI8U', 'koi8-u', 'koi8-u']
            )
        ), (
            'When the database encoding is WIN866',
            dict(
                db_encoding='cp866',
                expected_return_value=['WIN866', 'cp866', 'cp866']
            )
        ), (
            'When the database encoding is WIN874',
            dict(
                db_encoding='cp874',
                expected_return_value=['WIN874', 'cp874', 'cp874']
            )
        ),
    ]

    def setUp(self):
        if config.PG_DEFAULT_DRIVER == PSYCOPG3:
            self.skipTest('Skipping for psycopg3 '
                          'as we get the mapping from the driver itself.')

    def runTest(self):
        result = get_encoding(self.db_encoding)
        self.assertEqual(result, self.expected_return_value)
