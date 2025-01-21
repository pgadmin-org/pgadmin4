##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Start executing the query in async mode."""

import pickle
import secrets
from threading import Thread
from flask import Response, current_app, copy_current_request_context
from flask_babel import gettext

from config import PG_DEFAULT_DRIVER
from pgadmin.tools.sqleditor.utils.apply_explain_plan_wrapper import \
    apply_explain_plan_wrapper_if_needed
from pgadmin.tools.sqleditor.utils.constant_definition import TX_STATUS_IDLE, \
    TX_STATUS_INERROR
from pgadmin.tools.sqleditor.utils.is_begin_required import is_begin_required
from pgadmin.tools.sqleditor.utils.update_session_grid_transaction import \
    update_session_grid_transaction
from pgadmin.utils.ajax import make_json_response, internal_server_error
from pgadmin.utils.driver import get_driver
from pgadmin.utils.exception import ConnectionLost, SSHTunnelConnectionLost,\
    CryptKeyMissing
from pgadmin.utils.constants import ERROR_MSG_TRANS_ID_NOT_FOUND


class StartRunningQuery:

    def __init__(self, blueprint_object, logger):
        self.http_session = None
        self.blueprint_object = blueprint_object
        self.connection_id = str(secrets.choice(range(1, 9999999)))
        self.logger = logger

    def execute(self, sql, trans_id, http_session, connect=False):
        session_obj = StartRunningQuery.retrieve_session_information(
            http_session,
            trans_id
        )
        if isinstance(session_obj, Response):
            return session_obj

        # Remove any existing primary keys or has_oids in session_obj
        session_obj.pop('primary_keys', None)
        session_obj.pop('oids', None)

        transaction_object = pickle.loads(session_obj['command_obj'])
        can_edit = False
        can_filter = False
        notifies = None
        status = -1
        result = None
        if transaction_object is not None and session_obj is not None:
            # set fetched row count to 0 as we are executing query again.
            transaction_object.update_fetched_row_cnt(0)
            self.__retrieve_connection_id(transaction_object)

            try:
                manager = get_driver(
                    PG_DEFAULT_DRIVER).connection_manager(
                    transaction_object.sid)
                conn = manager.connection(
                    did=transaction_object.did,
                    conn_id=self.connection_id,
                    auto_reconnect=False,
                    use_binary_placeholder=True,
                    array_to_string=True,
                    **({"database": transaction_object.dbname} if hasattr(
                        transaction_object,'dbname') else {}))
            except (ConnectionLost, SSHTunnelConnectionLost, CryptKeyMissing):
                raise
            except Exception as e:
                self.logger.error(e)
                return internal_server_error(errormsg=str(e))

            # Connect to the Server if not connected.
            if connect and not conn.connected():
                from pgadmin.tools.sqleditor.utils import \
                    query_tool_connection_check

                _, _, _, _, _, response = \
                    query_tool_connection_check(trans_id)
                # This is required for asking user to enter password
                # when password is not saved for the server
                if response is not None:
                    return response
            effective_sql_statement = apply_explain_plan_wrapper_if_needed(
                manager, sql)

            self.__execute_query(
                conn,
                session_obj,
                effective_sql_statement,
                trans_id,
                transaction_object
            )

            can_edit = transaction_object.can_edit()
            can_filter = transaction_object.can_filter()

            # Get the notifies
            notifies = conn.get_notifies()
        else:
            status = False
            result = gettext(
                'Either transaction object or session object not found.')

        return make_json_response(
            data={
                'status': status, 'result': result,
                'can_edit': can_edit, 'can_filter': can_filter,
                'notifies': notifies,
            }
        )

    def __retrieve_connection_id(self, trans_obj):
        conn_id = trans_obj.conn_id
        # if conn_id is None then we will have to create a new connection
        if conn_id is not None:
            self.connection_id = conn_id

    def __execute_query(self, conn, session_obj, sql, trans_id, trans_obj):
        # on successful connection set the connection id to the
        # transaction object
        if hasattr(trans_obj, 'set_connection_id'):
            trans_obj.set_connection_id(self.connection_id)

        StartRunningQuery.save_transaction_in_session(session_obj,
                                                      trans_id, trans_obj)

        # If auto commit is False and transaction status is Idle
        # then call is_begin_not_required() function to check BEGIN
        # is required or not.

        if StartRunningQuery.is_begin_required_for_sql_query(trans_obj,
                                                             conn, sql):
            conn.execute_void("BEGIN;")

        is_rollback_req = StartRunningQuery.is_rollback_statement_required(
            trans_obj,
            conn)

        @copy_current_request_context
        def asyn_exec_query(conn, sql, trans_obj, is_rollback_req,
                            app):
            # Execute sql asynchronously with params is None
            # and formatted_error is True.
            with app.app_context():
                try:
                    _, _ = conn.execute_async(sql)
                    # # If the transaction aborted for some reason and
                    # # Auto RollBack is True then issue a rollback to cleanup.
                    if is_rollback_req:
                        conn.execute_void("ROLLBACK;")
                except Exception as e:
                    self.logger.error(e)
                    return internal_server_error(errormsg=str(e))

        _thread = QueryThread(target=asyn_exec_query,
                              args=(conn, sql, trans_obj, is_rollback_req,
                                    current_app._get_current_object())
                              )
        _thread.start()
        _native_id = _thread.native_id if hasattr(_thread, 'native_id'
                                                  ) else _thread.ident
        trans_obj.set_thread_native_id(_native_id)
        StartRunningQuery.save_transaction_in_session(session_obj,
                                                      trans_id, trans_obj)

    @staticmethod
    def is_begin_required_for_sql_query(trans_obj, conn, sql):
        return (not trans_obj.auto_commit and
                conn.transaction_status() == TX_STATUS_IDLE and
                is_begin_required(sql)
                )

    @staticmethod
    def is_rollback_statement_required(trans_obj, conn):
        return (
            conn.transaction_status() == TX_STATUS_INERROR and
            trans_obj.auto_rollback
        )

    @staticmethod
    def save_transaction_in_session(session, transaction_id, transaction):
        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session['command_obj'] = pickle.dumps(transaction, -1)
        update_session_grid_transaction(transaction_id, session)

    @staticmethod
    def retrieve_session_information(http_session, transaction_id):
        if 'gridData' not in http_session:
            return make_json_response(
                success=0,
                errormsg=ERROR_MSG_TRANS_ID_NOT_FOUND,
                info='DATAGRID_TRANSACTION_REQUIRED', status=404
            )
        grid_data = http_session['gridData']
        # Return from the function if transaction id not found
        if str(transaction_id) not in grid_data:
            return make_json_response(
                success=0,
                errormsg=ERROR_MSG_TRANS_ID_NOT_FOUND,
                info='DATAGRID_TRANSACTION_REQUIRED',
                status=404
            )
        # Fetch the object for the specified transaction id.
        # Use pickle.loads function to get the command object
        return grid_data[str(transaction_id)]


class QueryThread(Thread):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.app = current_app._get_current_object()

    def run(self):
        with self.app.app_context():
            super().run()
