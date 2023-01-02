##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
from . import utils as domain_cons_utils
from unittest.mock import patch


class DomainConstraintAddTestCase(BaseTestGenerator):
    """ This class will add new domain constraint under schema node. """

    scenarios = utils.generate_scenarios('domain_constraint_create',
                                         domain_cons_utils.test_cases)

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        self.domain_name = "domain_%s" % (str(uuid.uuid4())[1:8])

        self.domain_info = domain_cons_utils.create_domain(self.server,
                                                           self.db_name,
                                                           self.schema_name,
                                                           self.schema_id,
                                                           self.domain_name)

    def create_domain_constraint(self):
        """
        This function create a domain constraint and returns it
        :return: created domain constraint response
        """
        return self.tester.post(self.url + str(utils.SERVER_GROUP) + '/' +
                                str(self.server_id) + '/' +
                                str(self.db_id) +
                                '/' + str(self.schema_id) + '/' +
                                str(self.domain_id) + '/',
                                data=json.dumps(self.test_data),
                                content_type='html/json',
                                follow_redirects=True)

    def runTest(self):
        """ This function will add domain constraint under test database. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")
        self.test_data['name'] =\
            "test_domain_con_add_%s" % (str(uuid.uuid4())[1:8])
        self.domain_id = self.domain_info[0]

        if self.is_positive_test:
            response = self.create_domain_constraint()
        else:
            if hasattr(self, "internal_server_error"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.create_domain_constraint()

            if hasattr(self, "error_in_db"):
                return_value_object = eval(self.mock_data["return_value"])
                with patch(self.mock_data["function_name"],
                           side_effect=[return_value_object]):
                    response = self.create_domain_constraint()

            if hasattr(self, "error_getting_coid"):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.create_domain_constraint()

            if hasattr(self, "error_domain_id"):
                self.domain_id = 99999
                response = self.create_domain_constraint()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
