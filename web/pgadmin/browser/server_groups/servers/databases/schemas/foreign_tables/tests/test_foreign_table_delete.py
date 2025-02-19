##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import uuid
from unittest.mock import patch

from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    foreign_servers.tests import utils as fsrv_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    tests import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as ft_utils


class ForeignTableDeleteTestCase(BaseTestGenerator):
    """
    This class will delete foreign table under database node.
    """
    # url
    url = '/browser/foreign_table/obj/'

    # Generates scenarios
    scenarios = utils.generate_scenarios("foreign_table_delete",
                                         ft_utils.test_cases)

    def setUp(self):
        """ This function will create foreign data wrapper, foreign server
        and foreign table. """
        super().setUp()

        # Load test data
        self.data = self.test_data

        # Get parent schema info
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.schema_id = self.schema_data['schema_id']

        # Create FDW, server & table
        self.fdw_name = "fdw_%s" % (str(uuid.uuid4())[1:8])
        self.fsrv_name = "fsrv_%s" % (str(uuid.uuid4())[1:8])
        self.ft_name = "ft_%s" % (str(uuid.uuid4())[1:8])
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_id = fsrv_utils.create_fsrv(self.server, self.db_name,
                                              self.fsrv_name, self.fdw_name)
        self.ft_id = ft_utils.create_foreign_table(self.server, self.db_name,
                                                   self.schema_name,
                                                   self.fsrv_name,
                                                   self.ft_name)

        # In case of multiple foreign tables
        if self.is_list:
            self.ft_name_2 = "ft_%s" % (str(uuid.uuid4())[1:8])
            self.ft_id_2 = ft_utils.create_foreign_table(self.server,
                                                         self.db_name,
                                                         self.schema_name,
                                                         self.fsrv_name,
                                                         self.ft_name_2)
            self.data['ids'] = [self.ft_id, self.ft_id_2]

    def runTest(self):
        """This function will delete foreign table under test database."""

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)

        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")

        fsrv_response = fsrv_utils.verify_fsrv(self.server, self.db_name,
                                               self.fsrv_name)

        if not fsrv_response:
            raise Exception("Could not find Foreign Server.")

        ft_response = ft_utils.verify_foreign_table(self.server, self.db_name,
                                                    self.fsrv_name)
        if not ft_response:
            raise Exception("Could not find Foreign Table.")

        if self.is_positive_test:

            if self.is_list:
                response = ft_utils.api_delete(self)
            else:
                response = ft_utils.api_delete(self, self.ft_id)

            # Assert response
            utils.assert_status_code(self, response)

    def tearDown(self):
        """ This function disconnect the test database. """

        database_utils.disconnect_database(self, self.server_id, self.db_id)
