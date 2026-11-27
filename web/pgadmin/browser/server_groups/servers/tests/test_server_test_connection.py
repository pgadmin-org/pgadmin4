##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The server dialog's Test Connection connects with the details entered,
without saving them, and reports whether the connection succeeded."""

import json

from pgadmin.model import Server, ServerGroup, User
from pgadmin.utils.passexec import server_passexec_details
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

BAD_PASSWORD = 'pga-test-connection-wrong-password'
# No such role exists, so the connection fails whatever the server's
# authentication method, trust included.
MISSING_ROLE = 'pga_test_connection_no_such_role'


class ServerTestConnectionTestCase(BaseTestGenerator):

    scenarios = [
        ('Test connection with the right password succeeds',
         dict(password=None, expected=200)),
        ('Test connection as a role that does not exist fails',
         dict(password=BAD_PASSWORD, username=MISSING_ROLE, expected=401,
              message='Unable to connect to server')),
        # Only meaningful where the server checks passwords: one using trust
        # authentication accepts any password, so the case is skipped there.
        ('Test connection with a bad password fails',
         dict(password=BAD_PASSWORD, expected=401, skip_if_accepted=True,
              message='Unable to connect to server')),
        ('Test connection with an invalid connection parameter is refused',
         dict(password=None, expected=400,
              params=[{'name': 'sslmode=disable host', 'value': 'x'}],
              message='Invalid connection parameter')),
        ('Test connection without a maintenance database is refused',
         dict(password=None, expected=410, db=None, message='(db)')),
    ]

    params = None
    message = None
    username = None
    skip_if_accepted = False
    db = 'unset'

    def _server_count(self):
        with self.app.app_context():
            return Server.query.count()

    def runTest(self):
        data = {
            'gid': utils.SERVER_GROUP,
            'name': 'pga_test_connection_probe',
            'host': self.server['host'],
            'port': self.server['port'],
            'db': self.server['db'] if self.db == 'unset' else self.db,
            'username': self.username or self.server['username'],
            'password': self.password or self.server['db_password'],
            'role': None,
            'service': None,
            'connection_params': self.params or [
                {'name': 'sslmode', 'value': self.server['sslmode']},
                {'name': 'connect_timeout', 'value': 10}],
        }
        before = self._server_count()

        with self.tester.session_transaction() as sess:
            managers_before = dict(
                sess.get('__pgsql_server_managers') or {})

        response = self.tester.post(
            '/browser/server/test_connection/{0}/'.format(utils.SERVER_GROUP),
            data=json.dumps(data), content_type='html/json')

        # The password is never echoed back (an empty one cannot be checked).
        if data['password']:
            self.assertNotIn(data['password'],
                             response.data.decode('utf-8'))

        if self.skip_if_accepted and response.status_code == 200:
            self.skipTest('The server accepted a bad password, so it does '
                          'not use password authentication.')

        self.assertEqual(response.status_code, self.expected, response.data)
        result = json.loads(response.data)

        if self.expected == 200:
            self.assertEqual(result['success'], 1)
            self.assertEqual(result['info'], 'Connection successful.')
            self.assertTrue(result['data']['version'])
        else:
            self.assertIn(self.message, result['errormsg'])

        # Nothing was saved, and no connection manager was kept in the
        # session.
        self.assertEqual(self._server_count(), before)
        with self.tester.session_transaction() as sess:
            self.assertEqual(
                dict(sess.get('__pgsql_server_managers') or {}),
                managers_before)


class UnsavedServerPassexecDetailsTestCase(BaseTestGenerator):
    """A server-mode password exec command run for a connection test is
    given the owner and group the server would be saved with."""

    scenarios = [('Password exec details of an unsaved server', dict())]

    def runTest(self):
        with self.app.app_context():
            group = ServerGroup.query.filter_by(
                id=utils.SERVER_GROUP).first()
            user = User.query.filter_by(id=group.user_id).first()
            server = Server(user_id=user.id, servergroup_id=group.id,
                            name='pga_test_connection_probe')
            self.assertEqual(server_passexec_details(server),
                             (user.username, user.auth_source, group.name))
