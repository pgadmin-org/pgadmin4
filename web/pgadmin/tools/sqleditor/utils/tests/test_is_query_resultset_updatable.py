##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import random

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import execute_query
from datetime import date


class TestQueryUpdatableResultset(BaseTestGenerator):
    """ This class will test the detection of whether the query
        result-set is updatable. """
    scenarios = [
        ('When selecting all columns of the table', dict(
            sql='SELECT * FROM {0};',
            expected_primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            },
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[True, True, True, True]
        )),
        ('When selecting all primary keys of the table', dict(
            sql='SELECT pk_col1, pk_col2 FROM {0};',
            expected_primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            },
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[True, True]
        )),
        ('When selecting some of the primary keys of the table', dict(
            sql='SELECT pk_col2 FROM {0};',
            expected_primary_keys=None,
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[False]
        )),
        ('When selecting none of the primary keys of the table', dict(
            sql='SELECT normal_col1 FROM {0};',
            expected_primary_keys=None,
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[False]
        )),
        ('When renaming a primary key', dict(
            sql='SELECT pk_col1 as some_col, pk_col2 FROM "{0}";',
            expected_primary_keys=None,
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[False, False]
        )),
        ('When renaming a normal column', dict(
            sql='SELECT pk_col1, pk_col2, normal_col1 as some_col FROM "{0}";',
            expected_primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            },
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[True, True, False]
        )),
        ('When renaming a normal column to a primary key name', dict(
            sql='SELECT normal_col1 as pk_col1, pk_col1, pk_col2 FROM {0};',
            expected_primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            },
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[False, True, True]
        )),
        ('When selecting a normal column twice', dict(
            sql='SELECT pk_col1, pk_col2, normal_col1, normal_col1 FROM {0};',
            expected_primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            },
            expected_has_oids=False,
            table_has_oids=False,
            expected_cols_is_editable=[True, True, True, False]
        )),
        ('When selecting a non-table column', dict(
         sql='SELECT pk_col1, pk_col2, normal_col1 || normal_col2 FROM {0};',
         expected_primary_keys={'pk_col1': 'int4',
                                'pk_col2': 'int4'
                                },
         expected_has_oids=False,
         table_has_oids=False,
         expected_cols_is_editable=[True, True, False]
         )),
        ('When selecting primary keys and oids (table with oids)', dict(
            sql='SELECT *, oid FROM {0};',
            expected_primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            },
            expected_has_oids=True,
            table_has_oids=True,
            expected_cols_is_editable=[True, True, True, True, False]
        )),
        ('When selecting oids without primary keys (table with oids)', dict(
            sql='SELECT oid, normal_col1, normal_col2 FROM {0};',
            expected_primary_keys=None,
            expected_has_oids=True,
            table_has_oids=True,
            expected_cols_is_editable=[False, True, True]
        )),
        ('When selecting none of the primary keys or oids (table with oids)',
         dict(
             sql='SELECT normal_col1, normal_col2 FROM {0};',
             expected_primary_keys=None,
             expected_has_oids=False,
             table_has_oids=True,
             expected_cols_is_editable=[False, False]
         ))
    ]

    def setUp(self):
        self.test_table_name = "test_for_updatable_resultset" + \
                               str(random.randint(1000, 9999))
        self._initialize_database_connection()
        self._initialize_query_tool()
        self._initialize_urls()

    def runTest(self):
        self._create_test_table(table_has_oids=self.table_has_oids)
        response_data = self._execute_select_sql()
        self._check_primary_keys(response_data)
        self._check_oids(response_data)
        self._check_editable_columns(response_data)

    def tearDown(self):
        # Close query tool
        self._close_query_tool()
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def _execute_select_sql(self):
        sql = self.sql.format(self.test_table_name)
        is_success, response_data = \
            execute_query(tester=self.tester,
                          query=sql,
                          poll_url=self.poll_url,
                          start_query_tool_url=self.start_query_tool_url)
        self.assertEqual(is_success, True)
        return response_data

    def _check_primary_keys(self, response_data):
        primary_keys = response_data['data']['primary_keys']
        self.assertEqual(primary_keys, self.expected_primary_keys)

    def _check_oids(self, response_data):
        has_oids = response_data['data']['has_oids']
        self.assertEqual(has_oids, self.expected_has_oids)

    def _check_editable_columns(self, response_data):
        columns_info = response_data['data']['colinfo']
        for col, expected_is_editable in \
                zip(columns_info, self.expected_cols_is_editable):
            self.assertEqual(col['is_editable'], expected_is_editable)

    def _initialize_database_connection(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]

        self.server_version = parent_node_dict["schema"][-1]["server_version"]

        if self.server_version >= 120000 and self.table_has_oids:
            self.skipTest('Tables with OIDs are not supported starting '
                          'PostgreSQL 12')

        driver_version = utils.get_driver_version()
        driver_version = float('.'.join(driver_version.split('.')[:2]))

        if driver_version < 2.8:
            self.skipTest('Updatable resultsets require pyscopg 2.8 or later')

        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

    def _initialize_query_tool(self):
        self.trans_id = str(random.randint(1, 9999999))
        url = '/datagrid/initialize/query_tool/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url)
        self.assertEqual(response.status_code, 200)

    def _initialize_urls(self):
        self.start_query_tool_url = \
            '/sqleditor/query_tool/start/{0}'.format(self.trans_id)

        self.poll_url = '/sqleditor/poll/{0}'.format(self.trans_id)

    def _create_test_table(self, table_has_oids=False):
        create_sql = """
                            DROP TABLE IF EXISTS {0};

                            CREATE TABLE {0}(
                                pk_col1	SERIAL,
                                pk_col2 SERIAL,
                                normal_col1 VARCHAR,
                                normal_col2 VARCHAR,
                                PRIMARY KEY(pk_col1, pk_col2)
                            )
                      """.format(self.test_table_name)

        if table_has_oids:
            create_sql += ' WITH OIDS;'
        else:
            create_sql += ';'

        utils.create_table_with_query(self.server, self.db_name, create_sql)

    def _close_query_tool(self):
        url = '/datagrid/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)


class TestTemporaryTable(TestQueryUpdatableResultset):
    """ This class will test the query result-set for temporary tables """
    scenarios = [
        ('When selecting all columns of the Temporary table, on commit drop',
         dict(sql='''
                DROP TABLE IF EXISTS {0};
                CREATE TEMPORARY TABLE {0} ON COMMIT DROP AS
                            SELECT
                                CURRENT_DATE AS today;
                SELECT * FROM {0};''',
              expected_primary_keys=None,
              expected_results_column_data=[[date.today().strftime(
                                            "%Y-%m-%d")]],
              expected_has_oids=False,
              expected_results_column_is_editable=False,
              table_has_oids=False,
              expected_cols_is_editable=[False]
              ))
    ]

    def runTest(self):
        response_data = self._execute_select_sql()
        self._check_primary_keys(response_data)
        self._check_oids(response_data)
        # Verifying Temporary table result data on Commit Drop
        self._check_results_column_data(response_data)
        self._check_editable_columns(response_data)

    def _check_results_column_data(self, response_data):
        results_column_data = response_data['data']['result']
        for result_data, expected_is_editable in \
                zip(results_column_data, self.expected_results_column_data):
            self.assertEqual(result_data, expected_is_editable)
