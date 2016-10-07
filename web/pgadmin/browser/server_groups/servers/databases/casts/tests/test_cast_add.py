# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function
import json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression import test_utils as utils
from . import utils as cast_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils


class CastsAddTestCase(BaseTestGenerator):
    scenarios = [
        # Fetching default URL for cast node.
        ('Check Cast Node', dict(url='/browser/cast/obj/'))
    ]

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

        self.data = cast_utils.get_cast_data()
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(
                self.db_id) + '/',
            data=json.dumps(self.data),
            content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function disconnect the test database and drop added cast."""
        connection = utils.get_db_connection(self.server_data['db_name'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        cast_utils.drop_cast(connection, self.data["srctyp"],
                             self.data["trgtyp"])
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
