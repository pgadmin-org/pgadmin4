##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that logging in to a locked account from a browser session that
still holds open server connections shows the locked message, and logs the
session out, releasing its connections, rather than failing with an error.

The session's user is not authenticated: it is either the locked account
itself, which Flask-Login no longer treats as authenticated, or no user at
all, while releasing a running Query Tool connection used to need a
logged-in user.
"""

import json
import os
import secrets
from unittest.mock import patch

import config
import flask
from config import PG_DEFAULT_DRIVER

from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.model import db, User
from pgadmin.utils.constants import INTERNAL
from pgadmin.utils.driver import get_driver
from pgadmin.utils.driver.psycopg3.server_manager import ServerManager
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils

LOCKED_MSG = 'Your account is locked.'


class LockedAccountOpenConnectionsTestCase(BaseTestGenerator):
    """A locked login with open connections in the session is refused
    cleanly."""

    scenarios = [
        ('Session user is the locked account', dict(drop_user=False)),
        ('Session has no user', dict(drop_user=True)),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest('Accounts are only locked in server mode.')

        for name in ('AUTHENTICATION_SOURCES', 'MAX_LOGIN_ATTEMPTS'):
            self.addCleanup(setattr, config, name, getattr(config, name))
        config.AUTHENTICATION_SOURCES = [INTERNAL]
        config.MAX_LOGIN_ATTEMPTS = 3

        self.email = os.environ['PGADMIN_SETUP_EMAIL']
        self.password = os.environ['PGADMIN_SETUP_PASSWORD']

        database_info = parent_node_dict['database'][-1]
        self.server_id = database_info['server_id']
        self.db_id = database_info['db_id']
        db_con = database_utils.connect_database(
            self, utils.SERVER_GROUP, self.server_id, self.db_id)
        if db_con['info'] != 'Database connected.':
            raise Exception('Could not connect to the database.')

        # Open the Query Tool and run a query, so the session holds a
        # connection that logging out cancels and releases.
        self.trans_id = str(secrets.choice(range(1, 9999999)))
        response = self.tester.post(
            '/sqleditor/initialize/sqleditor/{0}/{1}/{2}/{3}'.format(
                self.trans_id, utils.SERVER_GROUP, self.server_id,
                self.db_id),
            data=json.dumps({'dbname': database_info['db_name']}))
        self.assertEqual(response.status_code, 200)
        self.addCleanup(self._close_query_tool)
        response = self.tester.post(
            '/sqleditor/query_tool/start/{0}'.format(self.trans_id),
            data=json.dumps({'sql': 'SELECT 1;'}),
            content_type='html/json')
        self.assertEqual(response.status_code, 200)

        self._set_locked(True)
        self.addCleanup(self._set_locked, False)

    def _set_locked(self, locked):
        with self.app.app_context():
            user = User.query.filter_by(email=self.email).first()
            user.login_attempts = config.MAX_LOGIN_ATTEMPTS if locked else 0
            user.locked = locked
            db.session.commit()

    def _close_query_tool(self):
        # Logging in again may already have released the connections, so
        # the database may not be connected any more.
        utils.login_tester_account(self.tester)
        self.tester.delete('/sqleditor/close/{0}'.format(self.trans_id))
        self.tester.delete('/browser/database/connect/{0}/{1}/{2}'.format(
            utils.SERVER_GROUP, self.server_id, self.db_id))

    def runTest(self):
        if self.drop_user:
            with self.tester.session_transaction() as sess:
                sess.pop('_user_id', None)

        with patch('pgadmin.authenticate.flash',
                   wraps=flask.flash) as flash_mock:
            response = self.tester.login(self.email, self.password)
        flashed = [str(c.args[0]) for c in flash_mock.call_args_list]

        self.assertEqual(response.status_code, 302, response.data[:300])
        self.assertTrue(any(LOCKED_MSG in m for m in flashed), flashed)

        # The session no longer belongs to the locked account, so unlocking
        # it does not log the session back in, and its connections are
        # released.
        with self.tester.session_transaction() as sess:
            self.assertNotIn('_user_id', sess)
        with self.app.app_context():
            manager = get_driver(PG_DEFAULT_DRIVER).managers.get(sess.sid)
        connected = [conn for mgr in (manager or {}).values()
                     if isinstance(mgr, ServerManager)
                     for conn in mgr.connections.values()
                     if conn.connected()]
        self.assertEqual(connected, [])
