# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression import test_server_dict
from . import utils as roles_utils


class LoginRoleDeleteTestCase(BaseTestGenerator):
    """This class has delete role scenario"""
    scenarios = [
        # Fetching default URL for roles node.
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        self.role_name = "role_delete_%s" % str(uuid.uuid4())[1:6]
        self.role_id = roles_utils.create_role(self.server, self.role_name)

    def runTest(self):
        """This function test the delete role scenario"""
        server_id = test_server_dict["server"][0]["server_id"]
        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(server_id) + '/' + str(self.role_id),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function delete the role from added server"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        roles_utils.delete_role(connection, self.role_name)

