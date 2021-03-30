##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils


class AddServerTest(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = utils.generate_scenarios('add_server',
                                         servers_utils.test_cases)

    def setUp(self):
        pass

    def create_server(self, url):
        return self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )

    def runTest(self):
        """ This function will add the server under default server group."""
        url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)

        # Add service name in the config
        if 'connect_timeout' in self.test_data:
            self.server['connect_timeout'] = self.test_data['connect_timeout']
        elif 'shared' in self.test_data:
            self.server['shared'] = self.test_data['shared']
        elif 'service' in self.test_data:
            self.server['service'] = self.test_data['service']

        if hasattr(self, 'ssh_tunnel'):
            self.server['use_ssh_tunnel'] = self.test_data['use_ssh_tunnel']
            self.server['tunnel_host'] = self.test_data['tunnel_host']
            self.server['tunnel_port'] = self.test_data['tunnel_port']
            self.server['tunnel_username'] = self.test_data['tunnel_username']

            if self.with_password:
                self.server['tunnel_authentication'] = self.test_data[
                    'tunnel_authentication']
            else:
                self.server['tunnel_authentication'] = 1
                self.server['tunnel_identity_file'] = 'pkey_rsa'

            if self.save_password:
                self.server['tunnel_password'] = self.test_data[
                    'tunnel_password']
        if 'connect_now' in self.test_data:
            self.server['connect_now'] = self.test_data['connect_now']
            self.server['password'] = self.server['db_password']

        # SSL properties
        if 'sslcert' in self.test_data:
            self.server['sslcert'] = self.test_data['sslcert']
        if 'sslkey' in self.test_data:
            self.server['sslkey'] = self.test_data['sslkey']
        if 'sslrootcert' in self.test_data:
            self.server['sslrootcert'] = self.test_data['sslrootcert']
        if 'sslmode' in self.test_data:
            self.server['sslmode'] = self.test_data['sslmode']
        if 'sslcompression' in self.test_data:
            self.server['sslcompression'] = self.test_data['sslcompression']

        # Advanced tab properties
        if 'passfile' in self.test_data:
            self.server['passfile'] = self.test_data['passfile']
        if 'hostaddr' in self.test_data:
            self.server['hostaddr'] = self.test_data['hostaddr']

        # Background/Foreground color
        if 'fgcolor' in self.test_data:
            self.server['fgcolor'] = self.test_data['fgcolor']
        if 'bgcolor' in self.test_data:
            self.server['bgcolor'] = self.test_data['bgcolor']

        if self.is_positive_test:
            if hasattr(self, 'with_save'):
                self.server['save_password'] = self.with_save
            if hasattr(self, 'with_pwd') and not self.with_pwd:
                # Remove the password from server object
                db_password = self.server['db_password']
                del self.server['db_password']
            response = self.create_server(url)
        self.assertEquals(response.status_code,
                          self.expected_data["status_code"])
        response_data = json.loads(response.data.decode('utf-8'))
        self.server_id = response_data['node']['_id']

        if hasattr(self, 'with_pwd') and not self.with_pwd:
            # Remove the password from server object
            self.server['db_password'] = db_password

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
