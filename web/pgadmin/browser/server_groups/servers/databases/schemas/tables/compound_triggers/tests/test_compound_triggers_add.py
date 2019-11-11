##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
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
from pgadmin.browser.server_groups.servers.databases.schemas.views.tests \
    import utils as view_utils


class CompoundTriggersAddTestCase(BaseTestGenerator):
    """This class will add new compound trigger under table node."""
    skip_on_database = ['gpdb']
    scenarios = [
        ('Create compound trigger for all events',
         dict(
             url='/browser/compound_trigger/obj/',
             data={
                 "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                           "BEFORE STATEMENT IS\nBEGIN\n    "
                           "DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var)"
                           ";\n var := 'BEFORE STATEMENT';\nEND;",
                 "evnt_insert": True,
                 "evnt_update": True,
                 "evnt_delete": True,
                 "evnt_truncate": True
             }
         )),
        ('Create compound trigger for insert and delete',
         dict(
             url='/browser/compound_trigger/obj/',
             data={
                 "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                           "BEFORE STATEMENT IS\nBEGIN\n    "
                           "DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var)"
                           ";\n    var := 'BEFORE STATEMENT';\nEND;\n\nBEFORE "
                           "EACH ROW IS\nBEGIN\n    DBMS_OUTPUT.PUT_LINE('"
                           "Before each row: ' || var);\n    var := 'BEFORE "
                           "EACH ROW';\nEND;",
                 "evnt_insert": True,
                 "evnt_update": False,
                 "evnt_delete": True
             }
         )),
        ('Create compound trigger for insert with when condition',
         dict(
             url='/browser/compound_trigger/obj/',
             data={
                 "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                           "BEFORE EACH ROW IS\nBEGIN\n    "
                           "DBMS_OUTPUT.PUT_LINE('Before each row: ' || var)"
                           ";\n    var := 'EACH ROW';\nEND;",
                 "evnt_insert": True,
                 "evnt_update": False,
                 "evnt_delete": False,
                 "whenclause": "NEW.id < 100"
             }
         )),
        ('Create compound trigger for insert or update on columns',
         dict(
             url='/browser/compound_trigger/obj/',
             data={
                 "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                           "BEFORE STATEMENT IS\nBEGIN\n    "
                           "DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var)"
                           ";\n var := 'BEFORE STATEMENT';\nEND;\n\nBEFORE "
                           "EACH ROW IS\nBEGIN\n DBMS_OUTPUT.PUT_LINE('"
                           "Before each row: ' || var);\n var := 'BEFORE "
                           "EACH ROW';\nEND;",
                 "evnt_insert": True,
                 "evnt_update": True,
                 "columns": ["id", "name"]
             }
         )),
        ('Create compound trigger for truncate',
         dict(
             url='/browser/compound_trigger/obj/',
             data={
                 "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                           "BEFORE STATEMENT IS\nBEGIN\n    "
                           "DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var)"
                           ";\n var := 'BEFORE STATEMENT';\nEND;",
                 "evnt_truncate": True
             }
         )),
        ('Create compound trigger for insert delete and update on view',
         dict(
             url='/browser/compound_trigger/obj/',
             data={
                 "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                           "BEFORE STATEMENT IS\nBEGIN\n    "
                           "DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var)"
                           ";\n var := 'BEFORE STATEMENT';\nEND;",
                 "evnt_insert": True,
                 "evnt_update": True,
                 "evnt_delete": True,
                 "evnt_truncate": False
             },
             on_view=True
         )),
        ('Create compound trigger for instead of each row',
         dict(
             url='/browser/compound_trigger/obj/',
             data={
                 "prosrc": "var varchar2(20) := 'Global_var';\n\n"
                           "INSTEAD OF EACH ROW IS\nBEGIN\n    "
                           "DBMS_OUTPUT.PUT_LINE('Instead of: ' || var)"
                           ";\n var := 'INSTEAD OF EACH ROW';\nEND;",
                 "evnt_insert": True,
                 "evnt_update": True,
                 "evnt_delete": True,
                 "evnt_truncate": False
             },
             on_view=True
         )),
    ]

    def setUp(self):
        super(CompoundTriggersAddTestCase, self).setUp()
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
            raise Exception("Could not connect to database to add a trigger.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception(
                "Could not find the schema to add a compound trigger.")
        self.table_name = \
            "table_compound_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        view_sql = "CREATE OR REPLACE VIEW %s.%s AS SELECT 'Hello World'; " \
                   "ALTER TABLE %s.%s OWNER TO %s"
        self.view_name = \
            "view_compound_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.view_id = view_utils.create_view(self.server, self.db_name,
                                              self.schema_name,
                                              view_sql,
                                              self.view_name)

    def runTest(self):
        """This function will create compound trigger under table node."""
        trigger_name = \
            "test_compound_trigger_add_%s" % (str(uuid.uuid4())[1:8])

        self.data.update({"name": trigger_name})

        object_id = self.table_id
        if hasattr(self, 'on_view'):
            object_id = self.view_id

        response = self.tester.post(
            "{0}{1}/{2}/{3}/{4}/{5}/".format(self.url, utils.SERVER_GROUP,
                                             self.server_id, self.db_id,
                                             self.schema_id, object_id),
            data=json.dumps(self.data),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
