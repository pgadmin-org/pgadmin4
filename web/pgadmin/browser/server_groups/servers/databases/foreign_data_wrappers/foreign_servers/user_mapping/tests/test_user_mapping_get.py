# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.extensions.tests import \
    utils as extension_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.tests \
    import utils as fdw_utils
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    foreign_servers.tests import utils as fsrv_utils
from . import utils as um_utils


class UserMappingGetTestCase(BaseTestGenerator):
    """This class will add user mapping under foreign server node."""
    scenarios = [
        # Fetching default URL for user mapping node.
        ('Check user mapping Node', dict(url='/browser/user_mapping/obj/'))
    ]

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.extension_name = "postgres_fdw"
        self.fdw_name = "fdw_%s" % (str(uuid.uuid4())[1:6])
        self.fsrv_name = "fsrv_%s" % (str(uuid.uuid4())[1:6])
        self.extension_id = extension_utils.create_extension(
            self.server, self.db_name, self.extension_name, self.schema_name)
        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_id = fsrv_utils.create_fsrv(self.server, self.db_name,
                                              self.fsrv_name, self.fdw_name)
        self.um_id = um_utils.create_user_mapping(self.server, self.db_name,
                                                  self.fsrv_name)

    def runTest(self):
        """This function will update foreign server present under test
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
        fsrv_response = fsrv_utils.verify_fsrv(self.server, self.db_name,
                                               self.fsrv_name)
        if not fsrv_response:
            raise Exception("Could not find FSRV.")
        response = self.tester.get(self.url + str(utils.SERVER_GROUP) + '/' +
                                   str(self.server_id) + '/' + str(
            self.db_id) +
                                   '/' + str(self.fdw_id) + '/' + str(
            self.fsrv_id) + '/' + str(
            self.um_id), content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database and drop added extension
         and dependant objects."""
        extension_utils.drop_extension(self.server, self.db_name,
                                       self.extension_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
