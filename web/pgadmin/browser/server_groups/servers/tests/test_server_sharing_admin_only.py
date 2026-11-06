##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Only an administrator may share a server through the API, as through
the server dialog and the servers.json import."""

import json
import config
from pgadmin.model import db, Role, Server, User
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


def _server_count(app):
    with app.app_context():
        return Server.query.count()


def _grant_user_role(test_case, email):
    """Give the test user the stock 'User' role, as a newly created user
    would have, so that it may register servers; the test user is created
    without any role."""
    app = test_case.app
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        role = Role.query.filter_by(name='User').first()
        if role in user.roles:
            return
        user.roles.append(role)
        db.session.commit()

    def revoke():
        with app.app_context():
            user = User.query.filter_by(email=email).first()
            role = Role.query.filter_by(name='User').first()
            if role in user.roles:
                user.roles.remove(role)
                db.session.commit()

    test_case.addCleanup(revoke)


def _server_row(app, sid):
    """The fields of the server row these tests check."""
    with app.app_context():
        row = Server.query.filter_by(id=sid).first()
        return dict(shared=bool(row.shared),
                    shared_username=row.shared_username,
                    comment=row.comment)


class NonAdminServerSharingTestCase(BaseTestGenerator):
    """A non-administrator cannot share a server, by creating or updating
    it, but can still create and edit their own private servers."""

    scenarios = [
        ('Non-admin cannot create a shared server',
         dict(create={'shared': True}, expected_create=403)),
        ('Non-admin can create a server with shared false',
         dict(create={'shared': False}, expected_create=200,
              expected_shared=False)),
        ('Non-admin shared_username is ignored on create',
         dict(create={'shared': False, 'shared_username': 'someone'},
              expected_create=200, expected_shared=False,
              expected_shared_username=None)),
        ('Non-admin cannot share their own server by update',
         dict(create={}, expected_create=200,
              update={'shared': True}, expected_update=403,
              expected_shared=False)),
        ('Non-admin can edit their own server with an unchanged shared',
         dict(create={}, expected_create=200,
              update={'shared': False, 'comment': 'edited'},
              expected_update=200, expected_shared=False,
              expected_comment='edited')),
        ('Non-admin can edit their own server without shared',
         dict(create={}, expected_create=200,
              update={'comment': 'edited'},
              expected_update=200, expected_shared=False,
              expected_comment='edited')),
        ('Non-admin shared_username is ignored on update',
         dict(create={}, expected_create=200,
              update={'shared_username': 'someone', 'comment': 'edited'},
              expected_update=200, expected_shared=False,
              expected_shared_username=None, expected_comment='edited')),
    ]

    update = None
    expected_update = None
    expected_shared = None
    expected_shared_username = 'unchecked'
    expected_comment = None

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest('Sharing only applies to server mode.')
        restore_server_fixture_on_cleanup(self)

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        _grant_user_role(self, test_user_details['login_username'])
        server = dict(self.server)
        server.pop('shared', None)
        server.pop('shared_username', None)
        server.update(self.create)

        servers_before = _server_count(self.app)
        response = self.tester.post(
            '/browser/server/obj/{0}/'.format(utils.SERVER_GROUP),
            data=json.dumps(server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, self.expected_create,
                         response.data)
        if self.expected_create != 200:
            self.assertEqual(_server_count(self.app), servers_before)
            return

        self.server_id = json.loads(
            response.data.decode('utf-8'))['node']['_id']
        try:
            if self.update is not None:
                data = dict(self.update, id=self.server_id)
                response = self.tester.put(
                    '/browser/server/obj/{0}/{1}'.format(
                        utils.SERVER_GROUP, self.server_id),
                    data=json.dumps(data),
                    content_type='html/json'
                )
                self.assertEqual(response.status_code,
                                 self.expected_update, response.data)

            row = _server_row(self.app, self.server_id)
            self.assertEqual(row['shared'], self.expected_shared)
            if self.expected_shared_username != 'unchecked':
                self.assertEqual(row['shared_username'],
                                 self.expected_shared_username)
            if self.expected_comment is not None:
                self.assertEqual(row['comment'], self.expected_comment)
        finally:
            utils.delete_server_with_api(self.tester, self.server_id)
            self.server_id = None


class AdminServerSharingTestCase(BaseTestGenerator):
    """An administrator can still share a server, and name its user."""

    scenarios = [
        ('Admin can create a shared server', dict()),
    ]

    def setUp(self):
        self.server_id = None
        if not config.SERVER_MODE:
            self.skipTest('Sharing only applies to server mode.')
        restore_server_fixture_on_cleanup(self)

    def runTest(self):
        server = dict(self.server, shared=True, shared_username='someone')
        response = self.tester.post(
            '/browser/server/obj/{0}/'.format(utils.SERVER_GROUP),
            data=json.dumps(server),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.server_id = json.loads(
            response.data.decode('utf-8'))['node']['_id']

        row = _server_row(self.app, self.server_id)
        self.assertTrue(row['shared'])
        self.assertEqual(row['shared_username'], 'someone')

    def tearDown(self):
        if self.server_id is not None:
            utils.delete_server_with_api(
                self.__class__.tester, self.server_id)
