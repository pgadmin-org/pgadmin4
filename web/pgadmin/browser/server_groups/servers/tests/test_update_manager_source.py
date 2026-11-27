##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""After a server is edited while it is not connected, its manager is
updated from the same source the driver builds it from: the user's
SharedServer overlay for a non-owner of a shared server, so the manager
never takes the owner's server authentication method or connection
parameters, and the server row itself for its owner."""

import inspect
import json
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import Flask
from flask_babel import Babel

from pgadmin.browser.server_groups import servers as servers_module
from pgadmin.utils.route import BaseTestGenerator


class UpdateManagerSourceTest(BaseTestGenerator):
    scenarios = [
        ('Non-owner', dict(user_id=200, owner=False)),
        ('Owner', dict(user_id=100, owner=True)),
    ]

    def setUp(self):
        # No database is needed.
        unittest.TestCase.setUp(self)
        self.app = Flask(__name__)
        self.app.config.update(SECRET_KEY='unit-test', TESTING=True)
        # The endpoint translates its messages.
        Babel(self.app)

    def runTest(self):
        server = SimpleNamespace(
            id=1, user_id=100, shared=True, servergroup_id=1,
            name='Shared', host='db.example.com', port=5432, role=None,
            username='owner', save_password=0, comment=None, tags=None,
            auth_method='entra',
            connection_params={'sslmode': 'verify-full'})
        shared_server = SimpleNamespace(
            auth_method='password', kerberos_conn=False, tags=None,
            connection_params={'sslmode': 'verify-full'})
        overlay = SimpleNamespace(auth_method='password')

        manager = MagicMock()
        manager.connection.return_value.connected.return_value = False
        driver = MagicMock()
        driver.connection_manager.return_value = manager
        driver._manager_source.return_value = overlay

        user = MagicMock(id=self.user_id)
        user.has_role.return_value = True
        update = inspect.unwrap(servers_module.ServerNode.update)
        view = servers_module.ServerNode.__new__(servers_module.ServerNode)
        view.blueprint = MagicMock()

        with self.app.test_request_context(
                '/', method='PUT', data=json.dumps({'comment': 'edited'}),
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
                patch.object(servers_module, 'db'), \
                patch.object(servers_module, 'server_icon_and_background'), \
                patch.object(servers_module, 'jsonify'):
            update(view, 1, 1)

        driver._manager_source.assert_called_once_with(server)
        manager.update.assert_called_once_with(overlay)
