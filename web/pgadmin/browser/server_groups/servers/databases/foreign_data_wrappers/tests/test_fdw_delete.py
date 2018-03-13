##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function

import uuid

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fdw_utils


class FDWDDeleteTestCase(BaseTestGenerator):
    """This class will delete foreign data wrappers under test database."""
    skip_on_database = ['gpdb']
    scenarios = [  # Fetching default URL for foreign_data_wrapper node.
        ('Check FDW Node',
         dict(url='/browser/foreign_data_wrapper/obj/'))]

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super(FDWDDeleteTestCase, self).setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_name = "fdw_{0}".format(str(uuid.uuid4())[1:8])
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)

    def runTest(self):
        """This function will fetch foreign data wrapper present under test
         database."""
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
        delete_response = self.tester.delete(self.url +
                                             str(utils.SERVER_GROUP) +
                                             '/' + str(self.server_id) + '/' +
                                             str(self.db_id) +
                                             '/' + str(self.fdw_id),
                                             follow_redirects=True)
        self.assertEquals(delete_response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database and drop added extension
         and dependant objects."""
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
