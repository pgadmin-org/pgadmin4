##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
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


class CastsDeleteTestCase(BaseTestGenerator):
    url = '/browser/cast/obj/'
    """ This class will delete the cast node added under database node. """
    scenarios = utils.generate_scenarios("cast_delete",
                                         cast_utils.test_cases)

    def setUp(self):
        super().setUp()
        self.inv_data = self.inventory_data
        self.default_db = self.server["db"]
        self.database_info = parent_node_dict['database'][-1]
        self.db_name = self.database_info['db_name']
        self.server["db"] = self.db_name
        self.cast_id = cast_utils.create_cast(self.server,
                                              self.inv_data["srctyp"],
                                              self.inv_data["trgtyp"])

    def runTest(self):
        """ This function will delete added cast."""
        self.server_id = self.database_info["server_id"]
        self.db_id = self.database_info['db_id']
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        casts_exists = cast_utils.verify_cast(connection,
                                              self.inv_data["srctyp"],
                                              self.inv_data["trgtyp"])
        if not casts_exists:
            raise Exception("Could not find cast.")

        if self.is_positive_test:
            response = cast_utils.api_delete_cast(self, self.cast_id)
            cast_utils.assert_status_code(self, response)
        else:
            if self.mocking_required:
                with patch(self.mock_data["function_name"],
                           side_effect=[eval(self.mock_data["return_value"])]):
                    response = cast_utils.api_delete_cast(self, self.cast_id)
                    cast_utils.assert_status_code(self, response)

                    cast_utils.assert_error_message(self, response)
            else:
                response = cast_utils.api_delete_cast(self, 12398)
                cast_utils.assert_status_code(self, response)

    def tearDown(self):
        """ Actually Delete cast """
        if not self.is_positive_test:
            cast_utils.api_delete_cast(self, self.cast_id)

        """This function will disconnect test database."""
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
        self.server['db'] = self.default_db
