##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
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
from . import utils as views_utils


class ViewsUpdateTestCase(BaseTestGenerator):
    """This class will update the view/mview under schema node."""
    # Generates scenarios
    scenarios = utils.generate_scenarios("view_put", views_utils.test_cases)

    def setUp(self):
        super().setUp()
        # Load test data
        self.data = self.test_data

        # Create db connection
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to update a view.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update a view.")

        query = self.inventory_data['query']

        self.view_name = "test_view_update_%s" % (str(uuid.uuid4())[1:8])

        self.view_id = views_utils.get_view_id(self.server, self.db_name,
                                               self.view_name)
        if self.view_id is None:
            self.view_id = views_utils.create_view(self.server,
                                                   self.db_name,
                                                   self.schema_name,
                                                   self.view_name, query)

    def runTest(self):
        """This function will update the view/mview under schema node."""
        view_response = views_utils.verify_view(self.server, self.db_name,
                                                self.view_name)
        if not view_response:
            raise Exception("Could not find the view to update.")

        self.data["oid"] = self.view_id

        if self.is_positive_test:
            response = views_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = views_utils.api_put(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
