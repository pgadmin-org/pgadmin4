##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import os

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from pgadmin.utils import server_utils, does_utility_exist
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from unittest.mock import patch, MagicMock
from config import PG_DEFAULT_DRIVER


class IECreateJobTest(BaseTestGenerator):
    """Test the IECreateJob class"""

    import_export_url = '/import_export/job/{0}'

    scenarios = [
        ('When export file with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file.csv',
                 format='csv',
                 is_import=False,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 database='postgres',
                 columns=['test_col_1', 'test_col_2'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=[],
                 schema="export_test_schema",
                 table="export_test_table"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'WITH',
                                'export_test_schema', 'export_test_table',
                                'WITH', 'FORMAT csv', 'QUOTE \\\'"\\\'',
                                'ESCAPE \\\'\\\'\\\'\\\''],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with csv file, header, delimiter=tab, '
         'encoding=LATIN1',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_01',
                 format="csv",
                 encoding="LATIN1",
                 header=True,
                 delimiter="[tab]",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=[],
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_01',
                                'export_test_table_01', 'WITH',
                                'FORMAT csv', 'HEADER',
                                'ENCODING \\\'LATIN1\\\'',
                                'DELIMITER E\\\'\\\\t\\\''],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with csv file with force_quote_column as '
         'selected cols',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_02',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=['test_col_010'],
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_01',
                                'export_test_table_01', 'WITH', 'FORMAT csv',
                                'FORCE_QUOTE (test_col_010)'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with csv file with force_quote_column *',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_03',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=['test_col_010', 'test_col_011'],
                 total_columns=2,
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_01',
                                'export_test_table_01', 'WITH', 'FORMAT csv',
                                'FORCE_QUOTE *'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with binary file, oid, encoding=UTF8',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_04',
                 format="binary",
                 encoding="UTF8",
                 oid=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_020', 'test_col_021'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=[],
                 schema="test_schema_02",
                 table="export_test_table_02"
             ),
             server_max_version=119999,
             skip_msg="OIDs not supported by EPAS/PG 12.0 and above.",
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_02',
                                'export_test_table_02', 'UTF8',
                                'OIDS'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When export file with binary file, encoding=UTF8',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_05',
                 format="binary",
                 encoding="UTF8",
                 header=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_020', 'test_col_021'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=['test_col_020', 'test_col_021'],
                 schema="test_schema_02",
                 table="export_test_table_02"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_02',
                                'export_test_table_02', 'WITH',
                                'FORMAT binary', 'ENCODING \'UTF8\''],
             not_expected_cmd_opts=['FORMAT csv', 'FORMAT text', 'HEADER',
                                    'DELIMITER', 'QUOTE', 'ESCAPE',
                                    'FORCE_QUOTE_COLUMNS', 'NULL',
                                    'DEFAULT', 'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with text file, delimiter=|, encoding=ISO_8859_6',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_06',
                 format="text",
                 encoding="ISO_8859_6",
                 delimiter="|",
                 quote="\"",
                 escape="'",
                 null_string='abcd',
                 is_import=False,
                 database='postgres',
                 columns=['test_col_030', 'test_col_031'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=['test_col_030', 'test_col_031'],
                 schema="test_schema_03",
                 table="export_test_table_03"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_03',
                                'export_test_table_03', 'WITH',
                                'FORMAT text', 'DELIMITER \'|\'',
                                'ENCODING \'ISO_8859_6\'', 'NULL \'abcd\''],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT csv',
                                    'HEADER', 'QUOTE', 'ESCAPE',
                                    'FORCE_QUOTE_COLUMNS', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with binary file, delimiter=tab, '
         'encoding=ISO_8859_6',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_07',
                 format="binary",
                 encoding="ISO_8859_6",
                 quote="\"",
                 escape="'",
                 is_import=False,
                 database='postgres',
                 columns=['test_col_040', 'test_col_041'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=[],
                 schema="test_schema_04",
                 table="export_test_table_04"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'test_schema_04',
                                'export_test_table_04', 'WITH',
                                'FORMAT binary', 'ENCODING \'ISO_8859_6\''],
             not_expected_cmd_opts=['FORMAT csv', 'FORMAT text', 'HEADER',
                                    'DELIMITER', 'QUOTE', 'ESCAPE', 'NULL',
                                    'FORCE_QUOTE_COLUMNS', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When import file with default options',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file.csv',
                 format='csv',
                 is_import=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 database='postgres',
                 columns=['test_col_1', 'test_col_2'],
                 not_null_columns=[],
                 null_columns=[],
                 schema="export_test_schema",
                 table="export_test_table"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM', 'WITH',
                                'export_test_schema', 'export_test_table',
                                'WITH', 'FORMAT csv', 'QUOTE \\\'"\\\'',
                                'ESCAPE \\\'\\\'\\\'\\\''],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text',
                                    'FORCE_QUOTE_COLUMNS'],
             expected_exit_code=[0, None]
         )),
        ('When import file with csv file, header, delimiter=tab, '
         'encoding=LATIN1',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_01',
                 format="csv",
                 encoding="LATIN1",
                 header=True,
                 delimiter="[tab]",
                 quote="'",
                 escape="\"",
                 is_import=True,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 not_null_columns=[],
                 null_columns=[],
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM', 'test_schema_01',
                                'export_test_table_01', 'WITH',
                                'FORMAT csv', 'HEADER',
                                'ENCODING \\\'LATIN1\\\'',
                                'DELIMITER E\\\'\\\\t\\\''],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text',
                                    'FORCE_QUOTE_COLUMNS'],
             expected_exit_code=[0, None]
         )),
        ('When import file with csv file with force_not_null_column and'
         ' force_null as selected cols',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_02',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=True,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 not_null_columns=['test_col_010'],
                 null_columns=['test_col_011'],
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM', 'test_schema_01',
                                'export_test_table_01', 'WITH',
                                'FORCE_NOT_NULL (test_col_010)',
                                'FORCE_NULL (test_col_011)'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text',
                                    'FORCE_QUOTE_COLUMNS'],
             expected_exit_code=[0, None]
         )),
        ('When import file with csv file with force_not_null_column and'
         ' force_null as *',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_03',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=True,
                 database='postgres',
                 columns=['test_col_010', 'test_col_011'],
                 not_null_columns=['test_col_010', 'test_col_011'],
                 null_columns=['test_col_010', 'test_col_011'],
                 total_columns=2,
                 schema="test_schema_01",
                 table="export_test_table_01"
             ),
             server_min_version=170000,
             skip_msg="FORCE_NOT_NULL * and FORCE_NULL * syntax is available "
                      "from PG/EPAS 17 and above.",
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM', 'test_schema_01',
                                'export_test_table_01', 'WITH',
                                'FORCE_NOT_NULL *', 'FORCE_NULL *'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text',
                                    'FORCE_QUOTE_COLUMNS'],
             expected_exit_code=[0, None]
         )),
        ('When import file with binary file, encoding=UTF8',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_05',
                 format="binary",
                 encoding="UTF8",
                 header=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 is_import=True,
                 database='postgres',
                 columns=['test_col_020', 'test_col_021'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=['test_col_020', 'test_col_021'],
                 schema="test_schema_02",
                 table="export_test_table_02"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM', 'test_schema_02',
                                'export_test_table_02', 'WITH',
                                'FORMAT binary', 'ENCODING \'UTF8\''],
             not_expected_cmd_opts=['FORMAT csv', 'FORMAT text',
                                    'FORCE_QUOTE_COLUMNS'],
             expected_exit_code=[0, None]
         )),
        ('When import file with text file, delimiter=|, encoding=ISO_8859_6',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_06',
                 format="text",
                 encoding="ISO_8859_6",
                 delimiter="|",
                 quote="\"",
                 escape="'",
                 null_string='abcd',
                 is_import=True,
                 database='postgres',
                 columns=['test_col_030', 'test_col_031'],
                 not_null_columns=[],
                 null_columns=[],
                 force_quote_columns=['test_col_030', 'test_col_031'],
                 schema="test_schema_03",
                 table="export_test_table_03"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM', 'test_schema_03',
                                'export_test_table_03', 'WITH',
                                'FORMAT text', 'DELIMITER \'|\'',
                                'ENCODING \'ISO_8859_6\'', 'NULL \'abcd\''],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT csv',
                                    'FORCE_QUOTE_COLUMNS'],
             expected_exit_code=[0, None]
         )),
        ('When import file with binary file, delimiter=tab, '
         'encoding=ISO_8859_6',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_07',
                 format="binary",
                 encoding="ISO_8859_6",
                 quote="\"",
                 escape="'",
                 is_import=True,
                 database='postgres',
                 columns=['test_col_040', 'test_col_041'],
                 not_null_columns=[],
                 null_columns=[],
                 schema="test_schema_04",
                 table="export_test_table_04"
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'FROM', 'test_schema_04',
                                'export_test_table_04', 'WITH',
                                'FORMAT binary', 'ENCODING \'ISO_8859_6\''],
             not_expected_cmd_opts=['FORMAT csv', 'FORMAT text',
                                    'FORCE_QUOTE_COLUMNS'],
             expected_exit_code=[0, None]
         )),
        ('When export file with csv using Query',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_query_01',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 is_query_export=True,
                 database='postgres',
                 query='select * from export_test_table',
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'WITH',
                                '(select * from export_test_table)'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file using Query with csv file, header, delimiter=tab, '
         'encoding=LATIN1',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_query_02',
                 format="csv",
                 encoding="LATIN1",
                 header=True,
                 delimiter="[tab]",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 is_query_export=True,
                 database='postgres',
                 query='select * from export_test_table',
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'WITH',
                                'FORMAT csv', 'HEADER',
                                'ENCODING \\\'LATIN1\\\'',
                                'DELIMITER E\\\'\\\\t\\\'',
                                '(select * from export_test_table)'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file using Query with csv file with force_quote_column '
         'as selected cols',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_query_03',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 is_query_export=True,
                 database='postgres',
                 query='select * from export_test_table',
                 force_quote_columns=['test_col_010'],

             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'WITH',
                                'FORMAT csv', 'FORCE_QUOTE (test_col_010)',
                                '(select * from export_test_table)'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file using Query with csv file with '
         'force_quote_column *',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_03',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 is_query_export=True,
                 database='postgres',
                 query='select * from export_test_table',
                 force_quote_columns=['*', 'test_col_011'],
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'WITH',
                                'FORMAT csv', 'FORCE_QUOTE *',
                                '(select * from export_test_table)'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with csv using query',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_query_01',
                 format="csv",
                 encoding="",
                 header=False,
                 delimiter="'",
                 quote="'",
                 escape="\"",
                 is_import=False,
                 is_query_export=True,
                 database='postgres',
                 query='select * from export_test_table',
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'WITH',
                                '(select * from export_test_table)'],
             not_expected_cmd_opts=['FORMAT binary', 'FORMAT text', 'DEFAULT',
                                    'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
        ('When export file with binary using query, encoding=UTF8',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_export_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_export',
                 username='postgres'
             ),
             params=dict(
                 filename='test_export_file_05',
                 format="binary",
                 encoding="UTF8",
                 header=True,
                 delimiter="",
                 quote="\"",
                 escape="'",
                 is_import=False,
                 database='postgres',
                 is_query_export=True,
                 query='select * from export_test_table_02',
             ),
             url=import_export_url,
             expected_cmd_opts=['--command', 'copy', 'TO', 'WITH',
                                'FORMAT binary', 'ENCODING \'UTF8\'',
                                '(select * from export_test_table_02)'],
             not_expected_cmd_opts=['FORMAT csv', 'FORMAT text', 'HEADER',
                                    'DELIMITER', 'QUOTE', 'ESCAPE',
                                    'FORCE_QUOTE_COLUMNS', 'NULL',
                                    'DEFAULT', 'FORCE_NOT_NULL', 'FORCE_NULL'],
             expected_exit_code=[0, None]
         )),
    ]

    def setUp(self):

        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or \
                self.server['default_binary_paths'][self.server['type']] == '':
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

        bin_p = self.server['default_binary_paths'][self.server['type']]

        binary_path = os.path.join(bin_p, 'psql')

        if os.name == 'nt':
            binary_path = binary_path + '.exe'

        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            self.skipTest(ret_val)

    @patch('pgadmin.tools.import_export.Server')
    @patch('pgadmin.tools.import_export.IEMessage')
    @patch('pgadmin.tools.import_export.filename_with_file_manager_path')
    @patch('pgadmin.tools.import_export.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, ie_message_mock, server_mock):
        class TestMockServer():
            def __init__(self, name, host, port, id, username,
                         maintenance_db):
                self.name = name
                self.host = host
                self.port = port
                self.id = id
                self.username = username
                self.maintenance_db = maintenance_db

        self.server_id = parent_node_dict["server"][-1]["server_id"]
        mock_obj = TestMockServer(self.class_params['name'],
                                  self.class_params['host'],
                                  self.class_params['port'],
                                  self.server_id,
                                  self.class_params['username'],
                                  self.class_params['database']
                                  )
        mock_result = server_mock.query.filter_by.return_value
        mock_result.first.return_value = mock_obj

        filename_mock.return_value = self.params['filename']

        batch_process_mock.return_value.id = 140391
        batch_process_mock.return_value.set_env_variables = MagicMock(
            return_value=True
        )
        batch_process_mock.return_value.start = MagicMock(
            return_value=True
        )

        ie_message_mock.message = 'test'
        batch_process_mock.return_value.desc = ie_message_mock
        export_password_env_mock.return_value = True

        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":
            db_owner = server_response['data']['user']['name']
            self.data = database_utils.get_db_data(db_owner)

            resp_server_version = server_response["data"]["version"]
            if ((hasattr(self, 'server_max_version') and
                 resp_server_version > self.server_max_version) or
                (hasattr(self, 'server_min_version') and
                 resp_server_version < self.server_min_version)):
                self.skipTest(self.skip_msg)

        url = self.url.format(self.server_id)

        # Create the import/export job
        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        self.assertTrue(ie_message_mock.called)
        self.assertTrue(batch_process_mock.called)

        if self.expected_cmd_opts:
            for opt in self.expected_cmd_opts:
                arg = repr(batch_process_mock.call_args_list[0][1]['args'])
                self.assertIn(
                    opt,
                    arg
                )
        if self.not_expected_cmd_opts:
            for opt in self.not_expected_cmd_opts:
                arg = repr(batch_process_mock.call_args_list[0][1]['args'])
                self.assertNotIn(
                    opt,
                    arg
                )
