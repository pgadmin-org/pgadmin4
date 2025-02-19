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

from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as domain_utils
from unittest.mock import patch


class DomainAddTestCase(BaseTestGenerator):
    """ This class will add new domain under schema node. """

    scenarios = utils.generate_scenarios('domain_create',
                                         domain_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]

    def create_domain(self):
        """
        This function create a domain and returns the created domain
        response
        :return: created domain response
        """
        return self.tester.post(self.url + str(utils.SERVER_GROUP) + '/' +
                                str(self.server_id) + '/' +
                                str(self.db_id) +
                                '/' + str(self.schema_id) + '/',
                                data=json.dumps(self.test_data),
                                content_type='html/json')

    def runTest(self):
        """ This function will add domain under schema node. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add collation.")
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add the collation.")

        self.test_data['basensp'] = self.schema_name
        self.test_data['owner'] = self.server["username"]
        # Call POST API to add domain
        if self.is_positive_test:
            response = self.create_domain()
        else:
            if hasattr(self, "internal_server_error"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.create_domain()

            if hasattr(self, "error_getting_doid"):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.create_domain()

            if hasattr(self, "error_getting_scid"):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.create_domain()

        expected_response_code = self.expected_data['status_code']

        self.assertEqual(response.status_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
