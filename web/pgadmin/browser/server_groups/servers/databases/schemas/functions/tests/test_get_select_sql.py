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
from .. import FunctionView


class FunctionGetSelectSqlTestCase(BaseTestGenerator):
    """ This class get select SQL for functions. """
    scenarios = [
        (
            'Fetch Function select sql.',
            dict(
                url='/browser/function/select_sql/',
                is_positive_test=True,
                mocking_required=False,
                is_add_argument=False,
                mock_data={},
                expected_data={
                    "status_code": 200
                }
            ),
        ),
        (
            'Fetch Function select sql fail',
            dict(
                url='/browser/function/select_sql/',
                is_positive_test=False,
                mocking_required=True,
                is_add_argument=False,
                mock_data={
                    "function_name": 'pgadmin.utils.driver.psycopg3.'
                                     'connection.Connection.execute_2darray',
                    "return_value": "(False, 'Mocked Internal Server Error "
                                    "while get select sql.')"
                },
                expected_data={
                    "status_code": 500
                }
            ),
        ),
        (
            'Fetch Function select sql not found',
            dict(
                url='/browser/function/select_sql/',
                is_positive_test=False,
                mocking_required=True,
                is_add_argument=False,
                mock_data={
                    "function_name": 'pgadmin.utils.driver.psycopg3.'
                                     'connection.Connection.execute_2darray',
                    "return_value": "(True, {'rows': []})"
                },
                expected_data={
                    "status_code": 410
                }
            ),
        ),
        (
            'Fetch Function select sql with arguments',
            dict(
                url='/browser/function/select_sql/',
                is_positive_test=True,
                mocking_required=False,
                is_add_argument=True,
                mock_data={},
                expected_data={
                    "status_code": 200
                }
            ),
        ),
    ]

    def get_select_sql(self):
        func_name = "test_function_delete_%s" % str(uuid.uuid4())[1:8]
        if self.is_add_argument:
            args = "IN test integer DEFAULT 1"
        else:
            args = None
        function_info = funcs_utils.create_function(
            self.server, self.db_name, self.schema_name, func_name, args=args)

        func_id = function_info[0]

        response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/' + str(func_id),
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will get function nodes under schema. """
        super().runTest()
        self = funcs_utils.set_up(self)

        if self.is_positive_test:
            response = self.get_select_sql()
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                response = self.get_select_sql()

        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
