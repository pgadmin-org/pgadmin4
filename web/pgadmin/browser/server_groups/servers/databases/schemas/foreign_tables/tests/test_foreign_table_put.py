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
import json

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    tests import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers. \
    foreign_servers.tests import utils as fsrv_utils
from regression import parent_node_dict
from regression import test_utils as utils
from . import utils as ft_utils


class ForeignTablePutTestCase(BaseTestGenerator):
    """
    This class will fetch foreign table under database node.
    """
    scenarios = [
        # Fetching default URL for foreign server node.
        ('Check foreign table Node', dict(url='/browser/foreign-table/obj/'))
    ]

    def setUp(self):
        """ This function will create foreign data wrapper, foreign server
        and foreign table. """

        self.schema_data = parent_node_dict['schema'][-1]
        self.server_id = self.schema_data['server_id']
        self.db_id = self.schema_data['db_id']
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        self.schema_name = self.schema_data['schema_name']
        self.schema_id = self.schema_data['schema_id']
        self.fdw_name = "fdw_%s" % (str(uuid.uuid4())[1:4])
        self.fsrv_name = "fsrv_%s" % (str(uuid.uuid4())[1:4])
        self.ft_name = "ft_%s" % (str(uuid.uuid4())[1:4])

        self.fdw_id = fdw_utils.create_fdw(self.server, self.db_name,
                                           self.fdw_name)
        self.fsrv_id = fsrv_utils.create_fsrv(self.server, self.db_name,
                                              self.fsrv_name, self.fdw_name)
        self.ft_id = ft_utils.create_foreign_table(self.server, self.db_name,
                                                   self.schema_name,
                                                   self.fsrv_name, self.ft_name)

    def runTest(self):
        """This function will update foreign table under test database."""

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

        data = \
            {
                "description": "This is foreign table update comment",
                "id": self.ft_id,
            }

        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' +
            str(self.db_id) + '/' +
            str(self.schema_id) + '/' +
            str(self.ft_id),
            data=json.dumps(data),
            follow_redirects=True)

        self.assertEquals(put_response.status_code, 200)

    def tearDown(self):
        """ This function disconnect the test database. """

        database_utils.disconnect_database(self, self.server_id, self.db_id)
