##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
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


class CollationPutTestCase(BaseTestGenerator):
    """ This class will update added collation under schema node. """
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('update_collation',
                                         collation_utils.test_cases)

    def setUp(self):
        super(CollationPutTestCase, self).setUp()
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.server_id = self.schema_info["server_id"]
        self.db_id = self.schema_info["db_id"]
        self.schema_id = self.schema_info["schema_id"]
        coll_name = "collation_get_%s" % str(uuid.uuid4())[1:8]
        self.collation = collation_utils.create_collation(self.server,
                                                          self.schema_name,
                                                          coll_name,
                                                          self.db_name)

    def update_collation(self):
        """
        This function returns the collation delete response
        :return: collation delete response
        """
        return self.tester.put(self.url + str(utils.SERVER_GROUP) +
                               '/' + str(self.server_id) + '/' +
                               str(self.db_id) + '/' + str(self.schema_id) +
                               '/' +
                               str(self.collation_id),
                               data=json.dumps(self.test_data),
                               follow_redirects=True)

    def runTest(self):
        """ This function will update collation under schema node. """
        # Verify database
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")
        # Verify schema
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")
        # Verify collation
        coll_name = self.collation[1]
        collation_response = collation_utils.verify_collation(self.server,
                                                              self.db_name,
                                                              coll_name)
        if not collation_response:
            raise Exception("Could not find the collation.")
        self.collation_id = self.collation[0]
        self.test_data['id'] = self.collation_id

        if self.is_positive_test:
            put_response = self.update_collation()
        else:
            if hasattr(self, "error_updating_collation"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    put_response = self.update_collation()

            if hasattr(self, "internal_server_error"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    put_response = self.update_collation()

        actual_response_code = put_response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect database to delete it
        database_utils.disconnect_database(self, self.server_id, self.db_id)
