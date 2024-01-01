##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
from unittest.mock import patch

from pgadmin.utils import server_utils
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
import sys


class CompoundTriggersDeleteTestCase(BaseTestGenerator):
    """This class will delete compound trigger under table node."""
    scenarios = utils.generate_scenarios('delete_compound_trigger',
                                         compound_triggers_utils.test_cases)

    def setUp(self):
        super().setUp()
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
                "Could not connect to database to delete a compound trigger.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception(
                "Could not find the schema to delete a compound trigger.")
        self.table_name = \
            "table_compound_trigger_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)

        self.trigger_name = \
            "test_compound_trigger_delete_%s" % (str(uuid.uuid4())[1:8])
        self.trigger_id = \
            compound_triggers_utils.create_compound_trigger(self.server,
                                                            self.db_name,
                                                            self.schema_name,
                                                            self.table_name,
                                                            self.trigger_name)

    def delete_compound_trigger(self):
        return self.tester.delete(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id, self.table_id,
                                                self.trigger_id),
            follow_redirects=True
        )

    def runTest(self):
        """This function will update trigger under table node."""
        trigger_response = \
            compound_triggers_utils.verify_compound_trigger(self.server,
                                                            self.db_name,
                                                            self.trigger_name)
        if not trigger_response:
            raise Exception("Could not find the compound trigger to delete.")
        if self.is_positive_test:
            if hasattr(self, "invalid_compound_trigger_id"):
                self.trigger_id = 9999
            response = self.delete_compound_trigger()
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                response = self.delete_compound_trigger()

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
