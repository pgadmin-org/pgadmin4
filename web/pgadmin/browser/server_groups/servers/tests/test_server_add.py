# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from . import utils as server_utils


class ServersAddTestCase(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = [
        # Fetch the default url for server object
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        pass

    def runTest(self):
        """ This function will add the server under default server group."""

        server_utils.add_server(self.tester)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added server and the 'parent_id.pkl' file
        which is created in setup() function.

        :return: None
        """

        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
