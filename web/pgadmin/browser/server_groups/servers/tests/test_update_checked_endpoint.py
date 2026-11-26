##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A non-owner of a shared server opts in to a token method for the
endpoint their server dialog showed: the dialog sends back the endpoint
hash the properties gave it, and an opt-in without it, or with one of an
endpoint the owner changed since, is refused."""

import inspect
import json
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import Flask
from flask_babel import Babel

from pgadmin.browser.server_groups import servers as servers_module
from pgadmin.utils.route import BaseTestGenerator

ServerNode = servers_module.ServerNode
SHOWN = ('db.example.com', 5432, {'sslmode': 'verify-full'})


class UpdateCheckedEndpointTest(BaseTestGenerator):
    scenarios = [
        ('Token opt-in for the endpoint shown', dict(
            auth_method='oauth_direct',
            checked=ServerNode.endpoint_hash(SHOWN), refused=False)),
        ('Token opt-in without the endpoint shown', dict(
            auth_method='oauth_direct', checked=None, refused=True)),
        ('Token opt-in for an endpoint the owner changed', dict(
            auth_method='oauth_direct',
            checked=ServerNode.endpoint_hash(
                ('old.example.com', 5432, {'sslmode': 'verify-full'})),
            refused=True)),
        ('Back to password needs no endpoint', dict(
            auth_method='password', checked=None, refused=False)),
    ]

    def setUp(self):
        # No database is needed.
        unittest.TestCase.setUp(self)
        self.app = Flask(__name__)
        self.app.config.update(SECRET_KEY='unit-test', TESTING=True)
        Babel(self.app)

    def runTest(self):
        server = SimpleNamespace(
            id=1, user_id=100, shared=True, servergroup_id=1,
            name='Shared', host=SHOWN[0], port=SHOWN[1], role=None,
            username='owner', save_password=0, comment=None, tags=None,
            auth_method='password', kerberos_conn=False,
            connection_params=dict(SHOWN[2]))
        shared_server = SimpleNamespace(
            auth_method='password', kerberos_conn=False, tags=None,
            connection_params={})

        manager = MagicMock()
        manager.connection.return_value.connected.return_value = False
        driver = MagicMock()
        driver.connection_manager.return_value = manager

        user = MagicMock(id=200)
        user.has_role.return_value = True
        update = inspect.unwrap(ServerNode.update)
        view = ServerNode.__new__(ServerNode)
        view.blueprint = MagicMock()

        data = {'auth_method': self.auth_method}
        if self.checked is not None:
            data['checked_endpoint'] = self.checked

        with self.app.test_request_context(
                '/', method='PUT', data=json.dumps(data),
                content_type='application/json'), \
                patch.object(servers_module, 'current_user', user), \
                patch.object(servers_module.config, 'SERVER_MODE', True), \
                patch.object(servers_module, 'get_server',
                             return_value=server), \
                patch.object(servers_module.ServerModule,
                             'get_shared_server',
                             return_value=shared_server), \
                patch.object(servers_module, 'get_driver',
                             return_value=driver), \
                patch.object(servers_module, 'get_crypt_key',
                             return_value=(True, 'key')), \
                patch.object(servers_module, 'check_auth_method',
                             return_value=None), \
                patch.object(servers_module, 'check_entra_available',
                             return_value=None), \
                patch.object(servers_module, 'check_token_ssl',
                             return_value=None), \
                patch.object(ServerNode, '_owner_endpoint_unchanged',
                             return_value=True), \
                patch.object(servers_module, 'db') as db, \
                patch.object(servers_module, 'server_icon_and_background'), \
                patch.object(servers_module, 'jsonify') as jsonify:
            response = update(view, 1, 1)

        if self.refused:
            self.assertEqual(response.status_code, 409)
            self.assertIn(b'Reload', response.data)
            db.session.commit.assert_not_called()
            self.assertEqual(shared_server.auth_method, 'password')
        else:
            jsonify.assert_called_once()
            db.session.commit.assert_called_once_with()
            self.assertEqual(shared_server.auth_method, self.auth_method)
