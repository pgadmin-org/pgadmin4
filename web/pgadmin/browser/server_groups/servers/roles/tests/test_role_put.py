##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as roles_utils


class LoginRolePutTestCase(BaseTestGenerator):
    """This class has update role scenario"""
    scenarios = [
        # Fetching default URL for roles node.
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        self.role_name = "role_put_%s" % str(uuid.uuid4())[1:8]
        self.role_id = roles_utils.create_role(self.server, self.role_name)
        role_dict = {"server_id": self.server_id, "role_id": self.role_id,
                     "role_name": self.role_name}
        utils.write_node_info("lrid", role_dict)

    def runTest(self):
        """This function tests the update role data scenario"""
        role_response = roles_utils.verify_role(self.server, self.role_name)
        if len(role_response) == 0:
            raise Exception("No roles(s) to update!!!")
        data = {
            "description": "This is the test description for cast",
            "lrid": self.role_id
        }
        put_response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.role_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(put_response.status_code, 200)

    def tearDown(self):
        """This function delete the role from added server"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        roles_utils.delete_role(connection, self.role_name)
