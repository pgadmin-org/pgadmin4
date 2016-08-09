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


class ServersGetTestCase(BaseTestGenerator):
    """
    This class will fetch added servers under default server group
    by response code.
    """

    scenarios = [
        # Fetch the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function is used to add the server

        :return: None
        """

        server_utils.add_server(cls.tester)

    def runTest(self):
        """ This function will fetch the added servers to object browser. """

        server_utils.get_server(self.tester)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added server and the 'parent_id.pkl' file
        which is created in setup() function.

        :return: None
        """

        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
