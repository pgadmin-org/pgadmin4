##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
A lost Query Tool connection must be re-established as the user and role it
was changed to, not as the server's own user (#10613).
"""

import importlib
import pickle
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import Flask

from pgadmin.tools.sqleditor import _check_and_connect
from pgadmin.tools.sqleditor.utils.query_tool_connection_check import \
    connect_as_transaction_user, query_tool_connection_check
from pgadmin.tools.sqleditor.utils.start_running_query import \
    StartRunningQuery
from pgadmin.utils.route import BaseTestGenerator

# The utils package re-exports the function under the module's own name, so
# fetch the module itself rather than resolving it by attribute.
check_module = importlib.import_module(
    'pgadmin.tools.sqleditor.utils.query_tool_connection_check')
RECONNECT_ERROR = 'password authentication failed for user "jane"'


def _trans_obj(conn_user, conn_role):
    trans_obj = SimpleNamespace(sgid=1, sid=1, did=2, conn_id='conn-1',
                                dbname='postgres')
    if conn_user is not None:
        trans_obj.conn_user = conn_user
        trans_obj.conn_role = conn_role
    return trans_obj


def _driver_for(conn):
    manager = MagicMock()
    manager.connection.return_value = conn
    driver = MagicMock()
    driver.connection_manager.return_value = manager
    return driver


class TestReconnectAsChangedUser(BaseTestGenerator):
    """Every path that reopens the Query Tool's own connection uses the
    stored user and role, and falls back to a plain connect() only when no
    user was recorded (e.g. View/Edit Data, or a transaction created before
    the user was stored)."""

    scenarios = [
        ('Changed user and role', dict(
            conn_user='jane', conn_role='reporting',
            expected_kwargs=dict(user='jane', role='reporting',
                                 password=None))),
        ('Changed user, no role', dict(
            conn_user='jane', conn_role=None,
            expected_kwargs=dict(user='jane', role=None, password=None))),
        ('No user recorded', dict(
            conn_user=None, conn_role=None, expected_kwargs={})),
    ]

    def setUp(self):
        # Pure logic test with a mocked connection: skip the server setup.
        unittest.TestCase.setUp(self)

    def _conn(self, connect_result=(True, None)):
        conn = MagicMock()
        conn.connected.return_value = False
        conn.connect.return_value = connect_result
        return conn

    def runTest(self):
        self._test_helper()
        self._test_query_tool_connection_check()
        self._test_check_and_connect()

    def _test_helper(self):
        conn = self._conn()
        status, _ = connect_as_transaction_user(
            conn, _trans_obj(self.conn_user, self.conn_role))
        self.assertTrue(status)
        conn.connect.assert_called_once_with(**self.expected_kwargs)

    def _test_query_tool_connection_check(self):
        trans_obj = _trans_obj(self.conn_user, self.conn_role)
        conn = self._conn()
        view = MagicMock()
        view.connect.return_value = MagicMock(status_code=200)
        session_obj = {'command_obj': pickle.dumps(trans_obj)}

        with patch.object(StartRunningQuery, 'retrieve_session_information',
                          return_value=session_obj), \
                patch.object(check_module.SchemaDiffRegistry,
                             'get_node_view', return_value=view), \
                patch.object(check_module, 'get_driver',
                             return_value=_driver_for(conn)):
            status, errmsg, res_conn, _, _, response = \
                query_tool_connection_check(1234)

        self.assertTrue(status)
        self.assertIsNone(errmsg)
        self.assertIs(res_conn, conn)
        self.assertIsNone(response)
        conn.connect.assert_called_once_with(**self.expected_kwargs)

    def _test_check_and_connect(self):
        conn = self._conn()
        with patch('pgadmin.tools.sqleditor.get_driver',
                   return_value=_driver_for(conn)):
            is_error, _, res_conn = _check_and_connect(
                _trans_obj(self.conn_user, self.conn_role))

        self.assertFalse(is_error)
        self.assertIs(res_conn, conn)
        conn.connect.assert_called_once_with(**self.expected_kwargs)


class TestStartRunningQueryFailedReconnect(BaseTestGenerator):
    """When the reconnect fails, the error is returned instead of the query
    being run on the dead connection, which would only be reported as a lost
    connection and prompt for another reconnect."""

    scenarios = [
        ('Reconnect as changed user fails', dict()),
    ]

    def setUp(self):
        # Pure logic test with a mocked connection: skip the server setup.
        unittest.TestCase.setUp(self)

    def runTest(self):
        trans_obj = MagicMock(conn_id='conn-1', dbname='postgres')
        conn = MagicMock()
        conn.connected.return_value = False
        session_obj = {'command_obj': pickle.dumps(None)}

        app = Flask(__name__)
        module = 'pgadmin.tools.sqleditor.utils.start_running_query'
        with app.test_request_context(), \
                patch(module + '.StartRunningQuery'
                      '.retrieve_session_information',
                      return_value=session_obj), \
                patch(module + '.pickle.loads', return_value=trans_obj), \
                patch(module + '.get_driver',
                      return_value=_driver_for(conn)), \
                patch('pgadmin.tools.sqleditor.utils'
                      '.query_tool_connection_check',
                      return_value=(False, RECONNECT_ERROR, None, None,
                                    None, None)):
            response = StartRunningQuery(MagicMock(), MagicMock()).execute(
                dict(sql='SELECT 1', explain_plan=None), 1234, {},
                connect=True)

        data = response.get_json()['data']
        self.assertFalse(data['status'])
        self.assertEqual(data['result'], RECONNECT_ERROR)
        conn.execute_async.assert_not_called()
        conn.execute_void.assert_not_called()
