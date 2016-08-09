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
from . import utils as roles_utils


class LoginRoleAddTestCase(BaseTestGenerator):
    """This class has add role scenario"""

    scenarios = [
        # Fetching default URL for roles node.
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function used to add the sever

        :return: None
        """

        # Add the server
        server_utils.add_server(cls.tester)

        # Connect to server
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the roles!!!")

    def runTest(self):
        """This function test the add role scenario"""

        roles_utils.add_role(self.tester, self.server_connect_response,
                             self.server_group, self.server_ids)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the role,server and parent id file"""

        roles_utils.delete_role(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()

