##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from __future__ import print_function

import uuid
import json

from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.\
    tests import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as fsrv_utils


class ForeignServerDeleteMultipleTestCase(BaseTestGenerator):
    """This class will add foreign server under FDW node."""
    skip_on_database = ['gpdb']
    scenarios = [
        # Fetching default URL for foreign server node.
        ('Check FSRV Node', dict(url='/browser/foreign_server/obj/'))
    ]

    def setUp(self):
        """ This function will create extension and foreign data wrapper."""
        super(ForeignServerDeleteMultipleTestCase, self).setUp()
        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.fdw_name = "test_fdw_%s" % (str(uuid.uuid4())[1:8])
        self.fsrv_names = ["test_fsrv_%s" % (str(uuid.uuid4())[1:8]),
                           "test_fsrv_%s" % (str(uuid.uuid4())[1:8])]

        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_ids = [fsrv_utils.create_fsrv(self.server, self.db_name,
                                                self.fsrv_names[0],
                                                self.fdw_name),
                         fsrv_utils.create_fsrv(self.server, self.db_name,
                                                self.fsrv_names[1],
                                                self.fdw_name)]

    def runTest(self):
        """This function will fetch foreign server present under test
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
                                               self.fsrv_names[0])
        if not fsrv_response:
            raise Exception("Could not find FSRV.")
        fsrv_response = fsrv_utils.verify_fsrv(self.server, self.db_name,
                                               self.fsrv_names[1])
        if not fsrv_response:
            raise Exception("Could not find FSRV.")
        data = {'ids': self.fsrv_ids}
        delete_response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.fdw_id) + "/",
            data=json.dumps(data),
            content_type='html/json',
            follow_redirects=True)
        self.assertEquals(delete_response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database and drop added
         foreign data server and dependant objects."""
        fdw_utils.delete_fdw(self.server, self.db_name,
                             self.fdw_name)
        database_utils.disconnect_database(self, self.server_id, self.db_id)
