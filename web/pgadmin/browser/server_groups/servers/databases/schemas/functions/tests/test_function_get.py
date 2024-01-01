##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils


class FunctionGetTestCase(BaseTestGenerator):
    """This class will fetch added function under schema node."""
    scenarios = [
        # Fetching default URL for function node.
        (
            'Fetch Function Node URL',
            dict(
                url='/browser/function/obj/',
                is_positive_test=True,
                mocking_required=False,
                mock_data={},
                expected_data={
                    "status_code": 200
                }
            )
        ),
        (
            'Fetch Function properties fail.',
            dict(
                url='/browser/function/obj/',
                is_positive_test=False,
                mocking_required=True,
                mock_data={
                    "function_name": "pgadmin.utils.driver.psycopg3."
                                     "connection.Connection.execute_dict",
                    "return_value": "(False, 'Mocked Internal Server "
                                    "Error while get properties.')"
                },
                expected_data={
                    "status_code": 500
                }
            )
        ),
        (
            'Fetch Function properties no function found.',
            dict(
                url='/browser/function/obj/',
                is_positive_test=False,
                mocking_required=True,
                mock_data={
                    "function_name": "pgadmin.utils.driver.psycopg3."
                                     "connection.Connection.execute_dict",
                    "return_value": "(False, {'rows': []})"
                },
                expected_data={
                    "status_code": 500
                }
            )
        )
    ]

    def get_properties(self, trigger_func_id):
        response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' + str(trigger_func_id),
            content_type='html/json')
        return response

    def runTest(self):
        """ This function will delete function under database node. """
        super().setUp()
        self = funcs_utils.set_up(self)

        func_name = "test_function_get_%s" % str(uuid.uuid4())[1:8]
        function_info = funcs_utils.create_function(
            self.server, self.db_name, self.schema_name, func_name)

        trigger_func_id = function_info[0]
        if self.is_positive_test:
            response = self.get_properties(trigger_func_id)
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                response = self.get_properties(trigger_func_id)

        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
