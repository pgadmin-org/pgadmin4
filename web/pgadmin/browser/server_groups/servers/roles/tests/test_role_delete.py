##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as roles_utils


class LoginRoleDeleteTestCase(BaseTestGenerator):
    """This class has delete role scenario"""
    scenarios = [
        # Fetching default URL for roles node.
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        self.role_name = "role_delete_%s" % str(uuid.uuid4())[1:8]
        self.role_id = roles_utils.create_role(self.server, self.role_name)
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        role_dict = {"server_id": self.server_id, "role_id": self.role_id,
                     "role_name": self.role_name}
        utils.write_node_info("lrid", role_dict)

    def runTest(self):
        """This function test the delete role scenario"""
        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.role_id),
            follow_redirects=True)
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function delete the role from added server"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        roles_utils.delete_role(connection, self.role_name)
