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
from pgadmin.tools.sqleditor.tests.execute_query_test_utils \
    import execute_query

from pgadmin.tools.sqleditor.utils.constant_definition \
    import TX_STATUS_IDLE, TX_STATUS_INTRANS


class TestTransactionControl(BaseTestGenerator):
    """
    This class will test the transaction status after various operations.
    """
    scenarios = [
        ('When auto-commit is enabled, and save is successful', dict(
            is_auto_commit_enabled=True,
            transaction_status=TX_STATUS_IDLE,
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "3",
                            "__temp_PK": "2",
                            "normal_col": "three"
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
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False},
                    {"name": "normal_col",
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
                     "is_array": False}
                ]
            }
        )),
        ('When auto-commit is disabled and save is successful', dict(
            is_auto_commit_enabled=False,
            transaction_status=TX_STATUS_INTRANS,
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "3",
                            "__temp_PK": "2",
                            "normal_col": "three"
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
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False},
                    {"name": "normal_col",
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
                     "is_array": False}
                ]
            }
        )),
        ('When auto-commit is enabled and save fails', dict(
            is_auto_commit_enabled=True,
            transaction_status=TX_STATUS_IDLE,
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "1",
                            "__temp_PK": "2",
                            "normal_col": "four"
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
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False},
                    {"name": "normal_col",
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
                     "is_array": False}
                ]
            }
        )),
        ('When auto-commit is disabled and save fails', dict(
            is_auto_commit_enabled=False,
            transaction_status=TX_STATUS_INTRANS,
            save_payload={
                "updated": {},
                "added": {
                    "2": {
                        "err": False,
                        "data": {
                            "pk_col": "1",
                            "__temp_PK": "2",
                            "normal_col": "four"
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
                        "column_type": "[PK] integer",
                        "column_type_internal": "integer",
                        "pos": 0,
                        "label": "pk_col<br>[PK] integer",
                        "cell": "number",
                        "can_edit": True,
                        "type": "integer",
                        "not_null": True,
                        "has_default_val": False,
                        "is_array": False},
                    {"name": "normal_col",
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
                     "is_array": False}
                ]
            }
        )),
    ]

    def setUp(self):
        self._initialize_database_connection()
        self._initialize_query_tool()
        self._initialize_urls()

    def runTest(self):
        self._create_test_table()
        self._set_auto_commit(self.is_auto_commit_enabled)
        self._execute_select_sql()
        self._check_transaction_status(self.transaction_status)
        self._save_changed_data()
        self._check_transaction_status(self.transaction_status)

        if self.transaction_status == TX_STATUS_INTRANS:
            self._commit_transaction()
            self._check_transaction_status(TX_STATUS_IDLE)

    def tearDown(self):
        # Close query tool
        self._close_query_tool()
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def _set_auto_commit(self, auto_commit):
        response = self.tester.post(self.auto_commit_url,
                                    data=json.dumps(auto_commit),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

    def _execute_select_sql(self):
        is_success, _ = \
            execute_query(tester=self.tester,
                          query=self.select_sql,
                          start_query_tool_url=self.start_query_tool_url,
                          poll_url=self.poll_url)
        self.assertEqual(is_success, True)

    def _check_transaction_status(self, expected_transaction_status):
        # Check transaction status
        response = self.tester.get(self.status_url)
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        transaction_status = response_data['data']['status']
        self.assertEqual(transaction_status, expected_transaction_status)

    def _save_changed_data(self):
        response = self.tester.post(self.save_url,
                                    data=json.dumps(self.save_payload),
                                    content_type='html/json')

        self.assertEqual(response.status_code, 200)

    def _commit_transaction(self):
        is_success, _ = \
            execute_query(tester=self.tester,
                          query='COMMIT;',
                          start_query_tool_url=self.start_query_tool_url,
                          poll_url=self.poll_url)
        self.assertEqual(is_success, True)

    def _initialize_database_connection(self):
        database_info = parent_node_dict["database"][-1]
        self.db_name = database_info["db_name"]
        self.server_id = database_info["server_id"]

        self.server_version = parent_node_dict["schema"][-1]["server_version"]

        self.db_id = database_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        driver_version = utils.get_driver_version()
        driver_version = float('.'.join(driver_version.split('.')[:2]))

        self.is_updatable_resultset_supported = driver_version >= 2.8

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

    def _initialize_urls(self):
        self.start_query_tool_url = \
            '/sqleditor/query_tool/start/{0}'.format(self.trans_id)
        self.save_url = '/sqleditor/save/{0}'.format(self.trans_id)
        self.poll_url = '/sqleditor/poll/{0}'.format(self.trans_id)
        self.auto_commit_url = \
            '/sqleditor/auto_commit/{0}'.format(self.trans_id)
        self.status_url = '/sqleditor/status/{0}'.format(self.trans_id)

    def _create_test_table(self):
        test_table_name = "test_for_updatable_resultset" + \
                          str(secrets.choice(range(1000, 9999)))
        create_sql = """
                            DROP TABLE IF EXISTS "%s";

                            CREATE TABLE "%s"(
                            pk_col	INT PRIMARY KEY,
                            normal_col VARCHAR);

                            INSERT INTO "%s" VALUES
                            (1, 'one'),
                            (2, 'two');
                      """ % (test_table_name,
                             test_table_name,
                             test_table_name)

        self.select_sql = "SELECT * FROM %s" % test_table_name
        utils.create_table_with_query(self.server, self.db_name, create_sql)

    def _close_query_tool(self):
        url = '/sqleditor/close/{0}'.format(self.trans_id)
        response = self.tester.delete(url)
        self.assertEqual(response.status_code, 200)
