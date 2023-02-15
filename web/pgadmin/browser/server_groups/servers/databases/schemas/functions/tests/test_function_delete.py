##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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


class FunctionDeleteTestCase(BaseTestGenerator):
    """ This class will delete the function under schema node. """
    scenarios = [
        # Fetching default URL for function node.
        ('Fetch Function Node URL', dict(
            url='/browser/function/obj/',
            is_positive_test=True,
            mocking_required=False,
            mock_data={},
            expected_data={
                "status_code": 200
            }
        )),
        ('Delete Function without function id.', dict(
            url='/browser/function/obj/',
            is_positive_test=True,
            mocking_required=False,
            without_functions_id=True,
            test_data={},
            mock_data={},
            expected_data={
                "status_code": 200
            }
        )),
        ('Delete Function Fail', dict(
            url='/browser/function/obj/',
            is_positive_test=False,
            mocking_required=True,
            without_functions_id=False,
            test_data={},
            mock_data={
                "function_name": "pgadmin.utils.driver.psycopg3."
                                 "connection.Connection.execute_2darray",
                "return_value": "(False, 'Mocked Internal Server "
                                "Error while delete function.')"
            },
            expected_data={
                "status_code": 500
            }
        )),
        ('Delete Function with no object found', dict(
            url='/browser/function/obj/',
            is_positive_test=True,
            mocking_required=True,
            mock_empty_result=True,
            test_data={},
            mock_data={
                "function_name": "pgadmin.utils.driver.psycopg3."
                                 "connection.Connection.execute_2darray",
                "return_value": "(True, {'rows': []})"
            },
            expected_data={
                "status_code": 200
            }
        )),
    ]

    def delete_function(self, func_id):
        if hasattr(self, 'without_functions_id'):

            response = self.tester.delete(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(self.server_id) + '/' +
                str(self.db_id) + '/' +
                str(self.schema_id) + '/' + str(func_id),
                data=json.dumps(self.test_data),
                content_type='html/json'
            )
        else:
            response = self.tester.delete(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(self.server_id) + '/' +
                str(self.db_id) + '/' +
                str(self.schema_id) + '/' + str(func_id),
                content_type='html/json'
            )
        return response

    def runTest(self):
        """ This function will delete function under database node. """
        super().setUp()
        self = funcs_utils.set_up(self)

        func_name = "test_function_delete_%s" % str(uuid.uuid4())[1:8]
        function_info = funcs_utils.create_function(
            self.server, self.db_name, self.schema_name, func_name)

        func_id = function_info[0]
        if self.is_positive_test:
            if hasattr(self, 'without_functions_id'):
                func_id = ''
                self.test_data = {
                    "ids": [function_info[0]]
                }
            if hasattr(self, 'mock_empty_result') and self.mock_empty_result:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.delete_function(func_id)
            else:
                response = self.delete_function(func_id)
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                response = self.delete_function(func_id)

        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
