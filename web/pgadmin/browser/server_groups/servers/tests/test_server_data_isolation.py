##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for server data isolation between users in server mode."""

import json
import config
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client

test_user_details = None
if config.SERVER_MODE:
    test_user_details = \
        config_data['pgAdmin4_test_non_admin_credentials']


class ServerDataIsolationGetTestCase(BaseTestGenerator):
    """Verify that a non-admin user cannot access another user's
    private (non-shared) server by ID."""

    scenarios = [
        ('User B gets 410 for User A private server',
         dict(is_positive_test=False)),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )

        # Create a private (non-shared) server as the admin user
        self.server['shared'] = False
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.server_id = response_data['node']['_id']

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """Non-admin user should NOT be able to GET another user's
        private server."""
        if not self.server_id:
            raise Exception("Server not found to test isolation")

        url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(url, follow_redirects=True)
        # Expect 410 Gone (server not accessible to this user)
        self.assertEqual(
            response.status_code, 410,
            'Non-admin user should not access another user\'s '
            'private server. Got status {0}'.format(
                response.status_code)
        )

    def tearDown(self):
        if self.server_id is None:
            return
        # Clean up with the admin tester (which owns the server)
        utils.delete_server_with_api(
            self.__class__.tester, self.server_id)


class SharedServerAccessTestCase(BaseTestGenerator):
    """Verify that a shared server IS accessible by a non-admin
    user (positive test — shared servers should work after the
    isolation fixes)."""

    scenarios = [
        ('User B can access shared server from User A',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )

        # Create a shared server as the admin user
        self.server['shared'] = True
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.server_id = response_data['node']['_id']

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """Non-admin user SHOULD be able to GET a shared server."""
        if not self.server_id:
            raise Exception("Server not found to test shared access")

        url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(
            response.status_code, 200,
            'Non-admin user should be able to access shared server.'
            ' Got status {0}'.format(response.status_code)
        )

    def tearDown(self):
        if self.server_id is None:
            return
        utils.delete_server_with_api(
            self.__class__.tester, self.server_id)


class SharedServerFieldSuppressionTestCase(BaseTestGenerator):
    """Verify that owner-only sensitive fields are suppressed
    when a non-owner accesses a shared server's properties."""

    scenarios = [
        ('Shared server suppresses passexec_cmd and '
         'post_connection_sql for non-owner',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )

        # Create a shared server with sensitive owner-only fields
        self.server['shared'] = True
        self.server['passexec_cmd'] = '/usr/bin/get-secret'
        self.server['passexec_expiration'] = 100
        self.server['post_connection_sql'] = 'SET role admin;'
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.server_id = response_data['node']['_id']

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """Non-owner should NOT see passexec_cmd or
        post_connection_sql in properties response."""
        if not self.server_id:
            raise Exception("Server not found to test suppression")

        url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))

        # passexec_cmd must be None/null for non-owners
        self.assertIsNone(
            data.get('passexec_cmd'),
            'passexec_cmd should be suppressed for non-owners.'
            ' Got: {0}'.format(data.get('passexec_cmd'))
        )
        self.assertIsNone(
            data.get('passexec_expiration'),
            'passexec_expiration should be suppressed for '
            'non-owners.'
        )
        # post_connection_sql must be None/null for non-owners
        self.assertIsNone(
            data.get('post_connection_sql'),
            'post_connection_sql should be suppressed for '
            'non-owners. Got: {0}'.format(
                data.get('post_connection_sql'))
        )

    def tearDown(self):
        if self.server_id is None:
            return
        utils.delete_server_with_api(
            self.__class__.tester, self.server_id)


class SharedServerConnectionParamsIsolationTestCase(
        BaseTestGenerator):
    """Verify that owner's SSL file paths in connection_params
    are not leaked to non-owners of shared servers."""

    scenarios = [
        ('Shared server strips owner SSL paths for non-owner',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )

        # Create shared server with owner SSL paths
        self.server['shared'] = True
        # Set connection_params with owner-specific paths
        conn_params = self.server.get('connection_params', {})
        conn_params['sslcert'] = '/home/owner/.ssl/cert.pem'
        conn_params['sslkey'] = '/home/owner/.ssl/key.pem'
        conn_params['sslrootcert'] = '/home/owner/.ssl/ca.pem'
        self.server['connection_params'] = conn_params
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.server_id = response_data['node']['_id']

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """Non-owner should NOT see owner's SSL file paths
        in connection_params."""
        if not self.server_id:
            raise Exception("Server not found")

        url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))

        conn_params = data.get('connection_params', {})
        # Owner SSL paths should be stripped for non-owners
        # (non-owner has no SharedServer SSL paths configured,
        # so keys should be absent)
        for key in ('sslcert', 'sslkey', 'sslrootcert',
                    'sslcrl', 'sslcrldir'):
            val = None
            if isinstance(conn_params, list):
                for item in conn_params:
                    if item.get('name') == key:
                        val = item.get('value')
                        break
            elif isinstance(conn_params, dict):
                val = conn_params.get(key)
            self.assertIsNone(
                val,
                'Owner SSL path "{0}" should not leak to '
                'non-owner. Got: {1}'.format(key, val)
            )

    def tearDown(self):
        if self.server_id is None:
            return
        utils.delete_server_with_api(
            self.__class__.tester, self.server_id)


class SharedServerRenameDoesNotOrphanTestCase(BaseTestGenerator):
    """Verify that renaming a shared server does not create
    orphan SharedServer records (Issue 20 fix — lookup uses
    osid, not name)."""

    scenarios = [
        ('Rename shared server preserves non-owner access',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )

        # Save admin tester BEFORE the decorator replaces it.
        self.admin_tester = self.tester

        self.server['shared'] = True
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertIn('node', response_data)
        self.server_id = response_data['node']['_id']

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """After owner renames the shared server, non-owner
        should still be able to access it."""
        if not self.server_id:
            raise Exception("Server not found")

        # First access as non-owner to create SharedServer record
        url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(response.status_code, 200)

        # Rename the server as admin (saved in setUp before
        # the decorator replaced self.tester).
        response = self.admin_tester.put(
            '/browser/server/obj/{0}/{1}'.format(
                utils.SERVER_GROUP, self.server_id),
            data=json.dumps(
                {'name': 'renamed_shared_server'}),
            content_type='html/json'
        )
        self.assertIn(
            response.status_code, [200],
            'Admin should be able to rename shared server.'
        )

        # Access again as non-owner — should still work
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(
            response.status_code, 200,
            'Non-owner should still access shared server after '
            'rename. Got status {0}'.format(response.status_code)
        )

    def tearDown(self):
        if self.server_id is None:
            return
        utils.delete_server_with_api(
            self.__class__.tester, self.server_id)
