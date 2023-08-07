##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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

BACKUP_OBJECT_URL = '/backup/job/{0}/object'
BACKUP_SERVER_URL = '/backup/job/{0}'
VERBOSE = '--verbose'
FORMAT_C = '--format=c'
FORMAT_P = '--format=p'
BLOBS = '--blobs'
LARGE_OBJECTS = '--large-objects'
DATA_ONLY = '--data-only'
SCHEMA_ONLY = '--schema-only'


class BackupCreateJobTest(BaseTestGenerator):
    """Test the BackupCreateJob class"""
    scenarios = [
        ('When backup object with default options (< v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='postgres'
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_C, BLOBS],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_max_version=159999,
             message='--blobs is deprecated and is not supported by EPAS/PG '
                     'server greater than 15'
         )),
        ('When backup object with default options (>= v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[],
                 database='postgres'
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_C, LARGE_OBJECTS],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=160000,
             message='--large-objects is not supported by EPAS/PG server '
                     'less than 16'
         )),
        ('When backup object with format directory',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_folder',
                 format='directory',
                 verbose=True,
                 blobs=False,
                 schemas=[],
                 tables=[],
                 database='postgres'
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, '--format=d'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option sections to all data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 data=True,
                 pre_data=True,
                 post_data=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_C,
                                '--section=pre-data', '--section=data',
                                '--section=post-data'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option only_data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 only_data=True,
                 only_schema=False
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_P, DATA_ONLY],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option only_data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 only_data=True,
                 only_schema=True,
                 dns_owner=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_P, DATA_ONLY],
             not_expected_cmd_opts=[SCHEMA_ONLY],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option only_schema',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 only_data=False,
                 only_schema=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_P, SCHEMA_ONLY],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - format plain and dns_owner',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_owner=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_P, '--no-owner'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - Do not save privilege,'
         ' tablespace, unlogged table data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_privilege=True,
                 dns_unlogged_tbl_data=True,
                 dns_tablespace=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--no-privileges',
                                '--no-tablespaces',
                                '--no-unlogged-table-data'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - Do not save Comments,'
         'Publications, Subscriptions, Security Labels',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_comments=True,
                 dns_publications=True,
                 dns_subscriptions=True,
                 dns_security_labels=True,
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--no-comments', '--no-publications',
                                '--no-subscriptions', '--no-security-labels'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=110000,
             message='Backup object with --no-comments, --no-publications,'
                     '--no-subscriptions, --no-security-labels is not '
                     'supported by EPAS/PG server less than 11.0'
         )),
        ('When backup the object with option - Do not save Toast Compression',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_toast_compression=True,
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--no-toast-compression'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=140000,
             message='Backup object with --no-toast-compression is not'
                     'supported by EPAS/PG server less than 14.0'
         )),
        ('When backup the object with option - Do not save Table Access '
         'Method,',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 dns_table_access_method=True,
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--no-table-access-method'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=150000,
             message='Backup object with --no-table-access-method is not '
                     'supported by EPAS/PG server less than 15.0'
         )),
        ('When backup the object with option - all queries',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 use_column_inserts=True,
                 include_create_database=True,
                 use_insert_commands=True,
                 include_drop_database=True,
                 if_exists=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--create', '--clean', '--inserts',
                                '--column-inserts', '--if-exists'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - Rows per insert and '
         'On conflict do nothing',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 max_rows_per_insert="200",
                 on_conflict_do_nothing=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--rows-per-insert', '200',
                                '--on-conflict-do-nothing'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=120000,
             message='Backup object with --rows-per-insert and '
                     '--on-conflict-do-nothing are not supported by EPAS/PG '
                     'server less than 12.0'
         )),
        ('When backup the object with option - load via partition root',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 load_via_partition_root=True,
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--load-via-partition-root'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=110000,
             message='Backup object with --load-via-partition-root are not '
                     'supported by EPAS/PG server less than 11.0'
         )),
        ('When backup the object with option - enable row security',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 enable_row_security=True,
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--enable-row-security'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - exclude table data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='plain',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 exclude_table_data='table1',
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--exclude-table-data', 'table1'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=110000,
             message='Backup object with --exclude-table-data are not '
                     'supported by EPAS/PG server less than 11.0'
         )),
        ('When backup the object with option - all queries and format custom',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 use_column_inserts=True,
                 include_create_database=True,
                 use_insert_commands=True,
                 include_drop_database=True,
                 if_exists=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=['--inserts', '--clean',
                                '--column-inserts', '--create', '--if-exists'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - miscellaneous',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 disable_quoting=True,
                 use_set_session_auth=True,
                 with_oids=True,
                 dqoute=True
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, '--quote-all-identifiers',
                                '--disable-dollar-quoting', '--oids',
                                '--use-set-session-authorization'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - Exclude schema',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 exclude_schema="sch*"
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, '--exclude-schema', 'sch*'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with option - Extra float digits',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 extra_float_digits="5"
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, '--extra-float-digits', '5'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=120000,
             message='Backup object with --extra-float-digits are not '
                     'supported by EPAS/PG server less than 12.0'
         )),
        ('When backup the object with option - Lock wait timeout',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 lock_wait_timeout="1000"
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, '--lock-wait-timeout', '1000'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the object with format tar (< v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='tar',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 blobs=True,
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE,
                                BLOBS,
                                '--format=t'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_max_version=159999,
             message='--blobs is deprecated and is not supported by EPAS/PG '
                     'server greater than 15'
         )),
        ('When backup the object with format tar (>= v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='tar',
                 verbose=True,
                 schemas=[],
                 tables=[],
                 database='postgres',
                 blobs=True,
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE,
                                LARGE_OBJECTS,
                                '--format=t'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=160000,
             message='--large-objects is not supported by EPAS/PG server '
                     'less than 16'
         )),
        ('When backup a schema with default options (< v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=['schema1'],
                 tables=[],
                 database='postgres'
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_C, BLOBS,
                                '--schema', 'schema1'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_max_version=159999,
             message='--blobs is deprecated and is not supported by EPAS/PG '
                     'server greater than 15'
         )),
        ('When backup a schema with default options (>=v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=['schema1'],
                 tables=[],
                 database='postgres'
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_C, LARGE_OBJECTS,
                                '--schema', 'schema1'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=160000,
             message='--large-objects is not supported by EPAS/PG server '
                     'less than 16'
         )),
        ('When backup a table with default options (< v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[['public', 'table1']],
                 database='postgres'
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_C, BLOBS,
                                '--table', 'public.table1'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_max_version=159999,
             message='--blobs is deprecated and is not supported by EPAS/PG '
                     'server greater than 15'
         )),
        ('When backup a table with default options (>= v16)',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_file',
                 format='custom',
                 verbose=True,
                 blobs=True,
                 schemas=[],
                 tables=[['public', 'table1']],
                 database='postgres'
             ),
             url=BACKUP_OBJECT_URL,
             expected_cmd_opts=[VERBOSE, FORMAT_C, LARGE_OBJECTS,
                                '--table', 'public.table1'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=160000,
             message='--large-objects is not supported by EPAS/PG server '
                     'less than 16'
         )),
        ('When backup the server',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 dqoute=False,
                 verbose=True,
                 type='server'
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option only_data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 verbose=True,
                 only_data=True,
                 only_schema=False
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, DATA_ONLY],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option only_schema',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 only_data=False,
                 only_schema=True
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, SCHEMA_ONLY],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option only_tablespaces',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 only_tablespaces=True
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, '--tablespaces-only'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option only_roles',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 only_roles=True
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, '--roles-only'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option - Do not save privilege,'
         ' tablespace, unlogged table data',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 dns_privilege=True,
                 dns_unlogged_tbl_data=True,
                 dns_tablespace=True
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--no-privileges',
                                '--no-tablespaces',
                                '--no-unlogged-table-data'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option - Do not save Comments, '
         'Publications, Subscriptions, Security Labels',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 dns_comments=True,
                 dns_publications=True,
                 dns_subscriptions=True,
                 dns_security_labels=True,
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--no-comments', '--no-publications',
                                '--no-subscriptions', '--no-security-labels'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=110000,
             message='Backup server with --no-comments, --no-publications,'
                     '--no-subscriptions, --no-security-labels is not '
                     'supported by EPAS/PG server less than 11.0'
         )),
        ('When backup the server with option - Do not save Toast Compression',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 dns_toast_compression=True,
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--no-toast-compression'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=140000,
             message='Backup server with --no-toast-compression is not'
                     'supported by EPAS/PG server less than 14.0'
         )),
        ('When backup the server with option - Do not save Table Access '
         'Method,',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 dns_table_access_method=True,
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--no-table-access-method'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=150000,
             message='Backup server with --no-table-access-method is not '
                     'supported by EPAS/PG server less than 15.0'
         )),
        ('When backup the server with option - Do not save Role passwords ',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 dns_no_role_passwords=True,
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--no-role-passwords'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option - all queries',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 use_column_inserts=True,
                 use_insert_commands=True,
                 include_drop_database=True,
                 if_exists=True
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--clean', '--inserts',
                                '--column-inserts', '--if-exists'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option - Rows per insert and '
         'On conflict do nothing',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 format='plain',
                 verbose=True,
                 max_rows_per_insert="200",
                 on_conflict_do_nothing=True
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--rows-per-insert', '200',
                                '--on-conflict-do-nothing'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=120000,
             message='Backup object with --rows-per-insert and '
                     '--on-conflict-do-nothing are not supported by EPAS/PG '
                     'server less than 12.0'
         )),
        ('When backup the server with option - miscellaneous',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 verbose=True,
                 disable_quoting=True,
                 use_set_session_auth=True,
                 with_oids=True,
                 dqoute=True
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, '--quote-all-identifiers',
                                '--disable-dollar-quoting', '--oids',
                                '--use-set-session-authorization'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option - Extra float digits',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 verbose=True,
                 extra_float_digits="5"
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, '--extra-float-digits', '5'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=120000,
             message='Backup server with --extra-float-digits are not '
                     'supported by EPAS/PG server less than 12.0'
         )),
        ('When backup the server with option - Lock wait timeout',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 verbose=True,
                 lock_wait_timeout="1000"
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, '--lock-wait-timeout', '1000'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         )),
        ('When backup the server with option - Exclude database',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 type='server',
                 verbose=True,
                 exclude_database="db*"
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=[VERBOSE, '--exclude-database', 'db*'],
             not_expected_cmd_opts=[],
             server_min_version=160000,
             expected_exit_code=[0, None],
             message='Backup server with --exclude-database are not '
                     'supported by EPAS/PG server less than 16.0'
         )),
        ('When backup the server with encoding',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_server_file',
                 dqoute=False,
                 verbose=True,
                 type='server',
                 encoding='UTF-8'
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--encoding'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None],
             server_min_version=110000,
             message='Backup server with encoding is not supported '
                     'by EPAS/PG server less than 11.0'
         )),
        ('When backup globals',
         dict(
             class_params=dict(
                 sid=1,
                 name='test_backup_server',
                 port=5444,
                 host='localhost',
                 database='postgres',
                 bfile='test_backup',
                 username='postgres'
             ),
             params=dict(
                 file='test_backup_global_file',
                 dqoute=False,
                 verbose=True,
                 type='globals'
             ),
             url=BACKUP_SERVER_URL,
             expected_cmd_opts=['--globals-only'],
             not_expected_cmd_opts=[],
             expected_exit_code=[0, None]
         ))
    ]

    def setUp(self):
        if hasattr(self, 'server_min_version') and \
            self.server_information['server_version'] < \
                self.server_min_version:
            self.skipTest(self.message)

        if hasattr(self, 'server_max_version') and \
            self.server_information['server_version'] > \
                self.server_max_version:
            self.skipTest(self.message)

        if 'default_binary_paths' not in self.server or \
            self.server['default_binary_paths'] is None or \
            self.server['type'] not in self.server['default_binary_paths'] or \
                self.server['default_binary_paths'][self.server['type']] == '':
            self.skipTest(
                "default_binary_paths is not set for the server {0}".format(
                    self.server['name']
                )
            )

        binary_path = os.path.join(
            self.server['default_binary_paths'][self.server['type']],
            'pg_dump')

        if os.name == 'nt':
            binary_path = binary_path + '.exe'

        ret_val = does_utility_exist(binary_path)
        if ret_val is not None:
            self.skipTest(ret_val)

    @patch('pgadmin.tools.backup.Server')
    @patch('pgadmin.tools.backup.BackupMessage')
    @patch('pgadmin.tools.backup.filename_with_file_manager_path')
    @patch('pgadmin.tools.backup.BatchProcess')
    @patch('pgadmin.utils.driver.{0}.server_manager.ServerManager.'
           'export_password_env'.format(PG_DEFAULT_DRIVER))
    def runTest(self, export_password_env_mock, batch_process_mock,
                filename_mock, backup_message_mock, server_mock):
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

        filename_mock.return_value = self.params['file']

        batch_process_mock.return_value.id = 140391
        batch_process_mock.return_value.set_env_variables = MagicMock(
            return_value=True
        )
        batch_process_mock.return_value.start = MagicMock(
            return_value=True
        )
        backup_message_mock.message = 'test'
        batch_process_mock.return_value.desc = backup_message_mock
        export_password_env_mock.return_value = True

        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":
            db_owner = server_response['data']['user']['name']
            self.data = database_utils.get_db_data(db_owner)

        url = self.url.format(self.server_id)

        # Create the backup job
        response = self.tester.post(url,
                                    data=json.dumps(self.params),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

        self.assertTrue(backup_message_mock.called)
        self.assertTrue(batch_process_mock.called)

        if self.expected_cmd_opts:
            for opt in self.expected_cmd_opts:
                self.assertIn(
                    opt,
                    batch_process_mock.call_args_list[0][1]['args']
                )
        if self.not_expected_cmd_opts:
            for opt in self.not_expected_cmd_opts:
                self.assertNotIn(
                    opt,
                    batch_process_mock.call_args_list[0][1]['args']
                )
