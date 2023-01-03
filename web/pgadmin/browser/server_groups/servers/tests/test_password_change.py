##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils
from unittest.mock import patch, MagicMock


class DBPasswordChange(BaseTestGenerator):
    """ This class will test the change password functionality. """

    scenarios = utils.generate_scenarios('change_password',
                                         servers_utils.test_cases)

    def setUp(self):
        self.server_id = utils.create_server(self.server)
        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    @patch('pgadmin.browser.server_groups.servers.render_template')
    @patch('pgadmin.browser.server_groups.servers.pqencryptpassword')
    @patch('pgadmin.browser.server_groups.servers.decrypt')
    @patch('pgadmin.browser.server_groups.servers.get_driver')
    @patch('pgadmin.browser.server_groups.servers.db')
    @patch('pgadmin.browser.server_groups.servers.Server')
    @patch('pgadmin.browser.server_groups.servers.User')
    @patch('pgadmin.browser.server_groups.servers.current_user')
    def runTest(self, current_user_mock, user_mock, server_mock, db_mock,
                get_driver_mock, decrypt_mock, pqencryptpassword_mock,
                render_template_mock):

        current_user_mock.id = 1

        self.manager = MagicMock()
        get_driver_mock.return_value = MagicMock(
            connection_manager=MagicMock(execute_scalar=MagicMock(
                return_value=self.manager.connection),
                return_value=self.manager)
        )
        self.manager.password = self.mock_data['manager']['password']
        self.manager.server_type = self.mock_data['manager']['server_type']
        self.manager.sversion = self.mock_data['manager']['sversion']
        self.manager.connection().execute_scalar.return_value = \
            eval(self.mock_data['manager']
                 ['connection_execute_scalar_return_value'])

        decrypt_mock.return_value = self.manager.password
        pqencryptpassword_mock.return_value = self.manager.password

        class TestMockServer():
            def __init__(self, name, sid, password, passfile):
                self.name = name
                self.sid = sid
                self.password = password
                self.passfile = passfile

        class TestUser():
            def __init__(self, id, username, password):
                self.id = id
                self.username = username
                self.password = password

        db_mock.session.commit = MagicMock(return_value=True)

        mock_server_obj = TestMockServer(
            self.mock_data['server_info']['username'],
            self.mock_data['server_info']['sid'],
            self.mock_data['server_info']['password'],
            self.mock_data['server_info']['passfile']
        )
        server_mock_result = server_mock.query.filter_by.return_value
        server_mock_result.first.return_value = mock_server_obj

        mock_user_obj = TestUser(self.mock_data['user_info']['id'],
                                 self.mock_data['user_info']['username'],
                                 self.mock_data['user_info']['password'])

        user_mock_result = user_mock.query.filter_by.return_value
        user_mock_result.first.return_value = mock_user_obj

        """This function will execute the connect server APIs"""
        response = self.tester.post(
            self.url + str(1) + '/' + str(mock_server_obj.sid),
            data=json.dumps(self.test_data['form_data']),
            follow_redirects=True
        )

        self.assertEqual(response.status_code,
                         self.expected_data['status_code'])

        self.assertEqual(render_template_mock.called, True)
        self.assertEqual(self.manager.update_session.called,
                         self.expected_data['update_session'])
        self.assertEqual(
            self.manager.connection().pq_encrypt_password_conn.called, True)
