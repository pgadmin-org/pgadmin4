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

from pgadmin.utils import server_utils as server_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as compound_triggers_utils


class CompoundTriggersUpdateTestCase(BaseTestGenerator):
    """This class will update compound trigger under table node."""
    skip_on_database = ['gpdb']
    scenarios = [
        ('Update comment',
         dict(url='/browser/compound_trigger/obj/',
              data={"description": "This is test comment."}
              )),
        ('Update event and code',
         dict(url='/browser/compound_trigger/obj/',
              data={
                  "evnt_update": True,
                  "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                            "AFTER STATEMENT IS\nBEGIN\n    "
                            "DBMS_OUTPUT.PUT_LINE('After Statement: ' || var)"
                            ";\n    var := 'AFTER STATEMENT';\nEND;\n\nAFTER "
                            "EACH ROW IS\nBEGIN\n    DBMS_OUTPUT.PUT_LINE('"
                            "After each row: ' || var);\n    var := 'AFTER "
                            "EACH ROW';\nEND;",
              })),
        ('Enable compound trigger',
         dict(url='/browser/compound_trigger/obj/',
              data={"is_enable_trigger": 'O'},
              disable_trigger=True
              )),
        ('Enable always compound trigger',
         dict(url='/browser/compound_trigger/obj/',
              data={"is_enable_trigger": 'A'}
              )),
        ('Enable replica compound trigger',
         dict(url='/browser/compound_trigger/obj/',
              data={"is_enable_trigger": 'R'}
              )),
        ('Disable compound trigger',
         dict(url='/browser/compound_trigger/obj/',
              data={"is_enable_trigger": 'D'}
              )),
    ]

    def setUp(self):
        super(CompoundTriggersUpdateTestCase, self).setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        server_con = server_utils.connect_server(self, self.server_id)
        if server_con:
            if "type" in server_con["data"]:
                if server_con["data"]["type"] == "pg":
                    message = "Compound Triggers are not supported by PG."
                    self.skipTest(message)
                elif server_con["data"]["type"] == "ppas" \
                        and server_con["data"]["version"] < 120000:
                    message = "Compound Triggers are not supported by " \
                              "EPAS server less than 12"
                    self.skipTest(message)

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception(
                "Could not connect to database to update a compound trigger.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update a trigger.")
        self.table_name = \
            "table_compound_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

        self.trigger_name = \
            "test_compound_trigger_update_%s" % (str(uuid.uuid4())[1:8])
        self.trigger_id = \
            compound_triggers_utils.create_compound_trigger(self.server,
                                                            self.db_name,
                                                            self.schema_name,
                                                            self.table_name,
                                                            self.trigger_name)

    def runTest(self):
        """This function will update trigger under table node."""
        trigger_response = \
            compound_triggers_utils.verify_compound_trigger(self.server,
                                                            self.db_name,
                                                            self.trigger_name)
        if not trigger_response:
            raise Exception("Could not find the compound trigger to update.")

        if hasattr(self, 'disable_trigger') and self.disable_trigger:
            compound_triggers_utils.enable_disable_compound_trigger(
                self.server,
                self.db_name,
                self.schema_name,
                self.table_name,
                self.trigger_name,
                False
            )

        self.data.update({"id": self.trigger_id})
        response = self.tester.put(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id, self.table_id,
                                                self.trigger_id),
            data=json.dumps(self.data),
            follow_redirects=True
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
