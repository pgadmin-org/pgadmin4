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


class FunctionPutTestCase(BaseTestGenerator):
    """ This class will update new function under schema node. """
    scenarios = [
        # Fetching default URL for function node.
        ('Fetch Function Node URL', dict(
            url='/browser/function/obj/',
            is_positive_test=True,
            mocking_required=False,
            is_mock_function=False,
            mock_data={},
            expected_data={
                "status_code": 200
            }
        )),
        ('Fetch Function update fail', dict(
            url='/browser/function/obj/',
            is_positive_test=False,
            mocking_required=True,
            is_mock_function=False,
            mock_data={
                "function_name": "pgadmin.utils.driver.psycopg3."
                                 "connection.Connection.execute_scalar",
                "return_value": "(False, 'Mocked Internal Server "
                                "Error while create new function get sql.')"
            },
            expected_data={
                "status_code": 500
            }
        )),
        ('Fetch Function update get sql fail', dict(
            url='/browser/function/obj/',
            is_positive_test=False,
            mocking_required=True,
            is_mock_function=True,
            mock_data={
                "function_name": '_get_sql',
                "return_value": [False, '']
            },
            expected_data={
                "status_code": 500
            }
        )),
        ('Fetch Function update get sql with no result.', dict(
            url='/browser/function/obj/',
            is_positive_test=False,
            mocking_required=True,
            is_mock_function=True,
            mock_data={
                "function_name": '_get_sql',
                "return_value": [True, '']
            },
            expected_data={
                "status_code": 200
            }
        )),
        (
            'Fetch Function update with arguments',
            dict(
                url='/browser/function/obj/',
                is_positive_test=True,
                mocking_required=False,
                with_function_id=True,
                is_mock_local_function=False,
                is_add_argument=True,
                test_data={
                    "arguments": {
                        "changed": [{
                            "argdefval": "2",
                            "argid": 0,
                            "argmode": "IN",
                            "argname": "test",
                            "argtype": "integer",
                        }]
                    }
                },
                mock_data={},
                expected_data={
                    "status_code": 200
                }
            ),
        ),
        (
            'Fetch Function update with arguments fail',
            dict(
                url='/browser/function/obj/',
                is_positive_test=True,
                mocking_required=False,
                with_function_id=True,
                is_mock_local_function=False,
                is_add_argument=True,
                test_data={
                    "arguments": {
                        "changed": [{
                            "argdefval": "2",
                            "argid": 0,
                            "argmode": "IN",
                            "argname": "param",
                            "argtype": "integer",
                        }]
                    }
                },
                mock_data={},
                expected_data={
                    "status_code": 500
                }
            ),
        ),
    ]

    def update_function(self, func_id, data):
        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) +
            '/' + str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(func_id),
            data=json.dumps(data),
            follow_redirects=True)
        return put_response

    def runTest(self):
        """ This function will update function under database node. """
        super().setUp()
        self = funcs_utils.set_up(self)
        func_name = "test_event_delete_%s" % str(uuid.uuid4())[1:8]

        if hasattr(self, "is_add_argument") and self.is_add_argument:
            args = "IN test integer DEFAULT 1"
        else:
            args = ''
        function_info = funcs_utils.create_function(
            self.server, self.db_name, self.schema_name, func_name, args=args)

        func_id = function_info[0]

        data = {
            "description": "This is a procedure update comment",
            "id": func_id
        }

        if hasattr(self, "is_add_argument") and self.is_add_argument:
            data['arguments'] = self.test_data['arguments']

        if self.server_version >= 120000:
            support_function_name = 'supportfunc_%s' % str(uuid.uuid4())[1:8]
            funcs_utils.create_support_internal_function(
                self.server,
                self.db_name,
                self.schema_name,
                support_function_name
            )

            data['prosupportfuc'] = support_function_name

        if self.is_positive_test:
            response = self.update_function(func_id, data)
        else:

            if hasattr(self, 'is_mock_function') and self.is_mock_function:
                local_ref = self

                def _get_sql(self, **kwargs):
                    status = local_ref.mock_data["return_value"][0]
                    result = local_ref.mock_data['return_value'][1]
                    return status, result

                with patch.object(FunctionView,
                                  self.mock_data["function_name"],
                                  new=_get_sql):
                    response = self.update_function(func_id, data)
            else:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.update_function(func_id, data)

        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
