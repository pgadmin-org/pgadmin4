##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A non-owner of a shared server chooses their own server authentication
method; it is never copied from the owner."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from pgadmin.browser.server_groups import servers as servers_module
from pgadmin.utils.route import BaseTestGenerator


METHODS = ('password', 'oauth_direct', 'oauth_exchange')


class SharedServerAuthMethodTest(BaseTestGenerator):
    scenarios = [
        ('New non-owner does not inherit ' + method, {
            'operation': 'create',
            'owner_method': method,
            'user_method': 'password',
        })
        for method in METHODS
    ] + [
        ('Owner {0}, non-owner {1}'.format(owner_method, user_method), {
            'operation': 'merge',
            'owner_method': owner_method,
            'user_method': user_method,
        })
        for owner_method, user_method in (
            ('oauth_direct', 'password'),
            ('oauth_exchange', 'password'),
            ('password', 'oauth_direct'),
            ('password', 'oauth_exchange'),
            ('oauth_direct', 'oauth_exchange'),
            ('oauth_exchange', 'oauth_direct'),
        )
    ]

    def setUp(self):
        # Bypass the PostgreSQL connection setup.
        # Use real, detached model objects and mock only persistence.
        unittest.TestCase.setUp(self)

    def _create_shared_server(self, owner):
        with patch.object(servers_module, 'db') as database, \
                patch.object(servers_module, 'User') as user_model, \
                patch.object(servers_module, 'current_user',
                             SimpleNamespace(id=2)):
            user_model.query.filter_by.return_value.first.return_value = (
                SimpleNamespace(username='server-owner')
            )

            servers_module.ServerModule.create_shared_server(owner, 1)

            database.session.add.assert_called_once()
            database.session.commit.assert_called_once_with()
            shared = database.session.add.call_args.args[0]

        self.assertIsInstance(shared, servers_module.SharedServer)
        self.assertEqual(shared.user_id, 2)
        self.assertEqual(shared.osid, owner.id)
        return shared

    def runTest(self):
        owner = servers_module.Server(
            id=1,
            user_id=1,
            name='OAuth shared server',
            host='database.example.test',
            port=5432,
            maintenance_db='postgres',
            shared=True,
            shared_username='database-user',
            auth_method=self.owner_method,
            connection_params={
                'oauth_client_id': 'postgres-cluster',
                'oauth_issuer': 'https://identity.example.test',
                'sslmode': 'verify-full',
            },
        )
        owner_params = owner.connection_params
        owner_snapshot = dict(owner_params)

        if self.operation == 'create':
            shared = self._create_shared_server(owner)
            self.assertEqual(shared.auth_method, 'password')
        else:
            shared = servers_module.SharedServer(
                osid=owner.id,
                user_id=2,
                auth_method=self.user_method,
                connection_params={},
            )

        result = servers_module.ServerModule.get_shared_server_properties(
            owner, shared,
        )

        # The non-owner always sees their own method, never the owner's.
        self.assertEqual(result.auth_method, self.user_method)

        # The OAuth parameters are ordinary connection parameters and are
        # still shared with the non-owner.
        self.assertEqual(result.connection_params, owner_snapshot)
        self.assertIsNot(result.connection_params, owner_params)
        self.assertEqual(owner_params, owner_snapshot)
