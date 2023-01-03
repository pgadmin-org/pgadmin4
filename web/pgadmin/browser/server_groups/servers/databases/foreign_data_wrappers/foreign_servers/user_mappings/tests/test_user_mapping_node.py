##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid

from pgadmin.browser.server_groups.servers.databases.extensions.tests import \
    utils as extension_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    foreign_servers.tests import utils as fsrv_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.\
    tests import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as um_utils
from unittest.mock import patch


class UserMappingNodesTestCase(BaseTestGenerator):
    """This class will delete user mapping under foreign server node."""
    scenarios = utils.generate_scenarios('user_mapping_get_nodes',
                                         um_utils.test_cases)

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super().setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_name = "fdw_%s" % (str(uuid.uuid4())[1:8])
        self.fsrv_name = "fsrv_%s" % (str(uuid.uuid4())[1:8])
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_id = fsrv_utils.create_fsrv(self.server, self.db_name,
                                              self.fsrv_name, self.fdw_name)
        self.um_id = um_utils.create_user_mapping(self.server, self.db_name,
                                                  self.fsrv_name)

    def get_user_mapping_node(self, um_id):
        """
        This function returns the user mapping node response
        :return: user mapping node response
        """
        return self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.fdw_id) + '/' +
            str(self.fsrv_id) + '/' + str(um_id),
            follow_redirects=True)

    def runTest(self):
        """This function will fetch user mapping present under test
         database. """
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        fdw_response = fdw_utils.verify_fdw(self.server, self.db_name,
                                            self.fdw_name)
        if not fdw_response:
            raise Exception("Could not find FDW.")
        fsrv_response = fsrv_utils.verify_fsrv(self.server, self.db_name,
                                               self.fsrv_name)
        if not fsrv_response:
            raise Exception("Could not find FSRV.")
        um_response = um_utils.verify_user_mapping(self.server, self.db_name,
                                                   self.fsrv_name)
        if not um_response:
            raise Exception("Could not find user mapping.")

        if self.is_positive_test:
            if hasattr(self, "node"):
                response = self.get_user_mapping_node(self.um_id)
            else:
                response = self.get_user_mapping_node("")
        else:
            if hasattr(self, "internal_server_error"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    if hasattr(self, "node"):
                        response = self.get_user_mapping_node(self.um_id)
                    else:
                        response = self.get_user_mapping_node("")

        actual_response_code = response.status_code
        expected_response_code = self.expected_data['status_code']
        self.assertEqual(actual_response_code, expected_response_code)

    def tearDown(self):
        """This function disconnect the test database and drop
         foreign data wrapper and dependant objects."""
        fdw_utils.delete_fdw(self.server, self.db_name,
                             self.fdw_name)
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
