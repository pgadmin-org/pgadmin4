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
from . import utils as collation_utils
from unittest.mock import patch


class CollationAddTestCase(BaseTestGenerator):
    """ This class will add new collation under schema node. """
    scenarios = utils.generate_scenarios('create_collation',
                                         collation_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.server_id = self.schema_info["server_id"]
        self.db_id = self.schema_info["db_id"]

        # Change the db name, so that schema will create in newly created db
        self.schema_name = "schema_get_%s" % str(uuid.uuid4())[1:8]
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        self.schema_details = schema_utils.create_schema(connection,
                                                         self.schema_name)

    def create_collation(self):
        """
        This function create a collation and returns the created collation
        response
        :return: created collation response
        """
        return self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/' +
            str(self.schema_id) + '/',
            data=json.dumps(self.test_data),
            content_type='html/json')

    def runTest(self):
        """ This function will add collation under schema node. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add collation.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add the collation.")

        self.test_data['copy_collation'] = "pg_catalog.\"C\""
        self.test_data['name'] = "collation_add_%s" % str(uuid.uuid4())[1:8]
        self.test_data['owner'] = self.server["username"]
        self.test_data['schema'] = self.schema_name
        self.test_data['provider'] = "icu"
        self.test_data['is_deterministic'] = True
        self.test_data['version'] = "test"

        if self.is_positive_test:
            response = self.create_collation()
        else:
            if hasattr(self, "parameter_missing"):
                del self.test_data['name']
                response = self.create_collation()

            if hasattr(self, "error_incomplete_definition"):
                del self.test_data['copy_collation']
                response = self.create_collation()

            if hasattr(self, "error_getting_collation_oid"):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.create_collation()

            if hasattr(self, "internal_server_error"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.create_collation()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
