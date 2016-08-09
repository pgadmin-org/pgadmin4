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


class LoginRoleDeleteTestCase(BaseTestGenerator):
    """This class has delete role scenario"""

    scenarios = [
        # Fetching default URL for roles node.
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function used to add the sever and roles

        :return: None
        """

        # Add the server
        server_utils.add_server(cls.tester)

        # Connect to server
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the roles!!!")

        # Add the role
        roles_utils.add_role(cls.tester, cls.server_connect_response,
                             cls.server_group, cls.server_ids)

    def runTest(self):
        """This function tests the delete role scenario"""

        roles_utils.delete_role(self.tester)

    @classmethod
    def tearDownClass(self):
        """This function deletes the role,server and parent id file"""

        server_utils.delete_server(self.tester)
        utils.delete_parent_id_file()

