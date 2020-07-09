#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils.driver.psycopg2.encoding import get_encoding
from pgadmin.utils.route import BaseTestGenerator


class TestEncoding(BaseTestGenerator):
    scenarios = [
        (
            'When the database encoding is SQL_ASCII',
            dict(
                db_encoding='SQL_ASCII',
                expected_return_value=['SQL_ASCII', 'raw_unicode_escape',
                                       'unicode_escape']
            )
        ), (
            'When the database encoding is MULEINTERNAL',
            dict(
                db_encoding='MULEINTERNAL',
                expected_return_value=['MULEINTERNAL', 'raw_unicode_escape',
                                       'unicode_escape']
            )
        ), (
            'When the database encoding is LATIN1',
            dict(
                db_encoding='LATIN1',
                expected_return_value=['LATIN1', 'latin1', 'latin1']
            )
        ), (
            'When the database encoding is LATIN2',
            dict(
                db_encoding='LATIN2',
                expected_return_value=['LATIN2', 'latin2', 'latin2']
            )
        ), (
            'When the database encoding is LATIN3',
            dict(
                db_encoding='LATIN3',
                expected_return_value=['LATIN3', 'latin3', 'latin3']
            )
        ), (
            'When the database encoding is LATIN4',
            dict(
                db_encoding='LATIN4',
                expected_return_value=['LATIN4', 'latin4', 'latin4']
            )
        ), (
            'When the database encoding is LATIN5',
            dict(
                db_encoding='LATIN5',
                expected_return_value=['LATIN5', 'latin5', 'latin5']
            )
        ), (
            'When the database encoding is LATIN6',
            dict(
                db_encoding='LATIN6',
                expected_return_value=['LATIN6', 'latin6', 'latin6']
            )
        ), (
            'When the database encoding is LATIN7',
            dict(
                db_encoding='LATIN7',
                expected_return_value=['LATIN7', 'latin7', 'latin7']
            )
        ), (
            'When the database encoding is LATIN8',
            dict(
                db_encoding='LATIN8',
                expected_return_value=['LATIN8', 'latin8', 'latin8']
            )
        ), (
            'When the database encoding is LATIN9',
            dict(
                db_encoding='LATIN9',
                expected_return_value=['LATIN9', 'latin9', 'latin9']
            )
        ), (
            'When the database encoding is LATIN10',
            dict(
                db_encoding='LATIN10',
                expected_return_value=['LATIN10', 'latin10', 'latin10']
            )
        ), (
            'When the database encoding is WIN1250',
            dict(
                db_encoding='WIN1250',
                expected_return_value=['WIN1250', 'cp1250', 'cp1250']
            )
        ), (
            'When the database encoding is WIN1251',
            dict(
                db_encoding='WIN1251',
                expected_return_value=['WIN1251', 'cp1251', 'cp1251']
            )
        ), (
            'When the database encoding is WIN1252',
            dict(
                db_encoding='WIN1252',
                expected_return_value=['WIN1252', 'cp1252', 'cp1252']
            )
        ), (
            'When the database encoding is WIN1253',
            dict(
                db_encoding='WIN1253',
                expected_return_value=['WIN1253', 'cp1253', 'cp1253']
            )
        ), (
            'When the database encoding is WIN1254',
            dict(
                db_encoding='WIN1254',
                expected_return_value=['WIN1254', 'cp1254', 'cp1254']
            )
        ), (
            'When the database encoding is WIN1255',
            dict(
                db_encoding='WIN1255',
                expected_return_value=['WIN1255', 'cp1255', 'cp1255']
            )
        ), (
            'When the database encoding is WIN1256',
            dict(
                db_encoding='WIN1256',
                expected_return_value=['WIN1256', 'cp1256', 'cp1256']
            )
        ), (
            'When the database encoding is WIN1257',
            dict(
                db_encoding='WIN1257',
                expected_return_value=['WIN1257', 'cp1257', 'cp1257']
            )
        ), (
            'When the database encoding is WIN1258',
            dict(
                db_encoding='WIN1258',
                expected_return_value=['WIN1258', 'cp1258', 'cp1258']
            )
        ), (
            'When the database encoding is EUC_JIS_2004',
            dict(
                db_encoding='EUC_JIS_2004',
                expected_return_value=['EUC_JIS_2004', 'eucjis2004',
                                       'eucjis2004']
            )
        ), (
            'When the database encoding is EUC_CN',
            dict(
                db_encoding='EUC_CN',
                expected_return_value=['EUC_CN', 'euc-cn', 'euc-cn']
            )
        ), (
            'When the database encoding is EUC_JP',
            dict(
                db_encoding='EUC_JP',
                expected_return_value=['EUC_JP', 'euc_jp', 'euc_jp']
            )
        ), (
            'When the database encoding is EUC_KR',
            dict(
                db_encoding='EUC_KR',
                expected_return_value=['EUC_KR', 'euc_kr', 'euc_kr']
            )
        ), (
            'When the database encoding is EUC_TW',
            dict(
                db_encoding='EUC_TW',
                expected_return_value=['BIG5', 'big5', 'big5']
            )
        ), (
            'When the database encoding is ISO_8859_5',
            dict(
                db_encoding='ISO_8859_5',
                expected_return_value=['ISO_8859_5', 'iso8859_5', 'iso8859_5']
            )
        ), (
            'When the database encoding is ISO_8859_6',
            dict(
                db_encoding='ISO_8859_6',
                expected_return_value=['ISO_8859_6', 'iso8859_6', 'iso8859_6']
            )
        ), (
            'When the database encoding is ISO_8859_7',
            dict(
                db_encoding='ISO_8859_7',
                expected_return_value=['ISO_8859_7', 'iso8859_7', 'iso8859_7']
            )
        ), (
            'When the database encoding is ISO_8859_8',
            dict(
                db_encoding='ISO_8859_8',
                expected_return_value=['ISO_8859_8', 'iso8859_8', 'iso8859_8']
            )
        ), (
            'When the database encoding is KOI8R',
            dict(
                db_encoding='KOI8R',
                expected_return_value=['KOI8R', 'koi8_r', 'koi8_r']
            )
        ), (
            'When the database encoding is KOI8U',
            dict(
                db_encoding='KOI8U',
                expected_return_value=['KOI8U', 'koi8_u', 'koi8_u']
            )
        ), (
            'When the database encoding is WIN866',
            dict(
                db_encoding='WIN866',
                expected_return_value=['WIN866', 'cp866', 'cp866']
            )
        ), (
            'When the database encoding is WIN874',
            dict(
                db_encoding='WIN874',
                expected_return_value=['WIN874', 'cp874', 'cp874']
            )
        ),
    ]

    def runTest(self):
        result = get_encoding(self.db_encoding)
        self.assertEquals(result, self.expected_return_value)
