# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from __future__ import print_function

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression import parent_node_dict
from . import utils as cast_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils


class CastsDeleteTestCase(BaseTestGenerator):
    """ This class will delete the cast node added under database node. """
    scenarios = [
        # Fetching default URL for cast node.
        ('Check Cast Node', dict(url='/browser/cast/obj/'))
    ]

    def setUp(self):
        self.default_db = self.server["db"]
        self.database_info = parent_node_dict['database'][-1]
        self.db_name = self.database_info['db_name']
        self.server["db"] = self.db_name
        self.source_type = 'circle'
        self.target_type = 'line'
        self.cast_id = cast_utils.create_cast(self.server, self.source_type,
                                              self.target_type)

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
                                             self.server['port'])
        response = cast_utils.verify_cast(connection, self.source_type,
                                          self.target_type)
        if len(response) == 0:
            raise Exception("Could not find cast.")
        delete_response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.cast_id),
            follow_redirects=True)
        self.assertEquals(delete_response.status_code, 200)

    def tearDown(self):
        """This function will disconnect test database."""
        database_utils.disconnect_database(self, self.server_id,
                                           self.db_id)
        self.server['db'] = self.default_db
