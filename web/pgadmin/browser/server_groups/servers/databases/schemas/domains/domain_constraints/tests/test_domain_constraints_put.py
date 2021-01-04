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
from . import utils as domain_cons_utils
from unittest.mock import patch


class DomainConstraintPutTestCase(BaseTestGenerator):
    """ This class will add new domain constraint under schema node. """

    scenarios = utils.generate_scenarios('domain_constraints_update',
                                         domain_cons_utils.test_cases)

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        self.domain_name = "domain_%s" % (str(uuid.uuid4())[1:8])
        self.domain_con_name = \
            "test_domain_con_upd_%s" % (str(uuid.uuid4())[1:8])

        self.domain_info = \
            domain_cons_utils.create_domain(
                self.server,
                self.db_name,
                self.schema_name,
                self.schema_id,
                self.domain_name)

        self.domain_constraint_id = \
            domain_cons_utils.create_domain_constraints(
                self.server,
                self.db_name,
                self.schema_name,
                self.domain_name,
                self.domain_con_name)

    def update_domain_constraint(self):
        """
        This functions update domain constraint
        :return: Domain Constraint update request details
        """
        return self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.domain_id) + '/' +
            str(self.domain_constraint_id),
            data=json.dumps(self.test_data),
            follow_redirects=True)

    def runTest(self):
        """ This function will update domain under schema node. """
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")

        self.domain_id = self.domain_info[0]
        domain_name = self.domain_info[1]

        domain_response = domain_cons_utils.verify_domain(
            self.server,
            self.db_name,
            self.schema_id,
            domain_name)
        if not domain_response:
            raise Exception("Could not find the domain.")

        domain_cons_response = domain_cons_utils.verify_domain_constraint(
            self.server, self.db_name,
            self.domain_con_name)
        if not domain_cons_response:
            raise Exception("Could not find domain constraint.")

        if self.is_positive_test:
            response = self.update_domain_constraint()

        else:
            if hasattr(self, "error_in_db"):
                with patch(self.mock_data["function_name"],
                           side_effect=eval(self.mock_data["return_value"])):
                    response = self.update_domain_constraint()

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
