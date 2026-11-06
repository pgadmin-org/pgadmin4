##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
check_transaction_status() must not ignore the result of reconnecting a
dropped connection (#10604).
"""

import json
import pickle
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import Flask, Response, session

from pgadmin.tools.sqleditor import check_transaction_status
from pgadmin.utils.route import BaseTestGenerator

TRANS_ID = 1234
RECONNECT_ERROR = 'connection failed: SSH tunnel could not be opened'


class TestCheckTransactionStatusReconnect(BaseTestGenerator):
    """A failed autocomplete reconnect is returned as an error response;
    a successful one returns the connection as before. Other callers leave
    a failed reconnect to query_tool_connection_check(), which can still
    prompt for a password."""

    scenarios = [
        ('Autocomplete reconnect fails', dict(
            auto_comp=True, conn_user=None, query_string='',
            connect_result=(False, RECONNECT_ERROR), expect_ok=False)),
        ('Autocomplete reconnect as changed user fails', dict(
            auto_comp=True, conn_user='jane', query_string='',
            connect_result=(False, RECONNECT_ERROR), expect_ok=False)),
        ('Autocomplete reconnect succeeds', dict(
            auto_comp=True, conn_user=None, query_string='',
            connect_result=(True, None), expect_ok=True)),
        ('Autocomplete reconnect as changed user succeeds', dict(
            auto_comp=True, conn_user='jane', query_string='',
            connect_result=(True, None), expect_ok=True)),
        ('connect=1 reconnect fails, left to the caller', dict(
            auto_comp=False, conn_user=None, query_string='connect=1',
            connect_result=(False, RECONNECT_ERROR), expect_ok=True)),
        ('connect=1 reconnect succeeds', dict(
            auto_comp=False, conn_user=None, query_string='connect=1',
            connect_result=(True, None), expect_ok=True)),
        # The main connection reconnects as the user it was changed to too,
        # rather than the server's own user (#10613).
        ('connect=1 reconnect as changed user fails, left to the caller',
         dict(auto_comp=False, conn_user='jane', query_string='connect=1',
              connect_result=(False, RECONNECT_ERROR), expect_ok=True)),
        ('connect=1 reconnect as changed user succeeds', dict(
            auto_comp=False, conn_user='jane', query_string='connect=1',
            connect_result=(True, None), expect_ok=True)),
    ]

    def setUp(self):
        # Pure logic test with a mocked connection: skip the server setup.
        unittest.TestCase.setUp(self)

    def runTest(self):
        trans_obj = SimpleNamespace(
            sid=1, did=2, conn_id='conn-1', conn_id_ac='conn-ac-1')
        if self.conn_user:
            trans_obj.conn_user = self.conn_user
            trans_obj.conn_role = None

        conn = MagicMock()
        conn.connected.return_value = False
        conn.connect.return_value = self.connect_result
        manager = MagicMock()
        manager.connection.return_value = conn
        driver = MagicMock()
        driver.connection_manager.return_value = manager

        app = Flask(__name__)
        app.secret_key = 'test'

        with app.test_request_context(query_string=self.query_string), \
                patch('pgadmin.tools.sqleditor.get_driver',
                      return_value=driver):
            session['gridData'] = {
                str(TRANS_ID): {'command_obj': pickle.dumps(trans_obj)}
            }
            status, error_msg, res_conn, res_trans_obj, res_session_obj = \
                check_transaction_status(TRANS_ID, auto_comp=self.auto_comp)

        if self.conn_user:
            conn.connect.assert_called_once_with(
                user=self.conn_user, role=None, password=None)
        else:
            conn.connect.assert_called_once_with()

        if self.expect_ok:
            self.assertTrue(status)
            self.assertIsNone(error_msg)
            self.assertIs(res_conn, conn)
            self.assertEqual(res_trans_obj.conn_id, trans_obj.conn_id)
            self.assertIsNotNone(res_session_obj)
        else:
            self.assertFalse(status)
            self.assertIsInstance(error_msg, Response)
            self.assertEqual(error_msg.status_code, 500)
            body = json.loads(error_msg.get_data(as_text=True))
            self.assertEqual(body['errormsg'], RECONNECT_ERROR)
            self.assertIsNone(res_conn)
            self.assertIsNone(res_trans_obj)
            self.assertIsNone(res_session_obj)
