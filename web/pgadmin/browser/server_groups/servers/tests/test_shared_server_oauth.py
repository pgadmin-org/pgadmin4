##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Shared-server users must opt in to using their own OAuth login token."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from pgadmin.browser.server_groups import servers as servers_module
from pgadmin.utils.route import BaseTestGenerator


class SharedServerOAuthConsentTest(BaseTestGenerator):
    scenarios = [
        ('New shared user does not inherit ' + mode, {
            'operation': 'create',
            'owner_mode': mode,
            'user_mode': None,
        })
        for mode in ('direct', 'exchange')
    ] + [
        ('Owner {0}, shared user {1}'.format(owner_mode, user_mode), {
            'operation': 'merge',
            'owner_mode': owner_mode,
            'user_mode': user_mode,
        })
        for owner_mode, user_mode in (
            ('direct', None),
            ('exchange', None),
            ('direct', 'disabled'),
            ('exchange', 'disabled'),
            ('disabled', 'direct'),
            ('disabled', 'exchange'),
            ('direct', 'exchange'),
            ('exchange', 'direct'),
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
            connection_params={
                'oauth_pgadmin_token_mode': self.owner_mode,
                'oauth_client_id': 'postgres-cluster',
                'oauth_issuer': 'https://identity.example.test',
                'sslmode': 'verify-full',
            },
        )
        owner_params = owner.connection_params
        owner_snapshot = dict(owner_params)

        if self.operation == 'create':
            shared = self._create_shared_server(owner)
            self.assertNotIn(
                'oauth_pgadmin_token_mode', shared.connection_params,
            )
        else:
            shared = servers_module.SharedServer(
                osid=owner.id,
                user_id=2,
                connection_params=(
                    {'oauth_pgadmin_token_mode': self.user_mode}
                    if self.user_mode is not None else {}
                ),
            )

        shared_snapshot = dict(shared.connection_params)
        result = servers_module.ServerModule.get_shared_server_properties(
            owner, shared,
        )

        expected = dict(owner_snapshot)
        if self.user_mode is None:
            expected.pop('oauth_pgadmin_token_mode')
        else:
            expected['oauth_pgadmin_token_mode'] = self.user_mode

        self.assertEqual(result.connection_params, expected)
        self.assertEqual(
            result.connection_params.get('oauth_pgadmin_token_mode',
                                         'disabled'),
            self.user_mode if self.user_mode is not None else 'disabled',
        )

        # The merge works on a copy, never on either user's stored dict.
        self.assertIsNot(result.connection_params, owner_params)
        self.assertIsNot(result.connection_params, shared.connection_params)
        self.assertEqual(owner_params, owner_snapshot)
        self.assertEqual(shared.connection_params, shared_snapshot)
