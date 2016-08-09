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

from . import utils as server_utils


class ServerDeleteTestCase(BaseTestGenerator):
    """ This class will delete the last server present under tree node."""

    scenarios = [
        # Fetching the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function is used to add the server

        :return: None
        """

        # Firstly, add the server
        server_utils.add_server(cls.tester)

    def runTest(self):
        """ This function will get all available servers under object browser
        and delete the last server using server id."""

        server_utils.delete_server(self.tester)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the 'parent_id.pkl' file which is created in
        setup() function.

        :return: None
        """

        utils.delete_parent_id_file()
