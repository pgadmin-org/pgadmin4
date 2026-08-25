##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression: adhoc connect must not persist cross-tenant server rows.

/misc/workspace/adhoc_connect_server clones an existing server when a
'sid' is supplied. Server.clone() copies every column of the source row,
including user_id/shared/shared_username. When a non-owner triggers an
adhoc connect against an administrator-owned *shared* server, the clone
must be re-homed to the current user and made private; otherwise pgAdmin
persists a new, administrator-owned (user_id of the admin), shared adhoc
server row created at the behest of another user, a cross-tenant
integrity problem.

This test creates a shared server as the admin, then, as a non-admin
user, calls adhoc_connect_server with that server's id and asserts that
every resulting adhoc server row belongs to the non-admin user and is not
shared.

Skipped in DESKTOP mode (single user; no cross-tenant boundary).
"""

import json

import config

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']


class AdhocConnectServerOwnershipTestCase(BaseTestGenerator):
    """A non-owner adhoc connect against a shared server must not leave a
    persisted server row owned by another (admin) user."""

    scenarios = [
        ('adhoc clone of a shared server is re-homed to the caller',
         dict()),
    ]

    def setUp(self):
        self.shared_sid = None
        if not config.SERVER_MODE:
            self.skipTest(
                'Adhoc ownership isolation only applies to server mode.')

        # Create a shared server as the admin user.
        self.server['shared'] = True
        url = "/browser/server/obj/{0}/".format(utils.SERVER_GROUP)
        response = self.tester.post(
            url, data=json.dumps(self.server), content_type='html/json')
        self.assertEqual(response.status_code, 200)
        self.shared_sid = json.loads(
            response.data.decode('utf-8'))['node']['_id']

    def _user_id(self, email):
        from pgadmin.model import User
        with self.app.app_context():
            user = User.query.filter_by(username=email).first()
            return user.id if user else None

    def _adhoc_servers(self):
        from pgadmin.model import Server
        with self.app.app_context():
            return [
                dict(id=s.id, user_id=s.user_id, shared=bool(s.shared))
                for s in Server.query.filter_by(is_adhoc=1).all()
            ]

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        if not self.shared_sid:
            raise Exception('Shared server was not created.')

        admin_email = \
            config_data['pgAdmin4_login_credentials']['login_username']
        non_admin_email = test_user_details['login_username']
        admin_id = self._user_id(admin_email)
        non_admin_id = self._user_id(non_admin_email)
        self.assertIsNotNone(non_admin_id)

        # As the non-admin, trigger an adhoc connect that clones the
        # admin-owned shared server. The connection attempt itself may
        # fail; what matters is the persisted row.
        data = dict(
            server_name='adhoc_isolation_probe',
            did=self.server.get('did', 1),
            sid=self.shared_sid,
            host=self.server['host'],
            port=self.server['port'],
            user=self.server['username'],
        )
        self.tester.post(
            '/misc/workspace/adhoc_connect_server',
            data=json.dumps(data), content_type='application/json')

        adhoc = self._adhoc_servers()
        self.assertGreaterEqual(
            len(adhoc), 1,
            'Expected an adhoc server row to have been persisted.')
        for row in adhoc:
            self.assertNotEqual(
                row['user_id'], admin_id,
                'Adhoc server row {0} is owned by the administrator '
                '(user_id={1}); a non-owner created a cross-tenant '
                'server record.'.format(row['id'], row['user_id']))
            self.assertEqual(
                row['user_id'], non_admin_id,
                'Adhoc server row {0} should be owned by the calling '
                'user (id={1}), got user_id={2}.'.format(
                    row['id'], non_admin_id, row['user_id']))
            self.assertFalse(
                row['shared'],
                'Adhoc server row {0} must not be shared.'.format(
                    row['id']))

    def tearDown(self):
        # Remove any adhoc rows left behind, then the shared server.
        from pgadmin.model import db, Server
        with self.app.app_context():
            for s in Server.query.filter_by(is_adhoc=1).all():
                db.session.delete(s)
            db.session.commit()
        if self.shared_sid:
            utils.delete_server_with_api(
                self.__class__.tester, self.shared_sid)
