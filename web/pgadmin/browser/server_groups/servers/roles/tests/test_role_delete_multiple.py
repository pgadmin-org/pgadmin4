##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as roles_utils


class LoginRoleDeleteTestCase(BaseTestGenerator):
    """This class has delete role scenario"""
    scenarios = [
        # Fetching default URL for roles node.
        ('Delete Multiple Roles', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        self.role_names = [
            "role_delete_%s" % str(uuid.uuid4())[1:8],
            "role_delete_%s" % str(uuid.uuid4())[1:8]
        ]
        self.role_ids = [
            roles_utils.create_role(self.server, self.role_names[0]),
            roles_utils.create_role(self.server, self.role_names[1])
        ]

    def runTest(self):
        """This function test the delete role scenario"""
        data = {'ids': self.role_ids}
        response = self.tester.delete(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/',
            data=json.dumps(data),
            content_type='html/json',
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
        roles_utils.delete_role(connection, self.role_names)
