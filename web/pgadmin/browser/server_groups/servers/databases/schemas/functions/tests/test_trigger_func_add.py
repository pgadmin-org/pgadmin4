# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid
import json

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils


class TriggerFuncAddTestCase(BaseTestGenerator):
    """ This class will add new trigger function under schema node. """
    scenarios = [
        # Fetching default URL for trigger function node.
        ('Fetch Trigger Function Node URL', dict(
            url='/browser/trigger_function/obj/'))
    ]

    def runTest(self):
        """ This function will add trigger function under schema node. """
        db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        server_id = schema_info["server_id"]
        db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 server_id, db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a function.")
        schema_id = schema_info["schema_id"]
        schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      db_name,
                                                      schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a function.")
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
            "prorettypename": "event_trigger/trigger",
            "prosecdef": True,
            "prosrc": "BEGIN RAISE EXCEPTION 'command % is disabled',"
                      " tg_tag; END;",
            "provolatile": "s",
            "seclabels": [],
            "variables": [
                {
                    "name": "enable_sort",
                    "value": True
                }
            ]
        }
        # Get the type from data. We are adding two types
        # i.e. event_trigger and trigger.
        trigger_func_types = data['prorettypename'].split('/')
        for func_type in trigger_func_types:
            data['prorettypename'] = func_type
            data["name"] = "test_event_add_%s" % str(uuid.uuid4())[1:6]
            if schema_id:
                data['pronamespace'] = schema_id
            else:
                schema_id = data['pronamespace']
            response = self.tester.post(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(db_id) + '/' + str(schema_id)
                + '/', data=json.dumps(data), content_type='html/json')

            self.assertEquals(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, server_id, db_id)
