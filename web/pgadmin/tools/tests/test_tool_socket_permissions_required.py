##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""RBAC regression: Socket.IO tool handlers must enforce the permission.

The HTTP routes of the schema diff, ERD and PSQL tools are guarded by
@permissions_required, but those tools also expose Socket.IO event
handlers (schema_diff 'compare_database'/'compare_schema', erd 'tables',
the psql '/pty' namespace). Those handlers previously carried only
@socket_login_required (or nothing at all), so an authenticated user who
had been denied the tool could still drive them. They now use
@socket_permissions_required, which refuses the connection when the user
lacks the permission.

This test connects to each namespace as a user with no roles (hence no
tool permissions) and asserts that emitting a guarded event causes the
handler to refuse and disconnect the socket, rather than executing.

Skipped in DESKTOP mode, where every request is auto-authenticated as the
all-permissions DESKTOP_USER.
"""

import sys

import config

from flask_socketio import ConnectionRefusedError

from pgadmin.utils.route import BaseTestGenerator
from pgadmin import socketio
from regression.test_setup import config_data
from regression.python_test_utils import test_utils as utils

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']


class ToolSocketPermissionRequiredTestCase(BaseTestGenerator):
    """A guarded Socket.IO handler must refuse a user lacking the tool
    permission instead of running."""

    scenarios = [
        ('schema_diff compare_database requires tools_schema_diff',
         dict(namespace='/schema_diff', event='compare_database',
              params=dict(trans_id=1, source_sid=1, source_did=1,
                          target_sid=1, target_did=1,
                          ignore_owner=0, ignore_whitespaces=0,
                          ignore_tablespace=0, ignore_grants=0))),
        ('schema_diff compare_schema requires tools_schema_diff',
         dict(namespace='/schema_diff', event='compare_schema',
              params=dict(trans_id=1, source_sid=1, source_did=1,
                          source_scid=1, target_sid=1, target_did=1,
                          target_scid=1, ignore_owner=0,
                          ignore_whitespaces=0, ignore_tablespace=0,
                          ignore_grants=0))),
        ('psql start_process requires tools_psql_tool',
         dict(namespace='/pty', event='start_process',
              params=dict(sid=1, did=1))),
        ('psql socket_input requires tools_psql_tool',
         dict(namespace='/pty', event='socket_input',
              params=dict(key_name='a'))),
        ('psql socket_set_role requires tools_psql_tool',
         dict(namespace='/pty', event='socket_set_role',
              params=dict(role='public'))),
        ('psql resize requires tools_psql_tool',
         dict(namespace='/pty', event='resize',
              params=dict(rows=24, cols=80))),
        ('erd tables requires tools_erd_tool',
         dict(namespace='/erd', event='tables',
              params=dict(trans_id=1, sid=1, did=1))),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest(
                'Socket permission decorators are only exercisable in '
                'SERVER mode; DESKTOP mode auto-authenticates as the '
                'all-permissions DESKTOP_USER.'
            )
        if self.namespace == '/pty' and sys.platform == 'win32':
            self.skipTest('PSQL is disabled on Windows.')
        config.ENABLE_PSQL = True

    def runTest(self):
        # Log in a brand-new user that has no roles, therefore no tool
        # permissions, and bind a Socket.IO test client to that session.
        non_admin_client = utils.get_test_user(self, test_user_details)
        self.assertIsNotNone(
            non_admin_client, 'Could not create the non-admin test user.')

        sclient = socketio.test_client(
            self.app, namespace=self.namespace,
            flask_test_client=non_admin_client)

        # The namespace 'connect' handler is not permission-gated, so the
        # connection itself is allowed; the guard is on the event handler.
        self.assertTrue(
            sclient.is_connected(self.namespace),
            'Expected the namespace connection to succeed for an '
            'authenticated user.')

        # Emitting the guarded event must trip socket_permissions_required,
        # which raises ConnectionRefusedError instead of running the
        # handler. The flask-socketio test client surfaces that as an
        # exception out of emit(); if the handler had run unguarded, no
        # exception would be raised here.
        try:
            sclient.emit(self.event, self.params, namespace=self.namespace)
        except ConnectionRefusedError:
            pass
        else:
            self.fail(
                'Socket handler {0} on {1} did not refuse a user lacking '
                'the tool permission; the handler ran instead of raising '
                'ConnectionRefusedError.'.format(self.event, self.namespace))
