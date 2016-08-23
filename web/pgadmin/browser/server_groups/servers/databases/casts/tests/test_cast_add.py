# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from . import utils as cast_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils


class CastsAddTestCase(BaseTestGenerator):
    scenarios = [
        # Fetching default URL for cast node.
        ('Check Cast Node', dict(url='/browser/cast/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
         This function perform the following tasks:
              1. Add and connect to the test server(s)
              2. Add database(s) connected to server(s)

        :return: None
        """

        # Add the server
        server_utils.add_server(cls.tester)

        # Connect to server
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the database!!!")

        # Add database
        database_utils.add_database(cls.tester, cls.server_connect_response,
                                    cls.server_ids)

    def runTest(self):
        """ This function will add cast under database node. """

        cast_utils.add_cast(self.tester)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added cast, database, server and the
        'parent_id.pkl' file which is created in setUpClass.

        :return: None
        """

        cast_utils.delete_cast(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
