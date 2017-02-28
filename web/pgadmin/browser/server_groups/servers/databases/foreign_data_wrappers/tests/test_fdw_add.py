# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function
import json

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.extensions.tests import \
    utils as extension_utils
from . import utils as fdw_utils
from regression import parent_node_dict
from regression import test_utils as utils


class FDWDAddTestCase(BaseTestGenerator):
    """ This class will add foreign data wrappers under database node. """
    scenarios = [
        # Fetching default URL for foreign_data_wrapper node.
        ('Check FDW Node',
         dict(url='/browser/foreign_data_wrapper/obj/'))
    ]

    def setUp(self):
        """ This function will create extension."""
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
        """This function disconnect the test database and
            drop added extension."""
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
