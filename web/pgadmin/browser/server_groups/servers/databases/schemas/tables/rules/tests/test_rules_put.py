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
from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from . import utils as rules_utils


class RulesUpdateTestCase(BaseTestGenerator):
    """This class will update the rule under table node."""
    scenarios = [
        ('Put rule Node URL', dict(url='/browser/rule/obj/'))
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to delete rule.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to delete rule.")
        self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:6])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.rule_name = "test_rule_delete_%s" % (str(uuid.uuid4())[1:6])
        self.rule_id = rules_utils.create_rule(self.server, self.db_name,
                                               self.schema_name,
                                               self.table_name,
                                               self.rule_name)

    def runTest(self):
        """This function will update the rule under table node."""
        rule_response = rules_utils.verify_rule(self.server, self.db_name,
                                                self.rule_name)
        data = {"id": self.rule_id,
                "comment": "This is testing comment."
                }
        if not rule_response:
            raise Exception("Could not find the rule to update.")
        response = self.tester.put(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id, self.table_id,
                                                self.rule_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
