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

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fdw_utils
from unittest.mock import patch


class FDWDPutTestCase(BaseTestGenerator):
    """This class will update foreign data wrappers under test database."""
    skip_on_database = ['gpdb']
    scenarios = utils.generate_scenarios('fdw_update',
                                         fdw_utils.test_cases)

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super(FDWDPutTestCase, self).setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_name = "fdw_put_{0}".format(str(uuid.uuid4())[1:8])
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)

    def update_fdw(self):
        """
        This function returns the fdw update response
        :return: fdw update response
        """
        return self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' + str(self.fdw_id),
            data=json.dumps(self.test_data),
            follow_redirects=True)

    def runTest(self):
        """ This function will fetch foreign data wrapper present under
            test database. """
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
        self.test_data['id'] = self.fdw_id

        if self.is_positive_test:
            put_response = self.update_fdw()

        else:
            if hasattr(self, "internal_server_error"):
                with patch(self.mock_data["function_name"],
                           return_value=eval(self.mock_data["return_value"])):
                    put_response = self.update_fdw()

        self.assertEqual(put_response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the FDW and disconnect the test database """
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
