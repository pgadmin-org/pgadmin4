##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as cast_utils
from unittest.mock import patch


class CastsCreateTestCase(BaseTestGenerator):
    skip_on_database = ['gpdb']
    url = '/browser/cast/obj/'

    # Generates scenarios from cast_test_data.json file
    scenarios = utils.generate_scenarios("cast_create", cast_utils.test_cases)

    def setUp(self):
        """ This function will get data required to create cast."""
        super(CastsCreateTestCase, self).runTest()
        self.data = self.test_data

    def runTest(self):
        """ This function will add cast under test database. """
        self.server_data = parent_node_dict["database"][-1]
        self.server_id = self.server_data["server_id"]
        self.db_id = self.server_data['db_id']
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        if self.is_positive_test:
            response = cast_utils.api_create_cast(self)
            cast_utils.assert_status_code(self, response)
            cast_utils.assert_cast_created(self)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = cast_utils.api_create_cast(self)
                    cast_utils.assert_status_code(self, response)
                    cast_utils.assert_error_message(self, response)
            else:
                response = cast_utils.api_create_cast(self)
                cast_utils.assert_status_code(self, response)

    def tearDown(self):
        """This function disconnect the test database and drop added cast."""
        if self.is_positive_test:
            connection = utils.get_db_connection(self.server_data['db_name'],
                                                 self.server['username'],
                                                 self.server['db_password'],
                                                 self.server['host'],
                                                 self.server['port'],
                                                 self.server['sslmode'])
            cast_utils.drop_cast(connection, self.data["srctyp"],
                                 self.data["trgtyp"])
            database_utils.disconnect_database(self, self.server_id,
                                               self.db_id)
