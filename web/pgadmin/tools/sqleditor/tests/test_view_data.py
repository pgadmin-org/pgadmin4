##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
import secrets
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression import parent_node_dict
from regression.python_test_utils import test_utils
from unittest.mock import patch
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import async_poll


class TestViewData(BaseTestGenerator):
    """
    This class checks the view data result for a table with JSON datatype
    """
    scenarios = [
        (
            'Table with JSON datatype',
            dict(
                table_sql="""Create Table <TABLE_NAME>(
                id integer Not Null,
                json_val json Not Null,
                Constraint table_pk Primary Key(id)
                );""",
                result_data='SELECT 0',
                rows_fetched_to=0
            )
        ),
        (
            'Sort table data without primary key in the table',
            dict(
                table_sql="""Create Table <TABLE_NAME>(
                        id integer Not Null,
                        json_val json Not Null
                        );""",
                result_data='SELECT 0',
                rows_fetched_to=0
            )
        ),
        (
            'Sort table data by default order with primary key in table',
            dict(
                table_sql="""Create Table <TABLE_NAME>(
                                   id integer Not Null,
                                   json_val json Not Null,
                                   Constraint table_pk_sort Primary Key(id)
                                   );""",
                result_data='SELECT 0',
                rows_fetched_to=0,
                mock_data={
                    'function_to_be_mocked': "pgadmin.utils.preferences."
                                             "_Preference.get",
                    'return_value': False
                }
            )
        )
    ]

    def setUp(self):
        self.server_id = self.server_information['server_id']
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.db_id = self.database_info["db_id"]

        self.connection = test_utils.get_db_connection(
            self.db_name,
            self.server['username'],
            self.server['db_password'],
            self.server['host'],
            self.server['port']
        )

    def runTest(self):
        self.table = "test_table_%s" % (str(uuid.uuid4())[1:8])
        self.table_sql = self.table_sql.replace('<TABLE_NAME>', self.table)
        # Create table
        test_utils.create_table_with_query(self.server,
                                           self.db_name,
                                           self.table_sql)

        # Fetch Table OID
        pg_cursor = self.connection.cursor()
        pg_cursor.execute("""Select oid FROM pg_catalog.pg_class WHERE
         relname = '%s' AND relkind IN ('r','s','t')""" % self.table)

        result = pg_cursor.fetchall()
        table_id = result[0][0]

        # Initialize query tool
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/viewdata/{0}/3/table/{1}/{2}/{3}/{4}' \
            .format(self.trans_id, test_utils.SERVER_GROUP, self.server_id,
                    self.db_id, table_id)

        if hasattr(self, 'mock_data'):
            with patch(
                self.mock_data['function_to_be_mocked'],
                return_value=self.mock_data['return_value']
            ):
                response = self.tester.post(url)
        else:
            response = self.tester.post(url)

        self.assertEqual(response.status_code, 200)

        url = "/sqleditor/view_data/start/{0}".format(self.trans_id)
        response = self.tester.get(url)
        self.assertEqual(response.status_code, 200)

        response = async_poll(tester=self.tester,
                              poll_url='/sqleditor/poll/{0}'.format(
                                  self.trans_id))
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))

        self.assertEqual(response_data['data']['result'], self.result_data)
        self.assertEqual(response_data['data']['rows_fetched_to'],
                         self.rows_fetched_to)

    def tearDown(self):
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
