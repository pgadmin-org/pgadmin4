##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as funcs_utils


class ProcedurePutTestCase(BaseTestGenerator):
    """ This class will update new procedure under schema node. """
    scenarios = [
        # Fetching default URL for procedure node.
        ('Fetch Procedure Node URL', dict(
            url='/browser/procedure/obj/',
            is_add_argument=False,
            expected_data={
                "status_code": 200
            }
        )),
        (
            'Fetch Procedure update with newly added IN argument is '
            'rejected',
            dict(
                url='/browser/procedure/obj/',
                # PostgreSQL cannot add an IN argument to an existing
                # procedure via CREATE OR REPLACE (it would create a
                # separate, overloaded routine instead), so this must be
                # rejected with a clear error rather than silently
                # producing SQL that orphans a routine.
                is_add_argument=True,
                test_data={
                    "arguments": {
                        "added": [{
                            "argname": "new_arg",
                            "argtype": "integer",
                            "argmode": "IN",
                        }]
                    }
                },
                expected_data={
                    "status_code": 500,
                    "check_errormsg": "overloaded"
                }
            ),
        ),
        (
            'Fetch Procedure update with newly added OUT argument is '
            'rejected',
            dict(
                url='/browser/procedure/obj/',
                # Unlike an added IN/INOUT/VARIADIC argument, an added
                # OUT argument does not change the procedure's
                # identity/signature, but it does change the shape of the
                # returned row, which PostgreSQL rejects outright
                # (SQLSTATE 42P13). This must be rejected with a
                # distinct, accurate error message.
                is_add_argument=True,
                test_data={
                    "arguments": {
                        "added": [{
                            "argname": "new_out_arg",
                            "argtype": "integer",
                            "argmode": "OUT",
                        }]
                    }
                },
                expected_data={
                    "status_code": 500,
                    "check_errormsg": "returned row"
                }
            ),
        ),
    ]

    def update_procedure(self, proc_id, data):
        return self.tester.put(
            self.url + str(utils.SERVER_GROUP) +
            '/' + str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(proc_id),
            data=json.dumps(data),
            follow_redirects=True)

    def runTest(self):
        """ This function will update procedure under database node. """
        super().setUp()
        self = funcs_utils.set_up(self)

        if self.server_type == "pg" and\
                self.server_version < 110000:
            message = "Procedures are not supported by PG < 110000."
            self.skipTest(message)

        func_name = "test_procedure_put_%s" % str(uuid.uuid4())[1:8]
        proc_info = funcs_utils.create_procedure(
            self.server, self.db_name, self.schema_name, func_name,
            self.server_type, self.server_version)

        proc_id = proc_info[0]
        data = {
            "description": "This is procedure update comment",
            "id": proc_id,
            "dependsonextensions": ["plpgsql"]
        }

        if getattr(self, 'is_add_argument', False):
            data['arguments'] = self.test_data['arguments']

        response = self.update_procedure(proc_id, data)
        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])
        if 'check_errormsg' in self.expected_data:
            self.assertIn(self.expected_data['check_errormsg'],
                          response.json['errormsg'])
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

    def tearDown(self):
        pass
