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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as views_utils


class MViewsUpdateParameterTestCase(BaseTestGenerator):
    """This class will check materialized view refresh functionality."""
    # Generates scenarios
    scenarios = utils.generate_scenarios("mview_refresh",
                                         views_utils.test_cases)

    def setUp(self):
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
            raise Exception("Could not connect to database to update a mview.")

        # Create schema
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to update a mview.")

        query = self.inventory_data['query']

        self.m_view_name = "test_mview_put_%s" % (str(uuid.uuid4())[1:8])

        self.view_id = views_utils.create_view(self.server,
                                               self.db_name,
                                               self.schema_name,
                                               self.m_view_name,
                                               query)

    def runTest(self):
        """This class will check materialized view refresh functionality"""
        mview_response = views_utils.verify_view(self.server, self.db_name,
                                                 self.m_view_name)
        if not mview_response:
            raise Exception("Could not find the mview to update.")

        if self.is_put_request:
            # Check utility
            url_from_test_data = self.url
            self.url = 'browser/mview/check_utility_exists/'
            response = views_utils.api_get(self)
            if response.json['success'] == 0:
                self.skipTest("Couldn't check materialized view refresh "
                              "functionality because utility/binary does "
                              "not exists.")
            # reset self.url value
            self.url = url_from_test_data

            if self.is_positive_test:
                response = views_utils.api_put(self)

                # Assert response
                utils.assert_status_code(self, response)
                self.assertTrue('job_id' in response.json['data'])
            else:
                if 'm_view_id' in self.data:
                    self.view_id = self.data['m_view_id']
                    response = views_utils.api_put(self)
                    # Assert response
                    utils.assert_status_code(self, response)
                    utils.assert_error_message(self, response)

        else:
            # only check utility
            response = views_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
