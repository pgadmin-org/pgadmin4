##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as roles_utils


class LoginRoleAddTestCase(BaseTestGenerator):
    """This class has add role scenario"""

    scenarios = [
        # Fetching default URL for roles node.
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        pass

    def runTest(self):
        """This function test the add role scenario"""
        server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, server_id)
        if not server_response['data']['connected']:
            raise Exception("Server not found to add the role.")

        data = roles_utils.get_role_data(self.server['db_password'])
        self.role_name = data['rolname']
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' + str(server_id) + '/',
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        role_id = response_data['node']['_id']
        role_dict = {"server_id": server_id, "role_id": role_id,
                     "role_name": self.role_name}
        utils.write_node_info("lrid", role_dict)

    def tearDown(self):
        """This function delete the role from added server"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        roles_utils.delete_role(connection, self.role_name)
