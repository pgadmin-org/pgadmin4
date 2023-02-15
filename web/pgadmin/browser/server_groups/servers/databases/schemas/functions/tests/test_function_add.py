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
from .. import FunctionView


class FunctionAddTestCase(BaseTestGenerator):
    """ This class will add new function under schema node. """
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
            ),
        ),
        ('Create Function Get Sql Fail', dict(
            url='/browser/function/obj/',
            is_positive_test=False,
            mocking_required=True,
            is_mock_function=True,
            mock_data={
                "function_name": '_get_sql',
                "return_value": "(False, '')"
            },
            expected_data={
                "status_code": 500
            }
        )),
        ('Create Function Get Sql Execution Fail', dict(
            url='/browser/function/obj/',
            is_positive_test=False,
            mocking_required=True,
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
        ('Create Function Fail', dict(
            url='/browser/function/obj/',
            is_positive_test=False,
            mocking_required=True,
            mock_data={
                "function_name": "pgadmin.utils.driver.psycopg3."
                                 "connection.Connection.execute_dict",
                "return_value": "(False, 'Mocked Internal Server "
                                "Error while create new function.')"
            },
            expected_data={
                "status_code": 500
            }
        )),
    ]

    def create_function(self, data):
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(data),
            content_type='html/json'
        )
        return response

    def runTest(self):
        """ This function will add function under schema node. """
        super().runTest()
        self = funcs_utils.set_up(self)
        db_user = self.server["username"]
        data = {
            "acl": [
                {
                    "grantee": db_user,
                    "grantor": db_user,
                    "privileges":
                        [
                            {
                                "privilege_type": "X",
                                "privilege": True,
                                "with_grant": True
                            }
                        ]
                }
            ],
            "arguments": [],
            "funcowner": db_user,
            "lanname": "sql",
            "name": "test_function",
            "options": [],
            "proleakproof": True,
            "pronamespace": 2200,
            "prorettypename": "integer",
            "prosecdef": True,
            "prosrc": "SELECT 1;",
            "probin": "$libdir/",
            "provolatile": "s",
            "seclabels": [],
            "variables": [{
                "name": "search_path",
                "value": "public, pg_temp"
            }]
        }

        data["name"] = "test_function_add_%s" % str(uuid.uuid4())[1:8]
        if self.schema_id:
            data['pronamespace'] = self.schema_id
        else:
            self.schema_id = data['pronamespace']

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
            response = self.create_function(data)
        else:
            if hasattr(self, 'is_mock_function'):
                def _get_sql(self, **kwargs):
                    return False, ''
                with patch.object(FunctionView,
                                  self.mock_data["function_name"],
                                  new=_get_sql):
                    response = self.create_function(data)

            else:
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.create_function(data)

        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
