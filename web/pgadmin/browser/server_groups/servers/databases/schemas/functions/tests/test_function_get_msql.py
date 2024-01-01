##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils
from urllib.parse import urlencode
from .. import FunctionView


class FunctionGetmsqlTestCase(BaseTestGenerator):
    """ This class get SQL. """
    scenarios = [
        (
            'Fetch Function msql',
            dict(
                url='/browser/function/msql/',
                is_positive_test=True,
                mocking_required=False,
                is_mock_local_function=False,
                test_data={
                    "name": "Test Function",
                    "funcowner": "",
                    "pronamespace": 2200,
                    "prorettypename": "character varying",
                    "lanname": "sql",
                    "arguments": [],
                    "prosrc": "select '1'",
                    "probin": "$libdir/",
                    "variables": [],
                    "seclabels": [],
                    "acl": []
                },
                mock_data={},
                expected_data={
                    "status_code": 200
                }
            ),
        ),
        (
            'Fetch Function msql fail',
            dict(
                url='/browser/function/msql/',
                is_positive_test=False,
                mocking_required=True,
                is_mock_local_function=True,
                test_data={
                    "name": "Test Function",
                    "funcowner": "",
                    "pronamespace": 2200,
                    "prorettypename": "character varying",
                    "lanname": "sql",
                    "arguments": [],
                    "prosrc": "select '1'",
                    "probin": "$libdir/",
                    "variables": [],
                    "seclabels": [],
                    "acl": []
                },
                mock_data={
                    "function_name": '_get_sql',
                    "return_value": "(False, '')"
                },
                expected_data={
                    "status_code": 500
                }
            ),
        ),
        (
            'Fetch Function msql with function id',
            dict(
                url='/browser/function/msql/',
                is_positive_test=True,
                mocking_required=True,
                with_function_id=True,
                is_mock_local_function=True,
                test_data={
                    "name": "Test Function",
                    "funcowner": "",
                    "pronamespace": 2200,
                    "prorettypename": "character varying",
                    "lanname": "sql",
                    "arguments": [],
                    "prosrc": "select '1'",
                    "probin": "$libdir/",
                    "variables": [],
                    "seclabels": [],
                    "acl": []
                },
                mock_data={
                    "function_name": '_get_sql',
                    "return_value": "(False, '')"
                },
                expected_data={
                    "status_code": 200
                }
            ),
        ),
        (
            'Fetch Function msql fetch properties fail',
            dict(
                url='/browser/function/msql/',
                is_positive_test=False,
                mocking_required=True,
                with_function_id=True,
                is_mock_local_function=False,
                test_data={
                    "name": "Test Function",
                    "funcowner": "",
                    "pronamespace": 2200,
                    "prorettypename": "character varying",
                    "lanname": "sql",
                    "arguments": [],
                    "prosrc": "select '1'",
                    "probin": "$libdir/",
                    "variables": [],
                    "seclabels": [],
                    "acl": []
                },
                mock_data={
                    "function_name": "pgadmin.utils.driver.psycopg3."
                                     "connection.Connection.execute_dict",
                    "return_value": "(False, 'Mocked Internal Server "
                                    "Error while get msq fetch properties.')"
                },
                expected_data={
                    "status_code": 500
                }
            )
        ),
        (
            'Fetch Function msql fetch properties not found',
            dict(
                url='/browser/function/msql/',
                is_positive_test=False,
                mocking_required=True,
                with_function_id=True,
                is_mock_local_function=False,
                test_data={
                    "name": "Test Function",
                    "funcowner": "",
                    "pronamespace": 2200,
                    "prorettypename": "character varying",
                    "lanname": "sql",
                    "arguments": [],
                    "prosrc": "select '1'",
                    "probin": "$libdir/",
                    "variables": [],
                    "seclabels": [],
                    "acl": []
                },
                mock_data={
                    "function_name": "pgadmin.utils.driver.psycopg3."
                                     "connection.Connection.execute_dict",
                    "return_value": "(True, {'rows': []})"
                },
                expected_data={
                    "status_code": 500
                }
            ),
        ),
    ]

    def get_sql(self):
        if hasattr(self, "with_function_id") and self.with_function_id:
            func_name = "test_function_delete_%s" % str(uuid.uuid4())[1:8]
            function_info = funcs_utils.create_function(
                self.server, self.db_name, self.schema_name, func_name)

            func_id = function_info[0]
            self.test_data['oid'] = func_id
            self.test_data['name'] = func_name
            url = self.url + str(utils.SERVER_GROUP) + '/' + str(
                self.server_id) + '/' + str(self.db_id) + '/' + str(
                self.schema_id) + '/' + str(func_id) + '?' + (
                urlencode(self.test_data))
        else:
            url = self.url + str(utils.SERVER_GROUP) + '/' + str(
                self.server_id) + '/' + str(self.db_id) + '/' + str(
                self.schema_id) + '/?' + (urlencode(self.test_data))
        response = self.tester.get(
            url,
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will get function nodes under schema. """
        super().runTest()
        self = funcs_utils.set_up(self)
        db_user = self.server["username"]
        self.test_data["funcowner"] = db_user

        if self.is_positive_test:
            response = self.get_sql()
        else:
            def _get_sql(self, **kwargs):
                return False, ''
            if self.is_mock_local_function:
                with patch.object(FunctionView,
                                  self.mock_data["function_name"],
                                  new=_get_sql):
                    response = self.get_sql()
            else:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.get_sql()

        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
