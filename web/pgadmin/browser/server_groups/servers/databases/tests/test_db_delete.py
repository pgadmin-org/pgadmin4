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
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from . import utils as database_utils


class DatabaseDeleteTestCase(BaseTestGenerator):
    """ This class will delete the database under last added server. """

    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node URL', dict(url='/browser/database/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function perform the three tasks
         1. Add the test server
         2. Connect to server
         3. Add the databases

        :return: None
        """

        # Firstly, add the server
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
        """ This function will delete the database."""

        database_utils.delete_database(self.tester)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added server and the 'parent_id.pkl' file
        which is created in setup() function.

        :return: None
        """

        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
