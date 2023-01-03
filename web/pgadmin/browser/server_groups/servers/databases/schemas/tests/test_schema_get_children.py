##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as schema_utils
from unittest.mock import patch


class SchemaChildrenTestCase(BaseTestGenerator):
    """ This class will add new schema under database node. """

    scenarios = utils.generate_scenarios('schema_get_children',
                                         schema_utils.test_cases)

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        # Change the db name, so that schema will create in newly created db
        self.schema_name = "schema_get_%s" % str(uuid.uuid4())[1:8]
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        self.schema_details = schema_utils.create_schema(connection,
                                                         self.schema_name)

    def get_children(self):
        """
        This function returns the schema children response
        :return: schema children response
        """

        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' + str(self.server_id) +
            '/' + str(self.db_id) + '/' + str(self.schema_id),
            follow_redirects=True)

    def runTest(self):
        """ This function will check children
         of schema under database node. """
        self.server_id = self.database_info["server_id"]
        self.db_id = self.database_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")

        self.schema_id = self.schema_details[0]
        schema_name = self.schema_details[1]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")

        if self.is_positive_test:
            response = self.get_children()
        else:
            if hasattr(self, "error_in_db"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.get_children()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
