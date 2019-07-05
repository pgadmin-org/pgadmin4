##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from .execute_query_utils import execute_query


class TestQueryUpdatableResultset(BaseTestGenerator):
    """ This class will test the detection of whether the query
        result-set is updatable. """
    scenarios = [
        ('When selecting all columns of the table', dict(
            sql='SELECT * FROM test_for_updatable_resultset;',
            primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            }
        )),
        ('When selecting all primary keys of the table', dict(
            sql='SELECT pk_col1, pk_col2 FROM test_for_updatable_resultset;',
            primary_keys={
                'pk_col1': 'int4',
                'pk_col2': 'int4'
            }
        )),
        ('When selecting some of the primary keys of the table', dict(
            sql='SELECT pk_col2 FROM test_for_updatable_resultset;',
            primary_keys=None
        )),
        ('When selecting none of the primary keys of the table', dict(
            sql='SELECT normal_col1 FROM test_for_updatable_resultset;',
            primary_keys=None
        )),
        ('When renaming a primary key', dict(
            sql='SELECT pk_col1 as some_col, '
                'pk_col2 FROM test_for_updatable_resultset;',
            primary_keys=None
        )),
        ('When renaming a column to a primary key name', dict(
            sql='SELECT pk_col1, pk_col2, normal_col1 as pk_col1 '
                'FROM test_for_updatable_resultset;',
            primary_keys=None
        ))
    ]

    def setUp(self):
        self._initialize_database_connection()
        self._initialize_query_tool()
        self._initialize_urls()
        self._create_test_table()

    def runTest(self):
        is_success, response_data = \
            execute_query(tester=self.tester,
                          query=self.sql,
                          poll_url=self.poll_url,
                          start_query_tool_url=self.start_query_tool_url)
        self.assertEquals(is_success, True)

        # Check primary keys
        primary_keys = response_data['data']['primary_keys']
        self.assertEquals(primary_keys, self.primary_keys)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def _initialize_database_connection(self):
        database_info = parent_node_dict["database"][-1]
        self.server_id = database_info["server_id"]

        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

    def _initialize_query_tool(self):
        url = '/datagrid/initialize/query_tool/{0}/{1}/{2}'.format(
            utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url)
        self.assertEquals(response.status_code, 200)

        response_data = json.loads(response.data.decode('utf-8'))
        self.trans_id = response_data['data']['gridTransId']

    def _initialize_urls(self):
        self.start_query_tool_url = \
            '/sqleditor/query_tool/start/{0}'.format(self.trans_id)

        self.poll_url = '/sqleditor/poll/{0}'.format(self.trans_id)

    def _create_test_table(self):
        create_sql = """
                            DROP TABLE IF EXISTS test_for_updatable_resultset;

                            CREATE TABLE test_for_updatable_resultset(
                                pk_col1	SERIAL,
                                pk_col2 SERIAL,
                                normal_col1 VARCHAR,
                                normal_col2 VARCHAR,
                                PRIMARY KEY(pk_col1, pk_col2)
                            );
                      """

        is_success, _ = \
            execute_query(tester=self.tester,
                          query=create_sql,
                          start_query_tool_url=self.start_query_tool_url,
                          poll_url=self.poll_url)
        self.assertEquals(is_success, True)
