##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""View/Edit Data connects a non-owner of a shared server with their own
authentication method and password, as the Query Tool does."""

import unittest
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator

import pgadmin.tools.sqleditor as sqleditor
from pgadmin.browser.server_groups.servers import ServerModule


class ViewDataSharedOverlayTestCase(BaseTestGenerator):

    scenarios = [
        ('A non-owner who uses a password is asked for it', dict()),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        owner_row = MagicMock(shared=True, user_id=-1,
                              auth_method='oauth_direct',
                              password='owner-password')
        owner_row.name = 'shared'
        overlay = MagicMock(shared=True, user_id=-1, auth_method='password',
                            password='own-password', username='bob')
        overlay.name = 'shared'
        conn = MagicMock(sign_in_again=False)
        manager = MagicMock()
        manager.connection.return_value = conn
        connect = MagicMock(
            return_value=(False, 'password required', True, 'bob', None,
                          None))

        with patch.object(sqleditor, 'get_server', return_value=owner_row), \
                patch.object(ServerModule, 'get_shared_server',
                             return_value=MagicMock()), \
                patch.object(ServerModule, 'get_shared_server_properties',
                             return_value=overlay), \
                patch.object(sqleditor, 'get_driver') as get_driver, \
                patch.object(sqleditor, '_connect', connect):
            get_driver.return_value.connection_manager.return_value = \
                manager
            response = self.tester.post(
                '/sqleditor/initialize/viewdata/1/3/table/1/1/1/1')

        self.assertEqual(response.status_code, 428)
        self.assertEqual(connect.call_args.kwargs['encpass'],
                         'own-password')


class AutocompleteSignInAgainTestCase(BaseTestGenerator):
    """The Query Tool offers "Sign in again" when its autocomplete
    connection needs a new sign-in, although its first one did not."""

    scenarios = [
        ('Autocomplete connection needs a new sign-in', dict()),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        server = MagicMock(shared=False, auth_method='oauth_direct',
                           password=None, username='alice')
        server.id = 1
        server.name = 'oauth'
        conn = MagicMock(sign_in_again=False)
        conn_ac = MagicMock(sign_in_again=True)
        manager = MagicMock()
        manager.connection.side_effect = [conn, conn_ac]
        connect = MagicMock(side_effect=[
            (True, None, False, 'alice', None, None),
            (False, 'sign in again', False, 'alice', None, None),
        ])

        with self.app.test_request_context(), \
                patch.object(sqleditor, 'get_server', return_value=server), \
                patch.object(sqleditor, 'get_driver') as get_driver, \
                patch.object(sqleditor, 'ObjectRegistry'), \
                patch.object(sqleditor, 'Preferences'), \
                patch.object(sqleditor, '_connect', connect):
            get_driver.return_value.connection_manager.return_value = \
                manager
            error, response, _, _ = sqleditor._init_sqleditor(
                1, True, 1, 1, 1, conn_id='42')

        self.assertTrue(error)
        self.assertEqual(response.status_code, 428)
        self.assertIs(response.get_json()['result']['sign_in_again'], True)
        # No session is stored to release the connected first connection,
        # or the autocomplete one, later, so they are released now.
        first, autocomplete = manager.release.call_args_list
        self.assertEqual(first.kwargs, {'conn_id': '42'})
        self.assertEqual(list(autocomplete.kwargs), ['conn_id'])
        self.assertNotEqual(autocomplete.kwargs['conn_id'], '42')
