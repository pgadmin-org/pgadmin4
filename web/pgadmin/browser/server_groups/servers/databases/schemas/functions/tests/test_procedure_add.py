##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
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


class ProcedureAddTestCase(BaseTestGenerator):
    """ This class will add new procedure under schema node. """
    skip_on_database = ['gpdb']
    scenarios = [
        # Fetching default URL for procedure node.
        ('Fetch Procedure Node URL', dict(
            url='/browser/procedure/obj/'))
    ]

    def runTest(self):
        """ This function will add procedure under schema node. """
        super(ProcedureAddTestCase, self).setUp()
        self = funcs_utils.set_up(self)

        if self.server_type == "pg" and\
                self.server_version < 110000:
            message = "Procedures are not supported by PG < 110000."
            self.skipTest(message)

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
            "name": "test_pg_11_proc",
            "options": [],
            "proleakproof": True,
            "pronamespace": 2200,
            "prosecdef": True,
            "prosrc": "BEGIN RAISE EXCEPTION 'command % is disabled',"
                      " tg_tag; END;",
            "seclabels": [],
            "variables": [
                {
                    "name": "enable_sort",
                    "value": True
                }, {
                    "name": "search_path",
                    "value": "public, pg_temp"
                }
            ]
        }

        data["name"] = "test_proc_add_%s" % str(uuid.uuid4())[1:8]
        if self.server_type == 'pg':
            data['prosrc'] = 'SELECT 1;'
        if self.schema_id:
            data['pronamespace'] = self.schema_id
        else:
            self.schema_id = data['pronamespace']
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/', data=json.dumps(data),
            content_type='html/json'
        )

        self.assertEqual(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
