##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
from unittest.mock import patch, MagicMock
import json
from psycopg2 import OperationalError


class ServersSSHConnectTestCase(BaseTestGenerator):
    """
    This class will try to mock connect server with ssh credentials.
    """

    scenarios = utils.generate_scenarios('connect_ssh_mock',
                                         servers_utils.test_cases)

    def connect_to_server(self, url, server):
        return self.tester.post(
            url,
            data=json.dumps(server),
            content_type='html/json'
        )

    @patch('pgadmin.browser.server_groups.servers.get_driver')
    @patch('pgadmin.browser.server_groups.servers.Server')
    def runTest(self, server_mock, get_driver_mock):

        if self.mock_data is not None and \
                self.mock_data['use_ssh_tunnel'] == 1:

            self.manager = MagicMock()
            get_driver_mock.return_value = MagicMock(
                connection_manager=MagicMock(
                    execute_scalar=MagicMock(
                        return_value=self.manager.connection),
                    return_value=self.manager)
            )
            self.manager.password = self.mock_data['manager']['password']
            self.manager.server_type = self.mock_data['manager']['server_type']
            self.manager.sversion = self.mock_data['manager']['sversion']

            self.manager.connection().connect.side_effect = \
                MagicMock(side_effect=OperationalError())

            url = self.url + '{0}/{1}'.format(utils.SERVER_GROUP, 1)

            class TestMockServer():
                def __init__(self, name, id, username, use_ssh_tunnel,
                             tunnel_host, tunnel_port,
                             tunnel_username, tunnel_authentication,
                             tunnel_identity_file, tunnel_password, service):
                    self.name = name
                    self.id = id
                    self.username = username

                    self.use_ssh_tunnel = use_ssh_tunnel
                    self.tunnel_host = tunnel_host
                    self.tunnel_port = tunnel_port
                    self.tunnel_username = tunnel_username
                    self.tunnel_authentication = \
                        tunnel_authentication
                    self.tunnel_identity_file = \
                        tunnel_identity_file
                    self.tunnel_password = tunnel_password
                    self.service = service
                    self.shared = None

            mock_server_obj = TestMockServer(
                self.mock_data['name'],
                self.mock_data['id'],
                self.mock_data['username'],
                self.mock_data['use_ssh_tunnel'],
                self.mock_data['tunnel_host'],
                self.mock_data['tunnel_port'],
                self.mock_data['tunnel_username'],
                self.mock_data['tunnel_authentication'],
                self.mock_data['tunnel_identity_file'],
                self.mock_data['tunnel_password'],
                self.mock_data['service'],
            )

            server_mock_result = server_mock.query.filter_by.return_value
            server_mock_result.first.return_value = mock_server_obj

            if self.mock_data['tunnel_password'] == '':
                del self.server['tunnel_password']

            response = self.connect_to_server(url, self.server)

            self.assertEqual(response.status_code, 500)
