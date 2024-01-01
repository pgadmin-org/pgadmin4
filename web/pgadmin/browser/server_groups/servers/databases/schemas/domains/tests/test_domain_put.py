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
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as domain_utils
from unittest.mock import patch


class DomainPutTestCase(BaseTestGenerator):
    """ This class will fetch new domain under schema node. """
    scenarios = utils.generate_scenarios('domain_update',
                                         domain_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.database_info = parent_node_dict["database"][-1]
        self.db_id = self.database_info["db_id"]
        self.server_id = self.database_info["server_id"]
        self.db_name = self.database_info["db_name"]
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.domain_name = "domain_put_%s" % (str(uuid.uuid4())[1:8])
        self.domain_info = domain_utils.create_domain(self.server,
                                                      self.db_name,
                                                      self.schema_name,
                                                      self.schema_id,
                                                      self.domain_name)

    def update_domain(self):
        """
        This functions update domain  details
        :return: Domain update request details
        """
        return self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.domain_id),
            data=json.dumps(self.test_data),
            follow_redirects=True)

    def runTest(self):
        """ This function will update domain under schema node. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get the domain.")
        db_name = self.database_info["db_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to get the domain.")
        domain_response = domain_utils.verify_domain(self.server,
                                                     db_name,
                                                     self.schema_id,
                                                     self.domain_name)
        if not domain_response:
            raise Exception("Could not find the domain to update.")
        self.domain_id = self.domain_info[0]
        self.test_data['id'] = self.domain_id

        if self.is_positive_test:
            response = self.update_domain()
        else:
            if hasattr(self, "error_updating_domain"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.update_domain()

            if hasattr(self, "error_in_db"):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.update_domain()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
