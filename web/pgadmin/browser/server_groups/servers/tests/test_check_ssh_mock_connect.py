##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
from unittest.mock import patch, MagicMock
import json
from psycopg import OperationalError
from pgadmin.utils.constants import TWO_PARAM_STRING
from contextlib import ExitStack
from types import SimpleNamespace

import pgadmin.browser.server_groups.servers as servers_module


class ServersSSHConnectTestCase(BaseTestGenerator):
    """
    This class will try to mock connect server with ssh credentials.
    """

    scenarios = utils.generate_scenarios('connect_ssh_mock',
                                         servers_utils.test_cases)

    def setUp(self):
        servers_utils.restore_server_fixture_on_cleanup(self)

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

            url = self.url + TWO_PARAM_STRING.format(utils.SERVER_GROUP, 1)

            class TestMockServer():
                def __init__(self, name, id, username, use_ssh_tunnel,
                             tunnel_host, tunnel_port,
                             tunnel_username, tunnel_authentication,
                             tunnel_identity_file, tunnel_password,
                             tunnel_keep_alive, service):
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
                    self.tunnel_keep_alive = tunnel_keep_alive
                    self.service = service
                    self.save_password = 0
                    self.shared = None
                    self.tunnel_prompt_password = 0

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
                self.mock_data['tunnel_keep_alive'],
                self.mock_data['service'],
            )

            server_mock_result = server_mock.query.filter_by.return_value
            server_mock_result.first.return_value = mock_server_obj

            if self.mock_data['tunnel_password'] == '':
                self.server.pop('tunnel_password', None)

            response = self.connect_to_server(url, self.server)

            self.assertIn(response.status_code, [401, 428])


class ServersOAuthSSHConnectTestCase(BaseTestGenerator):
    """Test database OAuth errors independently of SSH password prompts."""

    scenarios = [
        (
            name,
            dict(parameters),
        )
        for name, parameters in ServersSSHConnectTestCase.scenarios
    ]

    def setUp(self):
        servers_utils.restore_server_fixture_on_cleanup(self)

    def _check_failure_response(
            self, mode, needs_tunnel_password, raises_exception):
        error_message = 'Test connection failure.'
        connection_params = {
            'oauth_pgadmin_token_mode': mode,
            'oauth_client_id': 'postgres-cluster',
            'oauth_issuer': 'https://identity.example.test',
            'oauth_scope': 'openid',
        }

        server = SimpleNamespace(
            id=1,
            name='OAuth SSH test server',
            username='database-user',
            user_id=1,
            shared=None,
            service=None,
            password=None,
            save_password=False,
            kerberos_conn=False,
            connection_params=connection_params,
            use_ssh_tunnel=1 if needs_tunnel_password else 0,
            tunnel_host='127.0.0.1',
            tunnel_port=22,
            tunnel_username='ssh-user',
            tunnel_authentication=0,
            tunnel_identity_file=None,
            tunnel_password=(
                'test-encrypted-tunnel-password'
                if needs_tunnel_password else None
            ),
            tunnel_keep_alive=0,
            tunnel_prompt_password=0,
        )

        manager = MagicMock()
        manager.password = None
        manager.server_type = 'pg'
        manager.sversion = 180000
        manager.connection_params = dict(connection_params)
        manager.tunnel_created = False

        connection = manager.connection.return_value
        connection.connected.return_value = False

        if raises_exception:
            connection.connect.side_effect = OperationalError(
                error_message,
            )
        else:
            connection.connect.return_value = (
                False,
                error_message,
            )

        payload = dict(self.server)
        payload.pop('tunnel_password', None)

        # Include the field to bypass the initial database-password
        # prompt. None also avoids encrypting a dummy password.
        payload['password'] = None
        payload['save_password'] = False

        url = self.url + TWO_PARAM_STRING.format(
            utils.SERVER_GROUP,
            server.id,
        )

        with ExitStack() as stack:
            get_server = stack.enter_context(
                patch.object(
                    servers_module,
                    'get_server',
                    return_value=server,
                )
            )

            # These tests exercise an owned server.
            stack.enter_context(
                patch.object(
                    servers_module,
                    '_is_non_owner',
                    return_value=False,
                )
            )

            # Isolate the failure-response logic from the rules that
            # determine whether SSH credentials can be requested.
            stack.enter_context(
                patch.object(
                    servers_module.ServerNode,
                    'is_prompt_tunnel_password',
                    return_value=needs_tunnel_password,
                )
            )

            get_driver = stack.enter_context(
                patch.object(servers_module, 'get_driver')
            )
            get_driver.return_value.connection_manager.return_value = manager

            stack.enter_context(
                patch.object(
                    servers_module,
                    'get_crypt_key',
                    return_value=(True, 'test-crypt-key'),
                )
            )

            password_response = stack.enter_context(
                patch.object(
                    servers_module.ServerNode,
                    'get_response_for_password',
                    autospec=True,
                    return_value=({'test_password_prompt': True}, 401),
                )
            )

            response = self.tester.post(
                url,
                data=json.dumps(payload),
                content_type='html/json',
            )

        get_server.assert_called_once_with(server.id)
        connection.connect.assert_called_once()

        use_pgadmin_oauth = mode in ('direct', 'exchange')

        if use_pgadmin_oauth and not needs_tunnel_password:
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.get_json()['errormsg'],
                error_message,
            )
            password_response.assert_not_called()
        else:
            self.assertEqual(response.status_code, 401)
            password_response.assert_called_once()

            # The trailing arguments are the same whether the helper
            # is an instance method or a static method.
            arguments = password_response.call_args.args
            self.assertIs(arguments[-5], server)
            self.assertEqual(
                arguments[-4:],
                (
                    401,
                    not use_pgadmin_oauth,
                    needs_tunnel_password,
                    error_message,
                ),
            )

    def runTest(self):
        for mode in ('disabled', 'direct', 'exchange'):
            for needs_tunnel_password in (False, True):
                for raises_exception in (False, True):
                    with self.subTest(
                            mode=mode,
                            needs_tunnel_password=needs_tunnel_password,
                            raises_exception=raises_exception):
                        self._check_failure_response(
                            mode,
                            needs_tunnel_password,
                            raises_exception,
                        )
