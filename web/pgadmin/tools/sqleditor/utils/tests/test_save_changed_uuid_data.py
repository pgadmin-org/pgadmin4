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

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from pgadmin.tools.sqleditor.tests.execute_query_test_utils import\
    execute_query


class TestSaveChangedDataUUID(BaseTestGenerator):
    """ This class tests saving data changes to updatable query resultsets """
    scenarios = [
        ('When inserting new valid row', dict(
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "6ecd8c99-4036-403d-bf84-cf8400f67836",
                            "__temp_PK":
                                "237e9877-e79b-12d4-a765-321741963000",
                            "normal_col": "three",
                            "char_col": "char",
                            "bit_col": "10101"
                        }
                    }
                },
                "staged_rows": {},
                "deleted": {},
                "updated_index": {},
                "added_index": {"2": "2"},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] uuid",
                        "column_type_internal": "uuid",
                        "pos": 0,
                        "label": "pk_col<br>[PK] uuid",
                        "cell": "string",
                        "can_edit": True,
                        "type": "string",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=True,
            check_sql="SELECT * FROM %s WHERE "
                      "pk_col = '6ecd8c99-4036-403d-bf84-cf8400f67836'",
            check_result=[['6ecd8c99-4036-403d-bf84-cf8400f67836',
                           "three", "char", "10101"]]
        )),
        ('When deleting a row', dict(
            save_payload={
                "updated": {},
                "added": {},
                "staged_rows":
                    {"1": {"pk_col": "578b6a7f-c6d4-4f30-a9fe-05c9c417bbd9"}},
                "deleted":
                    {"1": {"pk_col": "578b6a7f-c6d4-4f30-a9fe-05c9c417bbd9"}},
                "updated_index": {},
                "added_index": {},
                "columns": [
                    {
                        "name": "pk_col",
                        "display_name": "pk_col",
                        "column_type": "[PK] uuid",
                        "column_type_internal": "uuid",
                        "pos": 0,
                        "label": "pk_col<br>[PK] uuid",
                        "cell": "string",
                        "can_edit": True,
                        "type": "string",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "normal_col",
                        "display_name": "normal_col",
                        "column_type": "character varying",
                        "column_type_internal": "character varying",
                        "pos": 1,
                        "label": "normal_col<br>character varying",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character varying",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "char_col",
                        "display_name": "normal_col",
                        "column_type": "character",
                        "column_type_internal": "character",
                        "pos": 2,
                        "label": "char_col<br>character",
                        "cell": "string",
                        "can_edit": True,
                        "type": "character",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }, {
                        "name": "bit_col",
                        "display_name": "bit_col",
                        "column_type": "bit",
                        "column_type_internal": "bit",
                        "pos": 3,
                        "label": "bit_col<br>bit",
                        "cell": "string",
                        "can_edit": True,
                        "type": "bit",
                        "not_null": False,
                        "has_default_val": False,
                        "is_array": False
                    }
                ]
            },
            save_status=True,
            check_sql="SELECT * FROM %s WHERE "
                      "pk_col = '578b6a7f-c6d4-4f30-a9fe-05c9c417bbd9'",
            check_result='SELECT 0'
        )),
    ]

    def setUp(self):
        self._initialize_database_connection()
        self._initialize_query_tool()
        self._initialize_urls_and_select_sql()

    def runTest(self):
        self._create_test_table()
        self._execute_sql_query(self.select_sql)
        self._save_changed_data()
        self._check_saved_data()

    def tearDown(self):
        # Close query tool
        self._close_query_tool()
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def _execute_sql_query(self, query):
        is_success, response_data = \
            execute_query(tester=self.tester,
                          query=query,
                          start_query_tool_url=self.start_query_tool_url,
                          poll_url=self.poll_url)
        self.assertEqual(is_success, True)
        return response_data

    def _save_changed_data(self):
        # Send a request to save changed data
        response = self.tester.post(self.save_url,
                                    data=json.dumps(self.save_payload),
                                    content_type='html/json')

        self.assertEqual(response.status_code, 200)

        # Check that the save is successful
        response_data = json.loads(response.data.decode('utf-8'))
        save_status = response_data['data']['status']
        self.assertEqual(save_status, self.save_status)

    def _check_saved_data(self):
        check_sql = self.check_sql % self.test_table_name
        response_data = self._execute_sql_query(check_sql)
        # Check table for updates
        result = response_data['data']['result']
        self.assertEqual(result, self.check_result)

    def _initialize_database_connection(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]

        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        driver_version = utils.get_driver_version()
        driver_version = float('.'.join(driver_version.split('.')[:2]))

        if driver_version < 2.8:
            self.skipTest('Updatable resultsets require pyscopg 2.8 or later')

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to the database.")

    def _initialize_query_tool(self):
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        url = '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
            self.trans_id, utils.SERVER_GROUP, self.server_id, self.db_id)
        response = self.tester.post(url, data=json.dumps({
            "dbname": self.db_name
        }))
        self.assertEqual(response.status_code, 200)

    def _initialize_urls_and_select_sql(self):
        self.start_query_tool_url = \
            '/sqleditor/query_tool/start/{0}'.format(self.trans_id)
        self.save_url = '/sqleditor/save/{0}'.format(self.trans_id)
        self.poll_url = '/sqleditor/poll/{0}'.format(self.trans_id)

    def _create_test_table(self):
        self.test_table_name = "test_for_save_data" + \
                               str(secrets.choice(range(1000, 9999)))
        create_sql = """
                            DROP TABLE IF EXISTS "%s";

                            CREATE TABLE "%s"(
                            pk_col UUID PRIMARY KEY,
                            normal_col character varying(5),
                            char_col character(4),
                            bit_col bit(5));

                            INSERT INTO "%s" VALUES
                            ('578b6a7f-c6d4-4f30-a9fe-05c9c417bbd9',
                             'one', 'ch1', '00000'),
                            ('c81d4e2e-bcf2-11e6-869b-7df92533d2db',
                             'two', 'ch2', '11111');
                      """ % (self.test_table_name,
                             self.test_table_name,
                             self.test_table_name)
        self.select_sql = 'SELECT * FROM %s;' % self.test_table_name

        utils.create_table_with_query(self.server, self.db_name, create_sql)

    def _close_query_tool(self):
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)
