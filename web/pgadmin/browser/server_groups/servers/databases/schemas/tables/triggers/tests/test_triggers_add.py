# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import json
import uuid

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests \
    import utils as trigger_funcs_utils


class TriggersAddTestCase(BaseTestGenerator):
    """This class will add new trigger under table node."""
    scenarios = [
        ('Add trigger Node URL', dict(url='/browser/trigger/obj/'))
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a trigger.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a trigger.")
        self.table_name = "table_trigger_%s" % (str(uuid.uuid4())[1:6])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.func_name = "trigger_func_add_%s" % str(uuid.uuid4())[1:6]
        self.function_info = \
            trigger_funcs_utils.create_trigger_function_with_trigger(
            self.server, self.db_name, self.schema_name, self.func_name)

    def runTest(self):
        """This function will trigger under table node."""
        trigger_name = "test_trigger_add_%s" % (str(uuid.uuid4())[1:6])
        data = {"name": trigger_name,
                "is_row_trigger": True,
                "fires": "BEFORE",
                "columns": [],
                "tfunction": "{0}.{1}".format(self.schema_name,
                                              self.func_name),
                "evnt_insert": True
                }
        response = self.tester.post(
            "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                             self.server_id, self.db_id,
                                             self.schema_id, self.table_id),
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
