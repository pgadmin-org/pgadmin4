##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
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


class FunctionAddTestCase(BaseTestGenerator):
    """ This class will add new function under schema node. """
    scenarios = [
        # Fetching default URL for function node.
        ('Fetch Function Node URL', dict(
            url='/browser/function/obj/'))
    ]

    def runTest(self):
        """ This function will add function under schema node. """
        super(FunctionAddTestCase, self).runTest()
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

        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(data),
            content_type='html/json'
        )

        self.assertEquals(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
