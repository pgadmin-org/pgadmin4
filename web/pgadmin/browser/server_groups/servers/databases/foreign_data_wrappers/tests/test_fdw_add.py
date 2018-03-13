##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function

import json

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fdw_utils


class FDWDAddTestCase(BaseTestGenerator):
    """ This class will add foreign data wrappers under database node. """
    skip_on_database = ['gpdb']

    scenarios = [
        # Fetching default URL for foreign_data_wrapper node.
        ('Check FDW Node',
         dict(url='/browser/foreign_data_wrapper/obj/'))
    ]

    def setUp(self):
        """ This function will create extension."""
        super(FDWDAddTestCase, self).setUp()

        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.schema_name = self.schema_data['schema_name']
        self.db_name = parent_node_dict["database"][-1]["db_name"]

    def runTest(self):
        """This function will add foreign data wrapper under test database."""
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database.")
        self.data = fdw_utils.get_fdw_data(self.schema_name,
                                           self.server['username'])
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function delete the FDW and disconnect the test database """
        fdw_utils.delete_fdw(self.server, self.db_name, self.data["name"])
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
