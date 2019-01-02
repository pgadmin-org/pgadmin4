#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils.driver.psycopg2.encoding import getEncoding
from pgadmin.utils.route import BaseTestGenerator


class TestEncoding(BaseTestGenerator):
    scenarios = [
        (
            'When the database encoding is SQL_ASCII',
            dict(
                db_encoding='SQL_ASCII',
                expected_return_value=['SQL_ASCII', 'raw_unicode_escape']
            )
        ), (
            'When the database encoding is MULEINTERNAL',
            dict(
                db_encoding='MULEINTERNAL',
                expected_return_value=['MULEINTERNAL', 'raw_unicode_escape']
            )
        ), (
            'When the database encoding is LATIN1',
            dict(
                db_encoding='LATIN1',
                expected_return_value=['LATIN1', 'latin1']
            )
        ), (
            'When the database encoding is LATIN2',
            dict(
                db_encoding='LATIN2',
                expected_return_value=['LATIN2', 'latin2']
            )
        ), (
            'When the database encoding is LATIN3',
            dict(
                db_encoding='LATIN3',
                expected_return_value=['LATIN3', 'latin3']
            )
        ), (
            'When the database encoding is LATIN4',
            dict(
                db_encoding='LATIN4',
                expected_return_value=['LATIN4', 'latin4']
            )
        ), (
            'When the database encoding is LATIN5',
            dict(
                db_encoding='LATIN5',
                expected_return_value=['LATIN5', 'latin5']
            )
        ), (
            'When the database encoding is LATIN6',
            dict(
                db_encoding='LATIN6',
                expected_return_value=['LATIN6', 'latin6']
            )
        ), (
            'When the database encoding is LATIN7',
            dict(
                db_encoding='LATIN7',
                expected_return_value=['LATIN7', 'latin7']
            )
        ), (
            'When the database encoding is LATIN8',
            dict(
                db_encoding='LATIN8',
                expected_return_value=['LATIN8', 'latin8']
            )
        ), (
            'When the database encoding is LATIN9',
            dict(
                db_encoding='LATIN9',
                expected_return_value=['LATIN9', 'latin9']
            )
        ), (
            'When the database encoding is LATIN10',
            dict(
                db_encoding='LATIN10',
                expected_return_value=['LATIN10', 'latin10']
            )
        ), (
            'When the database encoding is WIN1258',
            dict(
                db_encoding='WIN1258',
                expected_return_value=['UNICODE', 'utf-8']
            )
        ),
    ]

    def runTest(self):
        result = getEncoding(self.db_encoding)
        self.assertEquals(result, self.expected_return_value)
