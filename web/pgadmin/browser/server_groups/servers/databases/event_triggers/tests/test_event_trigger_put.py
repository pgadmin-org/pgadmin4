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

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from regression import test_utils as utils
from regression import parent_node_dict
from regression import trigger_funcs_utils
from . import utils as event_trigger_utils


class EventTriggerPutTestCase(BaseTestGenerator):
    """ This class will fetch added event trigger under test database. """
    scenarios = [
        # Fetching default URL for event trigger  node.
        ('Fetch Event Trigger Node URL',
         dict(url='/browser/event_trigger/obj/'))
    ]

    def setUp(self):
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.schema_name = self.schema_data['schema_name']
        self.schema_id = self.schema_data['schema_id']
        self.extension_name = "postgres_fdw"
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.db_user = self.server["username"]
        self.func_name = "trigger_func_%s" % str(uuid.uuid4())[1:6]
        self.trigger_name = "event_trigger_put_%s" % (str(uuid.uuid4())[1:6])
        self.function_info = trigger_funcs_utils.create_trigger_function(
            self.server, self.db_name, self.schema_name, self.func_name)
        self.event_trigger_id = event_trigger_utils.create_event_trigger(
            self.server, self.db_name, self.schema_name, self.func_name,
            self.trigger_name)

    def runTest(self):
        """ This function will update event trigger under test database. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")
        func_name = self.function_info[1]
        func_response = trigger_funcs_utils.verify_trigger_function(
            self.server,
            self.db_name,
            func_name)
        if not func_response:
            raise Exception("Could not find the trigger function.")
        trigger_response = event_trigger_utils.verify_event_trigger(
            self.server, self.db_name, self.trigger_name)
        if not trigger_response:
            raise Exception("Could not find event trigger.")
        data = {
                "comment": "This is event trigger update comment",
                "id": self.event_trigger_id
            }
        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.event_trigger_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(put_response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)

