##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tables_utils


class TableAddTestCase(BaseTestGenerator):
    """ This class will add new collation under schema node. """
    url = '/browser/table/obj/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("table_create",
                                         tables_utils.test_cases)

    def setUp(self):
        super().setUp()
        # Load test data
        self.data = self.test_data

        # Check server version
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]

        if "server_min_version" in self.inventory_data:
            server_con = server_utils.connect_server(self, self.server_id)
            if not server_con["info"] == "Server connected.":
                raise Exception("Could not connect to server to add "
                                "partitioned table.")
            if server_con["data"]["version"] < \
                    self.inventory_data["server_min_version"]:
                self.skipTest(self.inventory_data["skip_msg"])

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a table.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a table.")

    def runTest(self):
        """ This function will add table under schema node. """
        if "table_name" in self.data:
            self.table_name = self.data["table_name"]
        else:
            self.table_name = "test_table_add_%s" % (str(uuid.uuid4())[1:8])

        db_user = self.server["username"]

        # Get the common data
        self.data.update(tables_utils.get_table_common_data())
        if self.server_information and \
            'server_version' in self.server_information and \
                self.server_information['server_version'] >= 120000:
            self.data['spcname'] = None
        self.data.update({
            "name": self.table_name,
            "relowner": db_user,
            "schema": self.schema_name,
            "relacl": [{
                "grantee": db_user,
                "grantor": db_user,
                "privileges": [{
                    "privilege_type": "a",
                    "privilege": True,
                    "with_grant": True
                }, {
                    "privilege_type": "r",
                    "privilege": True,
                    "with_grant": False
                }, {
                    "privilege_type": "w",
                    "privilege": True,
                    "with_grant": False
                }]
            }]
        })

        # Add table
        if self.is_positive_test:
            response = tables_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = tables_utils.api_create(self)
            else:
                if self.table_name == "":
                    del self.data["name"]
                response = tables_utils.api_create(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
