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


class LoginRoleGetTestCase(BaseTestGenerator):
    """This class tests the get role scenario"""

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
            raise Exception("No Server(s) connected to get the roles!!!")

        # Add the role
        roles_utils.add_role(cls.tester, cls.server_connect_response,
                             cls.server_group, cls.server_ids)

    def runTest(self):
        """This function test the get role scenario"""

        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        role_ids_dict = all_id["lrid"][0]

        for server_id in server_ids:
            role_id = role_ids_dict[int(server_id)]
            response = self.tester.get(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(server_id) + '/' + str(role_id),
                follow_redirects=True)
            self.assertEquals(response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the role,server and parent id file"""

        roles_utils.delete_role(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
