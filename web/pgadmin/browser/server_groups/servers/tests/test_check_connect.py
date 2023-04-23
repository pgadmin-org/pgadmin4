##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
import json
from unittest.mock import patch, MagicMock


class ServersConnectTestCase(BaseTestGenerator):
    """
    This class will fetch added servers under default server group
    by response code.
    """

    scenarios = utils.generate_scenarios('connect_server',
                                         servers_utils.test_cases)

    def get_ssh_tunnel(self):
        print("in_get_ssh")
        self.server.use_ssh_tunnel = 1
        self.server.tunnel_host = '127.0.0.1'
        self.server.tunnel_port = 22
        self.server.tunnel_username = 'user'
        if hasattr(self, 'with_password') and self.with_password:
            self.server.tunnel_authentication = 0
        else:
            self.server.tunnel_authentication = 1
            self.server.tunnel_identity_file = 'pkey_rsa'

        if hasattr(self, 'save_password') and self.save_password:
            self.server.tunnel_password = '123456'

    def setUp(self):
        """This function add the server to test the GET API"""

        self.server_id = utils.create_server(self.server)
        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def get_server_connection(self, server_id):
        return self.tester.get(self.url + str(utils.SERVER_GROUP) + '/' +
                               str(server_id),
                               follow_redirects=True)

    def server_disonnect(self, server_id):
        return self.tester.delete(self.url + str(utils.SERVER_GROUP) + '/' +
                                  str(server_id))

    def connect_to_server(self, url):
        return self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )

    def add_server_details(self, url):
        return self.tester.post(
            url,
            data=str(self.test_data),
            content_type='html/json'
        )

    def runTest(self):
        """ This function will fetch the added servers to object browser. """
        server_id = parent_node_dict["server"][-1]["server_id"]
        if not server_id:
            raise Exception("Server not found to test GET API")
        response = None
        if self.is_positive_test:
            if hasattr(self, 'disconnect'):
                if hasattr(self, 'wrong_server_id'):
                    server_id = 99999
                response = self.server_disonnect(server_id)
            elif hasattr(self, "connect"):
                url = self.url + '{0}/{1}'.format(
                    utils.SERVER_GROUP,
                    self.server_id)
                self.server['password'] = self.server['db_password']

                if self.mocking_required:
                    if hasattr(self, "invalid_user"):
                        with patch(self.mock_data['function_name'],
                                   side_effect=[eval(self.mock_data[
                                       "return_value"])]) as user_mock:

                            user_mock_result = user_mock.query.filter_by.\
                                return_value
                            user_mock_result.first.return_value = None
                            response = self.connect_to_server(url)

                    elif hasattr(self, "invalid_server_username"):
                        with patch(self.mock_data['function_name'],
                                   side_effect=[eval(self.mock_data[
                                       "return_value"])]) as server_mock:

                            class TestMockServer():
                                def __init__(self, name, id, username, shared,
                                             service):
                                    self.name = name
                                    self.id = id
                                    self.username = username
                                    self.shared = shared
                                    self.service = service
                                    self.user_id = id

                            mock_server_obj = TestMockServer(
                                self.mock_data['name'],
                                self.mock_data['id'],
                                eval(self.mock_data['username']),
                                self.mock_data['shared'],
                                self.mock_data['service']
                            )

                            server_mock_result = server_mock.query.filter_by.\
                                return_value
                            server_mock_result.first.return_value = \
                                mock_server_obj

                            response = self.connect_to_server(url)
                else:
                    response = self.connect_to_server(url)
            elif hasattr(self, 'restore_point') or hasattr(self,
                                                           'change_password'):
                connect_url = '/browser/server/connect/{0}/{1}'.format(
                    utils.SERVER_GROUP,
                    self.server_id)
                url = self.url + '{0}/{1}'.format(
                    utils.SERVER_GROUP,
                    self.server_id)

                self.connect_to_server(connect_url)
                response = self.add_server_details(url)
            elif hasattr(self, "recovery_state") and self.recovery_state:
                with patch('pgadmin.browser.server_groups.'
                           'servers.get_driver') as get_driver_mock:

                    self.manager = MagicMock()
                    get_driver_mock.return_value = MagicMock(
                        connection_manager=MagicMock(
                            execute_dict=MagicMock(
                                return_value=self.manager.connection),
                            return_value=self.manager)
                    )
                    self.manager.version = 10

                    connection_mock_result = \
                        self.manager.connection.return_value
                    self.manager.connection.connected.side_effect = True

                    connection_mock_result.execute_dict.side_effect = \
                        [eval(self.mock_data["return_value"])]

                    response = self.get_server_connection(server_id)
                    self.assertEqual(response.status_code,
                                     self.expected_data["status_code"])
            else:
                response = self.get_server_connection(server_id)

        self.assertEqual(response.status_code,
                         self.expected_data["status_code"])

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
