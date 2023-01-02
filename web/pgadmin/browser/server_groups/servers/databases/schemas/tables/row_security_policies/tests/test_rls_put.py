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
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as policy_utils
from pgadmin.browser.server_groups.servers.roles.tests import \
    utils as roles_utils
import sys


class PolicyUpdateTestCase(BaseTestGenerator):
    """This class will update the policy under table node."""
    scenarios = utils.generate_scenarios('update_policy',
                                         policy_utils.test_cases)

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to delete policy.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to delete policy.")
        self.table_name = "table_column_%s" % (str(uuid.uuid4())[1:8])
        self.table_id = tables_utils.create_table(self.server, self.db_name,
                                                  self.schema_name,
                                                  self.table_name)
        self.policy_name = "test_policy_delete_%s" % (str(uuid.uuid4())[1:8])
        self.policy_id = policy_utils.create_policy(self.server, self.db_name,
                                                    self.schema_name,
                                                    self.table_name,
                                                    self.policy_name)
        if hasattr(self, "owner_policy"):
            self.role_name = "role_for_policy_%s" % \
                             str(uuid.uuid4())[1:8]
            self.role_id = roles_utils.create_role(self.server, self.role_name)

    def update_policy(self, data):
        return self.tester.put(
            "{0}{1}/{2}/{3}/{4}/{5}/{6}".format(self.url, utils.SERVER_GROUP,
                                                self.server_id, self.db_id,
                                                self.schema_id, self.table_id,
                                                self.policy_id),
            data=json.dumps(data),
            follow_redirects=True)

    def runTest(self):
        """This function will update the policy under table node."""
        policy_name = policy_utils.verify_policy(self.server, self.db_name,
                                                 self.policy_name)
        self.test_data['name'] = "test_policy_update_%s" % (
            str(uuid.uuid4())[1:8])
        self.test_data['id'] = self.policy_id

        if hasattr(self, 'owner_policy'):
            self.test_data['policyowner'] = self.role_name

        if not policy_name:
            raise Exception("Could not find the policy to update.")

        if self.is_positive_test:
            if hasattr(self, "wrong_policy_id"):
                self.policy_id = 9999
            if hasattr(self, "plid_none"):
                self.policy_id = ''
            response = self.update_policy(self.test_data)
        else:
            with patch(self.mock_data["function_name"],
                       return_value=eval(self.mock_data["return_value"])):
                if hasattr(self, "wrong_policy_id"):
                    self.policy_id = 9999
                response = self.update_policy(self.test_data)

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])

        if hasattr(self, "owner_policy"):
            policy_utils.delete_policy(self.server, self.db_name,
                                       self.test_data['name'],
                                       self.schema_name,
                                       self.table_name)
            roles_utils.delete_role(connection, self.role_name)
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
