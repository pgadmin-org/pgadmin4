##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

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


class CollationNodesTestCase(BaseTestGenerator):
    """ This class will test node api for existing index"""
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('get_collation_nodes_and_node',
                                         collation_utils.test_cases)

    def setUp(self):
        super(CollationNodesTestCase, self).setUp()
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        coll_name = "collation_get_%s" % str(uuid.uuid4())[1:8]
        self.collation = collation_utils.create_collation(self.server,
                                                          self.schema_name,
                                                          coll_name,
                                                          self.db_name)

    def get_collation_nodes(self):
        """
        This functions returns the collation nodes
        :return: collation nodes
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' + str(self.schema_id) + '/',
            content_type='html/json')

    def get_collation_node(self):
        """
        This functions returns the collation node
        :return: collation node
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' + str(self.schema_id) + '/' +
            str(self.collation_id), content_type='html/json')

    def runTest(self):
        """This function will call method providing node details"""
        self.schema_id = self.schema_info["schema_id"]
        self.server_id = self.schema_info["server_id"]
        self.db_id = self.schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")
        self.collation_id = self.collation[0]

        if self.is_positive_test:
            if hasattr(self, "node"):
                response = self.get_collation_node()
            else:
                response = self.get_collation_nodes()
        else:
            if hasattr(self, "error_fetching_collation"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    if hasattr(self, "node"):
                        response = self.get_collation_node()
                    else:
                        response = self.get_collation_nodes()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
