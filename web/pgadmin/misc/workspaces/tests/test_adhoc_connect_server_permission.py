##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression: adhoc connect must honour the 'Manage Server' permission.

The Query Tool / PSQL workspace welcome page lets a user connect to a
server by typing its host details. That route
(/misc/workspace/adhoc_connect_server) creates a server record, so for a
user who has been denied 'Manage Server' (object_register_server) it must
not allow connecting to a host that is not already registered. Connecting
to an existing server (a 'sid' is supplied and only the database/user/role
change) remains allowed and is covered by
test_adhoc_connect_server_ownership.py.

The tests log in as a user with no roles (hence no permissions) and cover:

  * a new host with no 'sid': refused (403), no adhoc row persisted;
  * a clone of an existing server whose connection_params carry host,
    hostaddr, port or service, which would otherwise override the source
    server's destination when the connection string is built: refused
    (403), no adhoc row persisted;
  * the routing parameters stored on the source server: kept on the clone
    when the request omits or repeats them, and a change is refused;
  * an adhoc row left over from before the permission was revoked is not
    reused by the exact-match lookup, while a registered server still is;
  * _routing_preserved_params(), directly.

Each test works only on the rows it creates, identified by a name of its
own, so it neither sees nor removes adhoc rows of other tests.

Skipped in DESKTOP mode, where every request is the all-permissions
DESKTOP_USER.
"""

import json

import config

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.tests.utils import \
    restore_server_fixture_on_cleanup
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']


class AdhocConnectServerPermissionTestCase(BaseTestGenerator):
    """A user without object_register_server cannot ad hoc connect to a
    host that is not already registered."""

    scenarios = [
        ('adhoc connect to a new host requires Manage Server', dict()),
    ]

    PROBE_NAME = 'adhoc_permission_probe'

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest(
                'Permission checks are only exercisable in SERVER mode.')

    def _adhoc_server_count(self):
        from pgadmin.model import Server
        with self.app.app_context():
            return Server.query.filter_by(
                name=self.PROBE_NAME, is_adhoc=1).count()

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        before = self._adhoc_server_count()

        data = dict(
            server_name=self.PROBE_NAME,
            did=self.server.get('did', 1),
            host=self.server['host'],
            port=self.server['port'],
            user=self.server['username'],
        )
        response = self.tester.post(
            '/misc/workspace/adhoc_connect_server',
            data=json.dumps(data), content_type='application/json')

        self.assertEqual(
            response.status_code, 403,
            'Ad hoc connect to a new host must be refused for a user '
            'without the Manage Server permission, got {0}: {1!r}'.format(
                response.status_code, response.data[:200]))
        self.assertEqual(
            self._adhoc_server_count(), before,
            'No adhoc server row may be persisted when the request is '
            'refused.')

    def tearDown(self):
        from pgadmin.model import db, Server
        with self.app.app_context():
            for s in Server.query.filter_by(name=self.PROBE_NAME,
                                            is_adhoc=1).all():
                db.session.delete(s)
            db.session.commit()


class AdhocConnectServerRedirectTestCase(BaseTestGenerator):
    """Cloning a known server (a 'sid' is supplied) must not be used to
    reach another host through host/hostaddr/port connection parameters
    when the user lacks object_register_server."""

    scenarios = [
        ('host override', dict(params=dict(host='203.0.113.10'))),
        ('hostaddr override', dict(params=dict(hostaddr='203.0.113.10'))),
        ('port override', dict(params=dict(port='6543'))),
        ('service override', dict(params=dict(service='svc_b'))),
    ]

    # A clone keeps the source server's name, so the source is given a name
    # of its own to tell this test's rows from any other.
    PROBE_NAME = 'adhoc_redirect_probe'

    def setUp(self):
        self.shared_sid = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Permission checks are only exercisable in SERVER mode.')

        # Allow the service used by the 'service override' scenario, so that
        # it is the permission check, not the service allow-list, that
        # refuses the request. It is restored by a cleanup registered
        # straight away, which runs even if the rest of setUp fails (the
        # runner skips tearDown then).
        key = 'SERVER_MODE_ALLOWED_SERVICES'
        was_set = key in self.app.config
        original = self.app.config.get(key)

        def restore_allowed_services():
            if was_set:
                self.app.config[key] = original
            else:
                self.app.config.pop(key, None)

        self.addCleanup(restore_allowed_services)
        self.app.config[key] = ['svc_a', 'svc_b']

        restore_server_fixture_on_cleanup(self)

        # A shared server created by the admin is visible to the
        # non-admin user, who may use it as the clone source.
        self.server['shared'] = True
        self.server['name'] = self.PROBE_NAME
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url, data=json.dumps(self.server), content_type='html/json')
        self.assertEqual(response.status_code, 200)
        self.shared_sid = json.loads(
            response.data.decode('utf-8'))['node']['_id']

    def _adhoc_server_count(self):
        from pgadmin.model import Server
        with self.app.app_context():
            return Server.query.filter_by(
                name=self.PROBE_NAME, is_adhoc=1).count()

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        before = self._adhoc_server_count()

        data = dict(
            server_name=self.PROBE_NAME,
            did=self.server.get('did', 1),
            sid=self.shared_sid,
            host=self.server['host'],
            port=self.server['port'],
            user=self.server['username'],
            connection_params=self.params,
        )
        response = self.tester.post(
            '/misc/workspace/adhoc_connect_server',
            data=json.dumps(data), content_type='application/json')

        self.assertEqual(
            response.status_code, 403,
            'Cloning a server with {0} must be refused for a user without '
            'Manage Server, got {1}: {2!r}'.format(
                list(self.params), response.status_code,
                response.data[:200]))
        self.assertEqual(self._adhoc_server_count(), before)

    def tearDown(self):
        from pgadmin.model import db, Server
        with self.app.app_context():
            for s in Server.query.filter_by(name=self.PROBE_NAME,
                                            is_adhoc=1).all():
                db.session.delete(s)
            db.session.commit()
        if self.shared_sid:
            utils.delete_server_with_api(
                self.__class__.tester, self.shared_sid)


class AdhocConnectServerStoredRoutingTestCase(BaseTestGenerator):
    """A clone made without Manage Server keeps the source server's stored
    routing parameters; it neither drops them nor accepts a change."""

    scenarios = [
        ('empty request keeps the stored hostaddr', dict(
            params=None, expect_status=None)),
        ('request repeating the stored hostaddr is accepted', dict(
            params=dict(hostaddr='127.0.0.1'), expect_status=None)),
        ('request changing the stored hostaddr is refused', dict(
            params=dict(hostaddr='127.0.0.2'), expect_status=403)),
    ]

    STORED_HOSTADDR = '127.0.0.1'
    # A clone keeps the source server's name, so the source is given a name
    # of its own to tell this test's rows from any other.
    PROBE_NAME = 'adhoc_stored_routing_probe'

    def setUp(self):
        self.shared_sid = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Permission checks are only exercisable in SERVER mode.')

        restore_server_fixture_on_cleanup(self)

        # A shared source server with a stored routing override.
        self.server['shared'] = True
        self.server['name'] = self.PROBE_NAME
        self.server['connection_params'] = [
            dict(name='hostaddr', value=self.STORED_HOSTADDR)]
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url, data=json.dumps(self.server), content_type='html/json')
        self.assertEqual(response.status_code, 200)
        self.shared_sid = json.loads(
            response.data.decode('utf-8'))['node']['_id']

    def _adhoc_params(self):
        from pgadmin.model import Server
        with self.app.app_context():
            return [s.connection_params or {}
                    for s in Server.query.filter_by(
                        name=self.PROBE_NAME, is_adhoc=1).all()]

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        data = dict(
            server_name=self.PROBE_NAME,
            did=self.server.get('did', 1),
            sid=self.shared_sid,
            host=self.server['host'],
            port=self.server['port'],
            user=self.server['username'],
        )
        if self.params is not None:
            data['connection_params'] = self.params

        response = self.tester.post(
            '/misc/workspace/adhoc_connect_server',
            data=json.dumps(data), content_type='application/json')

        if self.expect_status is not None:
            self.assertEqual(response.status_code, self.expect_status)
            self.assertEqual(self._adhoc_params(), [])
            return

        # Accepted: whether or not the connection itself succeeds, the
        # persisted clone must still carry the source's routing override.
        self.assertNotEqual(response.status_code, 403, response.data[:200])
        rows = self._adhoc_params()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].get('hostaddr'), self.STORED_HOSTADDR)

    def tearDown(self):
        from pgadmin.model import db, Server
        with self.app.app_context():
            for s in Server.query.filter_by(name=self.PROBE_NAME,
                                            is_adhoc=1).all():
                db.session.delete(s)
            db.session.commit()
        if self.shared_sid:
            utils.delete_server_with_api(
                self.__class__.tester, self.shared_sid)


class AdhocConnectServerReuseTestCase(BaseTestGenerator):
    """A user without Manage Server may reuse a server they registered, but
    not an ad hoc row left over from when they had the permission."""

    scenarios = [
        ('stale ad hoc row is not reused', dict(
            is_adhoc=1, expect_refused=True)),
        ('registered server is still reused', dict(
            is_adhoc=0, expect_refused=False)),
    ]

    PROBE_NAME = 'adhoc_reuse_probe'

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest(
                'Permission checks are only exercisable in SERVER mode.')

    def _create_row(self, user_id):
        from pgadmin.model import db, Server
        with self.app.app_context():
            db.session.add(Server(
                user_id=user_id, servergroup_id=utils.SERVER_GROUP,
                name=self.PROBE_NAME, host=self.server['host'],
                port=self.server['port'], maintenance_db='postgres',
                username=self.server['username'], connection_params={},
                is_adhoc=self.is_adhoc))
            db.session.commit()

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        from pgadmin.model import User
        with self.app.app_context():
            user_id = User.query.filter_by(
                username=test_user_details['login_username']).first().id
        # The row belongs to the non-admin user, as one created earlier
        # (while they held the permission) would.
        self._create_row(user_id)

        data = dict(
            server_name=self.PROBE_NAME,
            did=1,
            database_name='postgres',
            host=self.server['host'],
            port=self.server['port'],
            user=self.server['username'],
        )
        response = self.tester.post(
            '/misc/workspace/adhoc_connect_server',
            data=json.dumps(data), content_type='application/json')

        if self.expect_refused:
            self.assertEqual(response.status_code, 403, response.data[:200])
        else:
            self.assertNotEqual(
                response.status_code, 403, response.data[:200])

    def tearDown(self):
        from pgadmin.model import db, Server
        with self.app.app_context():
            for s in Server.query.filter_by(name=self.PROBE_NAME).all():
                db.session.delete(s)
            db.session.commit()


class RoutingPreservedParamsTestCase(BaseTestGenerator):
    """Unit checks for _routing_preserved_params()."""

    scenarios = [
        ('request without routing keys gets the stored ones', dict(
            requested={'sslmode': 'require'},
            stored={'hostaddr': '10.0.0.1', 'port': 6432},
            expected={'sslmode': 'require', 'hostaddr': '10.0.0.1',
                      'port': 6432})),
        ('repeating a stored value is allowed (type-insensitive)', dict(
            requested={'port': '6432'}, stored={'port': 6432},
            expected={'port': 6432})),
        ('changing a stored value is refused', dict(
            requested={'host': 'evil'}, stored={'host': 'good'},
            expected=None)),
        ('setting a value the source does not have is refused', dict(
            requested={'service': 'svc_b'}, stored={},
            expected=None)),
        ('blank values are ignored', dict(
            requested={'host': '', 'hostaddr': None}, stored={},
            expected={})),
        ('non-dict input is tolerated', dict(
            requested=None, stored=None, expected={})),
    ]

    def runTest(self):
        from pgadmin.misc.workspaces import _routing_preserved_params
        self.assertEqual(
            _routing_preserved_params(self.requested, self.stored),
            self.expected)
