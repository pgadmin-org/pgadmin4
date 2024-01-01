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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as views_utils


class ViewsDeleteTestCase(BaseTestGenerator):
    """This class will delete the view/mview under schema node."""

    # Generates scenarios
    scenarios = utils.generate_scenarios("view_delete",
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
            raise Exception("Could not connect to database to delete view.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to delete the view.")

        # Create view
        query = self.inventory_data['query']

        self.view_name = "test_view_delete_%s" % (str(uuid.uuid4())[1:8])

        self.view_id = views_utils.create_view(self.server,
                                               self.db_name,
                                               self.schema_name,
                                               self.view_name,
                                               query)

        view_response = views_utils.verify_view(self.server, self.db_name,
                                                self.view_name)
        if not view_response:
            raise Exception("Could not find the view to delete.")

        if self.is_list:
            self.view_name_2 = "test_view_delete_%s" % (str(uuid.uuid4())[1:8])

            self.view_id_2 = views_utils.create_view(self.server,
                                                     self.db_name,
                                                     self.schema_name,
                                                     self.view_name_2,
                                                     query)

            view_response = views_utils.verify_view(self.server, self.db_name,
                                                    self.view_name_2)
            if not view_response:
                raise Exception("Could not find the view to delete.")

            # list to delete views
            self.data['ids'] = [self.view_id, self.view_id_2]

    def runTest(self):
        """This function will delete the view/mview under schema node."""

        if self.is_positive_test:

            if self.is_list:
                response = views_utils.api_delete(self, '')
            else:
                response = views_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)

            # Verify in backend
            view_response = views_utils.verify_view(self.server, self.db_name,
                                                    self.view_name)
            self.assertIsNone(view_response, "Deleted view still present")
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = views_utils.api_delete(self)
            elif 'view_id' in self.data:
                self.view_id = self.data["view_id"]
                response = views_utils.api_delete(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
