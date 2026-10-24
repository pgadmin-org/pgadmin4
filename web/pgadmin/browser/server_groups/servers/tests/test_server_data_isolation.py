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
import sqlite3
import config
from pgadmin.model import db, SharedServer, User
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from .utils import restore_server_fixture_on_cleanup
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
        restore_server_fixture_on_cleanup(self)

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
        restore_server_fixture_on_cleanup(self)

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
        ('Shared server suppresses '
         'post_connection_sql for non-owner',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )
        restore_server_fixture_on_cleanup(self)

        # Create a shared server with sensitive owner-only fields
        self.server['shared'] = True
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

        # The API no longer accepts a free-text command in server mode,
        # so plant one as a row left over from an older release would be.
        conn = sqlite3.connect(config.TEST_SQLITE_PATH)
        try:
            conn.execute(
                'UPDATE server SET passexec_cmd=?, passexec_name=? '
                'WHERE id=?',
                ('/usr/bin/get-secret', 'vault', self.server_id))
            conn.commit()
        finally:
            conn.close()

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        """Non-owner should NOT see post_connection_sql in the
        properties response."""
        if not self.server_id:
            raise Exception("Server not found to test suppression")

        url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))

        # The free-text command is never returned in server mode, and
        # the owner's expiration must not reach a non-owner (they see
        # only their own SharedServer value, None until they set one).
        self.assertNotIn(
            'passexec_cmd', data,
            'passexec_cmd should not be returned in server mode.')
        self.assertIsNone(
            data.get('passexec_expiration'),
            'The owner passexec_expiration should not be exposed to '
            'non-owners.')
        # With no choice of their own the non-owner inherits; they are
        # not told which command the owner uses.
        self.assertEqual(data.get('passexec_name'), '__inherit__')
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
        restore_server_fixture_on_cleanup(self)

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
        restore_server_fixture_on_cleanup(self)

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


class SharedServerNonOwnerConnectionPersistsTestCase(BaseTestGenerator):
    """Verify that a non-owner's connection to a shared server survives
    later requests. The non-owner connects with their own shared
    username, which differs from the owner's, and the cached server
    manager must not be mistaken for a stale one (and released) when it
    is next looked up."""

    scenarios = [
        ('Non-owner connection to shared server stays connected',
         dict(is_positive_test=True)),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )
        restore_server_fixture_on_cleanup(self)

        # The owner's username is never used to connect; only the
        # non-owner's shared username has to be a real role. The
        # fixture dict is shared with every later test, so the real
        # username is restored in tearDown.
        self.server['shared'] = True
        self.server['shared_username'] = self.server['username']
        self.server['username'] = 'pga_test_owner_only_role'
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
        """The non-owner stays connected after connecting."""
        if not self.server_id:
            raise Exception("Server not found to test shared access")

        url = '/browser/server/connect/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.post(
            url,
            data=json.dumps({'password': self.server['db_password']}),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(
            data.get('data', {}).get('connected'),
            'Non-owner should be able to connect to the shared server.'
            ' Got {0}'.format(data))

        response = self.tester.get(url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(
            data.get('data', {}).get('connected'),
            'Non-owner connection to the shared server should still be'
            ' open on the next request. Got {0}'.format(data))

        self.tester.delete(url)

    def tearDown(self):
        if self.server_id is None:
            return
        utils.delete_server_with_api(
            self.__class__.tester, self.server_id)


class SharedServerNonOwnerSavePasswordKeepsOwnerParamsTestCase(
        BaseTestGenerator):
    """Verify that a non-owner connecting to a shared server with
    'save password' ticked does not rewrite the owner's
    connection_params. The non-owner's SharedServer carries its own
    sslcert; the overlay built for the non-owner's server manager must
    not share the owner's connection_params dict, or the commit that
    saves the non-owner's password flushes the overlaid values into the
    owner's row."""

    scenarios = [
        ('Non-owner save_password leaves owner connection_params intact',
         dict(is_positive_test=True)),
    ]

    owner_conn_params = {
        'sslcert': '/home/owner/.ssl/cert.pem',
        'sslkey': '/home/owner/.ssl/key.pem',
        'sslrootcert': '/home/owner/.ssl/ca.pem',
    }

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Data isolation tests only apply to server mode.'
            )
        restore_server_fixture_on_cleanup(self)

        self.server['shared'] = True
        self.server['shared_username'] = self.server['username']
        conn_params = dict(self.server.get('connection_params') or {})
        conn_params.update(self.owner_conn_params)
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

    @staticmethod
    def _conn_param(data, key):
        conn_params = data.get('connection_params', {})
        if isinstance(conn_params, list):
            for item in conn_params:
                if item.get('name') == key:
                    return item.get('value')
            return None
        return conn_params.get(key)

    @create_user_wise_test_client(test_user_details)
    def _connect_as_non_owner(self):
        """Give the non-owner's SharedServer its own sslcert, then
        connect with save_password so the connect endpoint commits."""
        # Fetching the properties creates the non-owner's SharedServer
        # record. The test users carry no pgAdmin role, so they cannot
        # edit it through the API; set the sslcert on the row directly.
        obj_url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(obj_url, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        with self.app.app_context():
            non_owner = User.query.filter_by(
                email=test_user_details['login_username']).first()
            shared_server = SharedServer.query.filter_by(
                user_id=non_owner.id, osid=self.server_id).first()
            self.assertIsNotNone(shared_server)
            shared_server.connection_params = dict(
                shared_server.connection_params or {},
                sslcert='/home/nonowner/cert.pem')
            db.session.commit()

        url = '/browser/server/connect/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.post(
            url,
            data=json.dumps({'password': self.server['db_password'],
                             'save_password': True}),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(
            data.get('data', {}).get('connected'),
            'Non-owner should be able to connect to the shared server.'
            ' Got {0}'.format(data))

        # A second request as the non-owner exercises the cached
        # manager's staleness check and the overlay it is built from.
        response = self.tester.get(url)
        self.assertEqual(response.status_code, 200)
        self.tester.delete(url)

    def runTest(self):
        """The owner's connection_params survive a non-owner's
        connect with save_password."""
        if not self.server_id:
            raise Exception("Server not found to test shared access")

        self._connect_as_non_owner()

        url = '/browser/server/obj/{0}/{1}'.format(
            utils.SERVER_GROUP, self.server_id)
        response = self.tester.get(url, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        for key, value in self.owner_conn_params.items():
            self.assertEqual(
                self._conn_param(data, key), value,
                'Owner connection_params "{0}" should be unchanged after '
                'a non-owner connected with save_password. Got: {1}'
                .format(key, self._conn_param(data, key)))

    def tearDown(self):
        if self.server_id is None:
            return
        utils.delete_server_with_api(
            self.__class__.tester, self.server_id)
