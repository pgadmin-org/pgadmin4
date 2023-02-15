##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json
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


class ViewsGetNodesTestCase(BaseTestGenerator):
    """This class will fetch the view nodes under schema node."""

    # Generates scenarios
    scenarios = utils.generate_scenarios("view_get_nodes",
                                         views_utils.test_cases)

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
            raise Exception("Could not connect to database to fetch the view.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to fetch the view.")

        # Create view
        query = self.inventory_data['query']

        self.view_name = "test_view_get_%s" % (str(uuid.uuid4())[1:8])

        self.view_id = views_utils.create_view(self.server,
                                               self.db_name,
                                               self.schema_name,
                                               self.view_name,
                                               query)
        # In case of multiple views
        if self.is_list:
            self.view_name_2 = "test_view_get_%s" % (str(uuid.uuid4())[1:8])
            self.check_constraint_id_2 = views_utils.\
                create_view(self.server, self.db_name, self.schema_name,
                            self.view_name_2, query)

    def runTest(self):
        """This function will fetch the view/mview nodes under schema node."""
        if self.is_positive_test:
            if self.is_list:
                response = views_utils.api_get(self, '')
            else:
                response = views_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)

        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = views_utils.api_get(self)
            elif 'view_id' in self.data:
                # Non-existing view/mview id
                self.view_id = self.data["view_id"]
                response = views_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
