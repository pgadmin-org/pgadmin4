##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
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
from . import utils as domain_utils
from unittest.mock import patch


class DomainDeleteTestCase(BaseTestGenerator):
    """ This class will delete new domain under schema node. """
    scenarios = utils.generate_scenarios('domain_delete',
                                         domain_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.db_id = self.database_info["db_id"]
        self.server_id = self.database_info["server_id"]
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.domain_name = "domain_delete_%s" % (str(uuid.uuid4())[1:8])
        self.domain_info = domain_utils.create_domain(self.server,
                                                      self.db_name,
                                                      self.schema_name,
                                                      self.schema_id,
                                                      self.domain_name)

    def delete_domain(self):
        """
        This function returns the domain delete response
        :return: domain delete response
        """
        return self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.domain_id),
            content_type='html/json',
            follow_redirects=True
        )

    def runTest(self):
        """ This function will delete domain under schema node. """

        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get the domain.")
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to get the domain.")
        self.domain_id = self.domain_info[0]
        # Call GET API to verify the domain
        if self.is_positive_test:
            response = self.delete_domain()
        else:
            if hasattr(self, "error_deleting_domain"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    response = self.delete_domain()

            if hasattr(self, "wrong_domain_id"):
                self.domain_id = 99999
                response = self.delete_domain()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
