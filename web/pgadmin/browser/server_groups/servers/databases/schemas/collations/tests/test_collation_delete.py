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


class CollationDeleteTestCase(BaseTestGenerator):
    """ This class will delete added collation under schema node. """
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('delete_collation',
                                         collation_utils.test_cases)

    def setUp(self):
        super(CollationDeleteTestCase, self).setUp()
        self.schema_info = parent_node_dict["schema"][-1]
        self.server_id = self.schema_info["server_id"]
        self.db_id = self.schema_info["db_id"]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.coll_name = "collation_get_%s" % str(uuid.uuid4())[1:8]
        self.collation = collation_utils.create_collation(self.server,
                                                          self.schema_name,
                                                          self.coll_name,
                                                          self.db_name)
        self.collation_id = self.collation[0]

    def delete_collation(self):
        """
        This function returns the collation delete response
        :return: collation delete response
        """
        return self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' + str(
                self.server_id) + '/' +
            str(self.db_id) + '/' + str(self.schema_id) + '/' +
            str(self.collation_id),
            content_type='html/json')

    def runTest(self):
        """ This function will delete collation under schema node. """
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")

        if self.is_positive_test:
            response = self.delete_collation()

        else:
            if hasattr(self, "error_deleting_collation"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.delete_collation()

            if hasattr(self, "error_deleting_created_collation"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.delete_collation()

            if hasattr(self, "wrong_collation_id"):
                self.collation_id = 99999
                response = self.delete_collation()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect database to delete it
        database_utils.disconnect_database(self, self.server_id, self.db_id)
