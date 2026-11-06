##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Check for query tool connection"""
import pickle
from flask_babel import gettext

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import internal_server_error
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.sqleditor.utils.start_running_query import StartRunningQuery
from flask import Response, current_app, session

from pgadmin.utils.driver import get_driver


def connect_as_transaction_user(conn, trans_obj):
    """
    (Re)connect a Query Tool connection as the user and role it was opened
    with, either of which may be recorded without the other. When the
    connection was changed to a different user or role, a bare connect()
    would log in as the server's own user instead, so queries would silently
    run as someone else. The password is never stored, so the
    driver falls back to the connection's or server's saved password, and
    the connection fails rather than switching user if that is not accepted.

    :param conn: Connection to (re)connect.
    :param trans_obj: Transaction (command) object for the Query Tool.
    :return: (status, message) from Connection.connect().
    """
    user = getattr(trans_obj, 'conn_user', None)
    role = getattr(trans_obj, 'conn_role', None)
    if user or role:
        return conn.connect(user=user, role=role, password=None)
    return conn.connect()


def query_tool_connection_check(trans_id):
    # This function will check if the query tool has the connection or not
    # if not then establishes the connection.
    session_obj = StartRunningQuery.retrieve_session_information(
        session,
        trans_id
    )
    if isinstance(session_obj, Response):
        return session_obj

    transaction_object = pickle.loads(session_obj['command_obj'])

    # To verify if the transaction details for the specific query tool
    # or View/Edit Data tool is available or not and if the server is
    # disconnected from the Object Explorer then it reconnects
    if transaction_object is not None and session_obj is not None:
        view = SchemaDiffRegistry.get_node_view('server')
        response = view.connect(transaction_object.sgid,
                                transaction_object.sid, True)
        # This is required for asking user to enter password
        # when password is not saved for the server
        if response.status_code == 428:
            return False, None, None, None, None, response
        else:
            manager = get_driver(
                PG_DEFAULT_DRIVER).connection_manager(
                transaction_object.sid)
            conn = manager.connection(
                did=transaction_object.did,
                conn_id=transaction_object.conn_id,
                auto_reconnect=False,
                use_binary_placeholder=True,
                array_to_string=True,
                **({"database": transaction_object.dbname} if hasattr(
                    transaction_object, 'dbname') else {}))

        status, msg = connect_as_transaction_user(conn, transaction_object)
        if not status:
            current_app.logger.error(msg)
            return status, msg, None, None, None, None
        return status, None, conn, transaction_object, session_obj, None
    else:
        status = False
        error_msg = gettext(
            'Either transaction object or session object not found.')
        return status, error_msg, None, None, None, None
