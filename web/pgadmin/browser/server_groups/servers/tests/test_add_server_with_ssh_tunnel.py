##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils


class ServersWithSSHTunnelAddTestCase(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = [
        (
            'Add server using SSH tunnel with password', dict(
                url='/browser/server/obj/',
                with_password=True,
                save_password=False,
            )
        ),
        (
            'Add server using SSH tunnel with identity file', dict(
                url='/browser/server/obj/',
                with_password=False,
                save_password=False,
            )
        ),
        (
            'Add server using SSH tunnel with password and saved it', dict(
                url='/browser/server/obj/',
                with_password=True,
                save_password=True,
            )
        ),
        (
            'Add server using SSH tunnel with identity file and save the '
            'password', dict(
                url='/browser/server/obj/',
                with_password=False,
                save_password=True,
            )
        ),
    ]

    def setUp(self):
        pass

    def runTest(self):
        """ This function will add the server under default server group."""
        url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)
        # Add service name in the config
        self.server['use_ssh_tunnel'] = 1
        self.server['tunnel_host'] = '127.0.0.1'
        self.server['tunnel_port'] = 22
        self.server['tunnel_username'] = 'user'
        if self.with_password:
            self.server['tunnel_authentication'] = 0
        else:
            self.server['tunnel_authentication'] = 1
            self.server['tunnel_identity_file'] = 'pkey_rsa'

        if self.save_password:
            self.server['tunnel_password'] = '123456'

        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.server_id = response_data['node']['_id']

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
