##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
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


class ViewsGetMsqlTestCase(BaseTestGenerator):
    """This class will fetch the modified view/mview sql under schema node."""

    # Generates scenarios
    scenarios = utils.generate_scenarios("view_get_msql",
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

    def runTest(self):
        """This function will fetch the modified view/mview sql under
        schema node."""

        if self.is_positive_test:
            url_encode_data = {"oid": self.view_id}
            for key in ('comment', 'definition'):
                if key in self.data:
                    url_encode_data[key] = self.data[key]

            response = views_utils.api_get_msql(self, url_encode_data)

            # Assert response
            utils.assert_status_code(self, response)

            result = self.expected_data.get('test_result_data', {})
            sql = json.loads(response.data.decode('utf-8'))['data']
            if 'sql_contains' in result:
                self.assertIn(result['sql_contains'], sql)
            if 'sql_not_contains' in result:
                self.assertNotIn(result['sql_not_contains'], sql)
        else:
            if 'view_id' in self.data:
                # Non-existing view id
                self.view_id = self.data["view_id"]
                response = views_utils.api_get(self)

            # Assert response
            utils.assert_status_code(self, response)
            utils.assert_error_message(self, response)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
