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


class TriggerFuncAddTestCase(BaseTestGenerator):
    """ This class will add new trigger function under schema node. """
    skip_on_database = ['gpdb']
    scenarios = [
        # Fetching default URL for trigger function node.
        ('Fetch Trigger Function Node URL', dict(
            url='/browser/trigger_function/obj/'))
    ]

    def runTest(self):
        """ This function will add trigger function under schema node. """
        super(TriggerFuncAddTestCase, self).runTest()
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
            "lanname": "plpgsql",
            "name": "test_abort_any_command",
            "options": [],
            "proleakproof": True,
            "pronamespace": 2200,
            "prorettypename": self.prorettypename,
            "prosecdef": True,
            "prosrc": "BEGIN RAISE EXCEPTION 'command % is disabled',"
                      " tg_tag; END;",
            "provolatile": "s",
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
        # Get the type from data. We are adding two types
        # i.e. event_trigger and trigger.
        trigger_func_types = data['prorettypename'].split('/')
        for func_type in trigger_func_types:
            data['prorettypename'] = func_type
            data["name"] = "test_event_add_%s" % str(uuid.uuid4())[1:8]
            if self.schema_id:
                data['pronamespace'] = self.schema_id
            else:
                self.schema_id = data['pronamespace']
            response = self.tester.post(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(self.server_id) + '/' + str(self.db_id) +
                '/' + str(self.schema_id) +
                '/', data=json.dumps(data), content_type='html/json'
            )

            self.assertEquals(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
