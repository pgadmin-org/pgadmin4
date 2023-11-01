##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the sqleditor frame."""
import os
import pickle
import re
import secrets
from urllib.parse import unquote
from threading import Lock
import threading

import json
from config import PG_DEFAULT_DRIVER, ALLOW_SAVE_PASSWORD, SHARED_STORAGE
from werkzeug.user_agent import UserAgent
from flask import Response, url_for, render_template, session, current_app
from flask import request
from flask_babel import gettext
from flask_security import login_required, current_user
from pgadmin.misc.file_manager import Filemanager
from pgadmin.tools.sqleditor.command import QueryToolCommand, ObjectRegistry, \
    SQLFilter
from pgadmin.tools.sqleditor.utils.constant_definition import ASYNC_OK, \
    ASYNC_EXECUTION_ABORTED, \
    CONNECTION_STATUS_MESSAGE_MAPPING, TX_STATUS_INERROR
from pgadmin.tools.sqleditor.utils.start_running_query import StartRunningQuery
from pgadmin.tools.sqleditor.utils.update_session_grid_transaction import \
    update_session_grid_transaction
from pgadmin.utils import PgAdminModule
from pgadmin.utils import get_storage_directory
from pgadmin.utils.ajax import make_json_response, bad_request, \
    success_return, internal_server_error, service_unavailable
from pgadmin.utils.driver import get_driver
from pgadmin.utils.exception import ConnectionLost, SSHTunnelConnectionLost, \
    CryptKeyMissing, ObjectGone
from pgadmin.browser.utils import underscore_unescape, underscore_escape
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.sqlautocomplete.autocomplete import SQLAutoComplete
from pgadmin.tools.sqleditor.utils.query_tool_preferences import \
    register_query_tool_preferences
from pgadmin.tools.sqleditor.utils.query_tool_fs_utils import \
    read_file_generator
from pgadmin.tools.sqleditor.utils.filter_dialog import FilterDialog
from pgadmin.tools.sqleditor.utils.query_history import QueryHistory
from pgadmin.tools.sqleditor.utils.macros import get_macros,\
    get_user_macros, set_macros
from pgadmin.utils.constants import MIMETYPE_APP_JS, \
    SERVER_CONNECTION_CLOSED, ERROR_MSG_TRANS_ID_NOT_FOUND, \
    ERROR_FETCHING_DATA, MY_STORAGE, ACCESS_DENIED_MESSAGE
from pgadmin.model import Server, ServerGroup
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.settings import get_setting
from pgadmin.utils.preferences import Preferences

MODULE_NAME = 'sqleditor'
TRANSACTION_STATUS_CHECK_FAILED = gettext("Transaction status check failed.")
_NODES_SQL = 'nodes.sql'
sqleditor_close_session_lock = Lock()
auto_complete_objects = dict()


class SqlEditorModule(PgAdminModule):
    """
    class SqlEditorModule(PgAdminModule)

        A module class for SQL Grid derived from PgAdminModule.
    """

    LABEL = gettext("Query Tool")

    def get_own_menuitems(self):
        return {'tools': [
            MenuItem(name='mnu_query_tool',
                     label=gettext('Query tool'),
                     priority=100,
                     callback='show_query_tool',
                     icon='fa fa-question',
                     url=url_for('help.static', filename='index.html'))
        ]}

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for sqleditor module
        """
        return [
            'sqleditor.initialize_viewdata',
            'sqleditor.initialize_sqleditor',
            'sqleditor.initialize_sqleditor_with_did',
            'sqleditor.filter_validate',
            'sqleditor.filter',
            'sqleditor.panel',
            'sqleditor.close',
            'sqleditor.update_sqleditor_connection',

            'sqleditor.view_data_start',
            'sqleditor.query_tool_start',
            'sqleditor.poll',
            'sqleditor.fetch',
            'sqleditor.fetch_all',
            'sqleditor.fetch_all_from_start',
            'sqleditor.save',
            'sqleditor.inclusive_filter',
            'sqleditor.exclusive_filter',
            'sqleditor.remove_filter',
            'sqleditor.set_limit',
            'sqleditor.cancel_transaction',
            'sqleditor.get_object_name',
            'sqleditor.auto_commit',
            'sqleditor.auto_rollback',
            'sqleditor.autocomplete',
            'sqleditor.load_file',
            'sqleditor.save_file',
            'sqleditor.query_tool_download',
            'sqleditor.connection_status',
            'sqleditor.get_filter_data',
            'sqleditor.set_filter_data',
            'sqleditor.get_query_history',
            'sqleditor.add_query_history',
            'sqleditor.clear_query_history',
            'sqleditor.get_macro',
            'sqleditor.get_macros',
            'sqleditor.set_macros',
            'sqleditor.get_new_connection_data',
            'sqleditor.get_new_connection_servers',
            'sqleditor.get_new_connection_database',
            'sqleditor.get_new_connection_user',
            'sqleditor._check_server_connection_status',
            'sqleditor.get_new_connection_role',
            'sqleditor.connect_server',
        ]

    def on_logout(self):
        """
        This is a callback function when user logout from pgAdmin
        :param user:
        :return:
        """
        with sqleditor_close_session_lock:
            if 'gridData' in session:
                for trans_id in session['gridData']:
                    close_sqleditor_session(trans_id)

                # Delete all grid data from session variable
                del session['gridData']

    def register_preferences(self):
        register_query_tool_preferences(self)


blueprint = SqlEditorModule(MODULE_NAME, __name__, static_url_path='/static')


@blueprint.route('/')
@login_required
def index():
    return bad_request(
        errormsg=gettext('This URL cannot be requested directly.')
    )


@blueprint.route("/filter", endpoint='filter')
@login_required
def show_filter():
    return render_template(MODULE_NAME + '/filter.html')


@blueprint.route(
    '/initialize/viewdata/<int:trans_id>/<int:cmd_type>/<obj_type>/'
    '<int:sgid>/<int:sid>/<int:did>/<int:obj_id>',
    methods=["PUT", "POST"],
    endpoint="initialize_viewdata"
)
@login_required
def initialize_viewdata(trans_id, cmd_type, obj_type, sgid, sid, did, obj_id):
    """
    This method is responsible for creating an asynchronous connection.
    After creating the connection it will instantiate and initialize
    the object as per the object type. It will also create a unique
    transaction id and store the information into session variable.

    Args:
        cmd_type: Contains value for which menu item is clicked.
        obj_type: Contains type of selected object for which data grid to
        be render
        sgid: Server group Id
        sid: Server Id
        did: Database Id
        obj_id: Id of currently selected object
    """

    if request.data:
        filter_sql = json.loads(request.data)
    else:
        filter_sql = request.args or request.form

    # Create asynchronous connection using random connection id.
    conn_id = str(secrets.choice(range(1, 9999999)))
    try:
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        # default_conn is same connection which is created when user connect to
        # database from tree
        default_conn = manager.connection(did=did)
        conn = manager.connection(did=did, conn_id=conn_id,
                                  auto_reconnect=False,
                                  use_binary_placeholder=True,
                                  array_to_string=True)
    except (ConnectionLost, SSHTunnelConnectionLost):
        raise
    except Exception as e:
        current_app.logger.error(e)
        return internal_server_error(errormsg=str(e))

    status, msg = default_conn.connect()
    if not status:
        current_app.logger.error(msg)
        return internal_server_error(errormsg=str(msg))

    status, msg = conn.connect()
    if not status:
        current_app.logger.error(msg)
        return internal_server_error(errormsg=str(msg))
    try:
        # if object type is partition then it is nothing but a table.
        if obj_type == 'partition':
            obj_type = 'table'

        # Get the object as per the object type
        command_obj = ObjectRegistry.get_object(
            obj_type, conn_id=conn_id, sgid=sgid, sid=sid,
            did=did, obj_id=obj_id, cmd_type=cmd_type,
            sql_filter=filter_sql
        )
    except ObjectGone:
        raise
    except Exception as e:
        current_app.logger.error(e)
        return internal_server_error(errormsg=str(e))

    if 'gridData' not in session:
        sql_grid_data = dict()
    else:
        sql_grid_data = session['gridData']

    # Use pickle to store the command object which will be used later by the
    # sql grid module.
    sql_grid_data[str(trans_id)] = {
        # -1 specify the highest protocol version available
        'command_obj': pickle.dumps(command_obj, -1)
    }

    # Store the grid dictionary into the session variable
    session['gridData'] = sql_grid_data

    return make_json_response(
        data={
            'conn_id': conn_id
        }
    )


@blueprint.route(
    '/panel/<int:trans_id>',
    methods=["POST"],
    endpoint='panel'
)
def panel(trans_id):
    """
    This method calls index.html to render the data grid.

    Args:
        trans_id: unique transaction id
    """

    params = None
    if request.args:
        params = {k: v for k, v in request.args.items()}

    if request.form:
        for key, val in request.form.items():
            params[key] = val

    params['trans_id'] = trans_id

    # We need client OS information to render correct Keyboard shortcuts
    params['client_platform'] = UserAgent(request.headers.get('User-Agent'))\
        .platform

    params['is_linux'] = False
    from sys import platform as _platform
    if "linux" in _platform:
        params['is_linux'] = True

    # Fetch the server details
    params['bgcolor'] = None
    params['fgcolor'] = None

    s = Server.query.filter_by(id=int(params['sid'])).first()
    if s.shared and s.user_id != current_user.id:
        # Import here to avoid circular dependency
        from pgadmin.browser.server_groups.servers import ServerModule
        shared_server = ServerModule.get_shared_server(s, params['sgid'])
        s = ServerModule.get_shared_server_properties(s, shared_server)

    if s and s.bgcolor:
        # If background is set to white means we do not have to change
        # the title background else change it as per user specified
        # background
        if s.bgcolor != '#ffffff':
            params['bgcolor'] = s.bgcolor
        params['fgcolor'] = s.fgcolor or 'black'

    params['server_name'] = underscore_escape(s.name)
    if 'user' not in params:
        params['user'] = underscore_escape(s.username)
    if 'role' not in params and s.role:
        params['role'] = underscore_escape(s.role)
    params['layout'] = get_setting('SQLEditor/Layout')
    params['macros'] = get_user_macros()
    params['is_desktop_mode'] = current_app.PGADMIN_RUNTIME
    if 'database_name' in params:
        params['database_name'] = underscore_escape(params['database_name'])

    return render_template(
        "sqleditor/index.html",
        title=underscore_unescape(params['title']),
        params=json.dumps(params),
    )


@blueprint.route(
    '/initialize/sqleditor/<int:trans_id>/<int:sgid>/<int:sid>/'
    '<int:did>',
    methods=["POST"], endpoint='initialize_sqleditor_with_did'
)
@blueprint.route(
    '/initialize/sqleditor/<int:trans_id>/<int:sgid>/<int:sid>',
    methods=["POST"], endpoint='initialize_sqleditor'
)
@login_required
def initialize_sqleditor(trans_id, sgid, sid, did=None):
    """
    This method is responsible for instantiating and initializing
    the query tool object. It will also create a unique
    transaction id and store the information into session variable.

    Args:
        sgid: Server group Id
        sid: Server Id
        did: Database Id
    """
    connect = True
    # Read the data if present. Skipping read may cause connection
    # reset error if data is sent from the client
    data = {}
    if request.data:
        data = json.loads(request.data)

    req_args = request.args
    if ('recreate' in req_args and
            req_args['recreate'] == '1'):
        connect = False

    kwargs = {
        'user': data['user'] if 'user' in data else None,
        'role': data['role'] if 'role' in data else None,
        'password': data['password'] if 'password' in data else None
    }

    is_error, errmsg, conn_id, version = _init_sqleditor(
        trans_id, connect, sgid, sid, did, data['dbname'], **kwargs)
    if is_error:
        return errmsg

    return make_json_response(
        data={
            'connId': str(conn_id),
            'serverVersion': version,
        }
    )


def _connect(conn, **kwargs):
    """
    Connect the database.
    :param conn: Connection instance.
    :param kwargs: user, role and password data from user.
    :return:
    """
    user = None
    role = None
    password = None
    is_ask_password = False
    if 'user' in kwargs and 'role' in kwargs:
        user = kwargs['user']
        role = kwargs['role'] if kwargs['role'] else None
        password = kwargs['password'] if kwargs['password'] else None
        is_ask_password = True
    if user:
        status, msg = conn.connect(user=user, role=role,
                                   password=password)
    else:
        status, msg = conn.connect(**kwargs)

    return status, msg, is_ask_password, user, role, password


def _init_sqleditor(trans_id, connect, sgid, sid, did, dbname=None, **kwargs):
    # Create asynchronous connection using random connection id.
    conn_id = str(secrets.choice(range(1, 9999999)))
    conn_id_ac = str(secrets.choice(range(1, 9999999)))

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)

    if did is None:
        did = manager.did
    try:
        command_obj = ObjectRegistry.get_object(
            'query_tool', conn_id=conn_id, sgid=sgid, sid=sid, did=did,
            conn_id_ac=conn_id_ac
        )
    except Exception as e:
        current_app.logger.error(e)
        return True, internal_server_error(errormsg=str(e)), '', ''

    try:
        conn = manager.connection(conn_id=conn_id,
                                  auto_reconnect=False,
                                  use_binary_placeholder=True,
                                  array_to_string=True,
                                  **({"database": dbname} if dbname is not None
                                     else {"did": did}))
        pref = Preferences.module('sqleditor')

        if connect:
            kwargs['auto_commit'] = pref.preference('auto_commit').get()
            kwargs['auto_rollback'] = pref.preference('auto_rollback').get()

            status, msg, is_ask_password, user, role, password = _connect(
                conn, **kwargs)
            if not status:
                current_app.logger.error(msg)
                if is_ask_password:
                    server = Server.query.filter_by(id=sid).first()
                    return True, make_json_response(
                        success=0,
                        status=428,
                        result={
                            "server_label": server.name,
                            "username": user or server.username,
                            "errmsg": msg,
                            "prompt_password": True,
                            "allow_save_password": True
                            if ALLOW_SAVE_PASSWORD and
                            session['allow_save_password'] else False,
                        }
                    ), '', ''
                else:
                    return True, internal_server_error(
                        errormsg=str(msg)), '', ''

            if pref.preference('autocomplete_on_key_press').get():
                conn_ac = manager.connection(conn_id=conn_id_ac,
                                             auto_reconnect=False,
                                             use_binary_placeholder=True,
                                             array_to_string=True,
                                             **({"database": dbname}
                                                if dbname is not None
                                                else {"did": did}))
                status, msg, is_ask_password, user, role, password = _connect(
                    conn_ac, **kwargs)

    except (ConnectionLost, SSHTunnelConnectionLost) as e:
        current_app.logger.error(e)
        raise
    except Exception as e:
        current_app.logger.error(e)
        return True, internal_server_error(errormsg=str(e)), '', ''

    if 'gridData' not in session:
        sql_grid_data = dict()
    else:
        sql_grid_data = session['gridData']

    # Set the value of auto commit and auto rollback specified in Preferences
    command_obj.set_auto_commit(pref.preference('auto_commit').get())
    command_obj.set_auto_rollback(pref.preference('auto_rollback').get())

    # Set the value of database name, that will be used later
    command_obj.dbname = dbname if dbname else None
    # Use pickle to store the command object which will be used
    # later by the sql grid module.
    sql_grid_data[str(trans_id)] = {
        # -1 specify the highest protocol version available
        'command_obj': pickle.dumps(command_obj, -1)
    }

    # Store the grid dictionary into the session variable
    session['gridData'] = sql_grid_data

    return False, '', conn_id, manager.version


@blueprint.route(
    '/initialize/sqleditor/update_connection/<int:trans_id>/'
    '<int:sgid>/<int:sid>/<int:did>',
    methods=["POST"], endpoint='update_sqleditor_connection'
)
def update_sqleditor_connection(trans_id, sgid, sid, did):
    # Remove transaction Id.
    with sqleditor_close_session_lock:
        data = json.loads(request.data)

        if 'gridData' not in session:
            return make_json_response(data={'status': True})

        grid_data = session['gridData']

        # Return from the function if transaction id not found
        if str(trans_id) not in grid_data:
            return make_json_response(data={'status': True})

        connect = True

        req_args = request.args
        if ('recreate' in req_args and
                req_args['recreate'] == '1'):
            connect = False

        new_trans_id = str(secrets.choice(range(1, 9999999)))
        kwargs = {
            'user': data['user'],
            'role': data['role'] if 'role' in data else None,
            'password': data['password'] if 'password' in data else None
        }

        is_error, errmsg, conn_id, version = _init_sqleditor(
            new_trans_id, connect, sgid, sid, did, data['database_name'],
            **kwargs)

        if is_error:
            return errmsg
        else:
            try:
                # Check the transaction and connection status
                status, error_msg, conn, trans_obj, session_obj = \
                    check_transaction_status(trans_id)

                status, error_msg, new_conn, new_trans_obj, new_session_obj = \
                    check_transaction_status(new_trans_id)

                new_session_obj['primary_keys'] = session_obj[
                    'primary_keys'] if 'primary_keys' in session_obj else None
                new_session_obj['columns_info'] = session_obj[
                    'columns_info'] if 'columns_info' in session_obj else None
                new_session_obj['client_primary_key'] = session_obj[
                    'client_primary_key'] if 'client_primary_key'\
                                             in session_obj else None

                close_sqleditor_session(trans_id)
                # Remove the information of unique transaction id from the
                # session variable.
                grid_data.pop(str(trans_id), None)
                session['gridData'] = grid_data
            except Exception as e:
                current_app.logger.error(e)

    return make_json_response(
        data={
            'connId': str(conn_id),
            'serverVersion': version,
            'trans_id': new_trans_id
        }
    )


@blueprint.route('/close/<int:trans_id>', methods=["DELETE"], endpoint='close')
def close(trans_id):
    """
    This method is used to close the asynchronous connection
    and remove the information of unique transaction id from
    the session variable.

    Args:
        trans_id: unique transaction id
    """
    with sqleditor_close_session_lock:
        # delete the SQLAutoComplete object
        if trans_id in auto_complete_objects:
            del auto_complete_objects[trans_id]

        if 'gridData' not in session:
            return make_json_response(data={'status': True})

        grid_data = session['gridData']
        # Return from the function if transaction id not found
        if str(trans_id) not in grid_data:
            return make_json_response(data={'status': True})

        try:
            close_sqleditor_session(trans_id)
            # Remove the information of unique transaction id from the
            # session variable.
            grid_data.pop(str(trans_id), None)
            session['gridData'] = grid_data
        except Exception as e:
            current_app.logger.error(e)
            return internal_server_error(errormsg=str(e))

    return make_json_response(data={'status': True})


@blueprint.route(
    '/filter/validate/<int:sid>/<int:did>/<int:obj_id>',
    methods=["PUT", "POST"], endpoint='filter_validate'
)
@login_required
def validate_filter(sid, did, obj_id):
    """
    This method is used to validate the sql filter.

    Args:
        sid: Server Id
        did: Database Id
        obj_id: Id of currently selected object
    """
    if request.data:
        filter_data = json.loads(request.data)
    else:
        filter_data = request.args or request.form

    try:
        # Create object of SQLFilter class
        sql_filter_obj = SQLFilter(sid=sid, did=did, obj_id=obj_id)

        # Call validate_filter method to validate the SQL.
        status, res = sql_filter_obj.validate_filter(filter_data['filter_sql'])
        if not status:
            return internal_server_error(errormsg=str(res))
    except ObjectGone:
        raise
    except Exception as e:
        current_app.logger.error(e)
        return internal_server_error(errormsg=str(e))

    return make_json_response(data={'status': status, 'result': res})


def close_sqleditor_session(trans_id):
    """
    This function is used to cancel the transaction and release the connection.

    :param trans_id: Transaction id
    :return:
    """
    if 'gridData' in session and str(trans_id) in session['gridData']:
        cmd_obj_str = session['gridData'][str(trans_id)]['command_obj']
        # Use pickle.loads function to get the command object
        cmd_obj = pickle.loads(cmd_obj_str)

        # if connection id is None then no need to release the connection
        if cmd_obj.conn_id is not None:
            manager = get_driver(
                PG_DEFAULT_DRIVER).connection_manager(cmd_obj.sid)
            if manager is not None:
                conn = manager.connection(
                    did=cmd_obj.did, conn_id=cmd_obj.conn_id)

                # Release the connection
                if conn.connected():
                    conn.cancel_transaction(cmd_obj.conn_id, cmd_obj.did)
                    manager.release(did=cmd_obj.did, conn_id=cmd_obj.conn_id)

        # Close the auto complete connection
        if cmd_obj.conn_id_ac is not None:
            manager = get_driver(
                PG_DEFAULT_DRIVER).connection_manager(cmd_obj.sid)
            if manager is not None:
                conn = manager.connection(
                    did=cmd_obj.did, conn_id=cmd_obj.conn_id_ac)

                # Release the connection
                if conn.connected():
                    conn.cancel_transaction(cmd_obj.conn_id_ac, cmd_obj.did)
                    manager.release(did=cmd_obj.did,
                                    conn_id=cmd_obj.conn_id_ac)


def check_transaction_status(trans_id, auto_comp=False):
    """
    This function is used to check the transaction id
    is available in the session object and connection
    status.

    Args:
        trans_id: Transaction Id
        auto_comp: Auto complete flag

    Returns: status and connection object

    """

    if 'gridData' not in session:
        return False, ERROR_MSG_TRANS_ID_NOT_FOUND, None, None, None

    grid_data = session['gridData']

    # Return from the function if transaction id not found
    if str(trans_id) not in grid_data:
        return False, ERROR_MSG_TRANS_ID_NOT_FOUND, None, None, None

    # Fetch the object for the specified transaction id.
    # Use pickle.loads function to get the command object
    session_obj = grid_data[str(trans_id)]
    trans_obj = pickle.loads(session_obj['command_obj'])

    if auto_comp:
        conn_id = trans_obj.conn_id_ac
        connect = True
    else:
        conn_id = trans_obj.conn_id
        connect = True if 'connect' in request.args and \
                          request.args['connect'] == '1' else False
    try:
        manager = get_driver(
            PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
        conn = manager.connection(
            did=trans_obj.did,
            conn_id=conn_id,
            auto_reconnect=False,
            use_binary_placeholder=True,
            array_to_string=True
        )
    except (ConnectionLost, SSHTunnelConnectionLost, CryptKeyMissing):
        raise
    except Exception as e:
        current_app.logger.error(e)
        return False, internal_server_error(errormsg=str(e)), None, None, None

    if connect and conn and not conn.connected():
        conn.connect()

    return True, None, conn, trans_obj, session_obj


@blueprint.route(
    '/view_data/start/<int:trans_id>',
    methods=["GET"], endpoint='view_data_start'
)
@login_required
def start_view_data(trans_id):
    """
    This method is used to execute query using asynchronous connection.

    Args:
        trans_id: unique transaction id
    """
    limit = -1

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    # get the default connection as current connection which is attached to
    # trans id holds the cursor which has query result so we cannot use that
    # connection to execute another query otherwise we'll lose query result.

    try:
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
            trans_obj.sid)
        default_conn = manager.connection(did=trans_obj.did)
    except (ConnectionLost, SSHTunnelConnectionLost) as e:
        raise
    except Exception as e:
        current_app.logger.error(e)
        return internal_server_error(errormsg=str(e))

    # Connect to the Server if not connected.
    if not default_conn.connected():
        status, msg = default_conn.connect()
        if not status:
            return make_json_response(
                data={'status': status, 'result': "{}".format(msg)}
            )

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        # set fetched row count to 0 as we are executing query again.
        trans_obj.update_fetched_row_cnt(0)

        # Fetch the sql and primary_keys from the object
        sql = trans_obj.get_sql(default_conn)
        pk_names, primary_keys = trans_obj.get_primary_keys(default_conn)

        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)

        has_oids = False
        if trans_obj.object_type == 'table':
            # Fetch OIDs status
            has_oids = trans_obj.has_oids(default_conn)

        # Fetch the applied filter.
        filter_applied = trans_obj.is_filter_applied()

        # Fetch the limit for the SQL query
        limit = trans_obj.get_limit()

        can_edit = trans_obj.can_edit()
        can_filter = trans_obj.can_filter()

        # Store the primary keys to the session object
        session_obj['primary_keys'] = primary_keys

        # Store the OIDs status into session object
        session_obj['has_oids'] = has_oids

        update_session_grid_transaction(trans_id, session_obj)

        # Execute sql asynchronously
        status, result = conn.execute_async(sql)
    else:
        status = False
        result = error_msg
        filter_applied = False
        can_edit = False
        can_filter = False
        sql = None

    return make_json_response(
        data={
            'status': status, 'result': result,
            'filter_applied': filter_applied,
            'limit': limit, 'can_edit': can_edit,
            'can_filter': can_filter, 'sql': sql,
        }
    )


@blueprint.route(
    '/query_tool/start/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='query_tool_start'
)
@login_required
def start_query_tool(trans_id):
    """
    This method is used to execute query using asynchronous connection.

    Args:
        trans_id: unique transaction id
    """

    sql = extract_sql_from_network_parameters(
        request.data, request.args, request.form
    )

    connect = 'connect' in request.args and request.args['connect'] == '1'

    return StartRunningQuery(blueprint, current_app.logger).execute(
        sql, trans_id, session, connect
    )


def extract_sql_from_network_parameters(request_data, request_arguments,
                                        request_form_data):
    if request_data:
        sql_parameters = json.loads(request_data)

        if isinstance(sql_parameters, str):
            return dict(sql=str(sql_parameters), explain_plan=None)
        return sql_parameters
    else:
        return request_arguments or request_form_data


@blueprint.route('/poll/<int:trans_id>', methods=["GET"], endpoint='poll')
@login_required
def poll(trans_id):
    """
    This method polls the result of the asynchronous query and returns
    the result.

    Args:
        trans_id: unique transaction id
    """
    result = None
    rows_affected = 0
    rows_fetched_from = 0
    rows_fetched_to = 0
    has_more_rows = False
    columns = dict()
    columns_info = None
    primary_keys = None
    types = {}
    client_primary_key = None
    has_oids = False
    oids = None
    additional_messages = None
    notifies = None
    data_obj = {}
    on_demand_record_count = Preferences.module(MODULE_NAME).\
        preference('on_demand_record_count').get()
    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if type(error_msg) is Response:
        return error_msg

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    is_thread_alive = False
    if trans_obj.get_thread_native_id():
        for thread in threading.enumerate():
            _native_id = thread.native_id if hasattr(thread, 'native_id'
                                                     ) else thread.ident
            if _native_id == trans_obj.get_thread_native_id() and\
                    thread.is_alive():
                is_thread_alive = True
                break

    if is_thread_alive:
        status = 'Busy'
        messages = conn.messages()
        if messages and len(messages) > 0:
            result = ''.join(messages)
    elif status and conn is not None and session_obj is not None:
        status, result = conn.poll(
            formatted_exception_msg=True, no_result=True)
        if not status:
            if not conn.connected():
                return service_unavailable(
                    gettext("Connection to the server has been lost."),
                    info="CONNECTION_LOST",
                )

            messages = conn.messages()
            if messages and len(messages) > 0:
                additional_messages = ''.join(messages)
                result = '{0}\n{1}\n\n{2}'.format(
                    additional_messages,
                    gettext('******* Error *******'),
                    result
                )
            return internal_server_error(result)
        elif status == ASYNC_OK:
            status = 'Success'
            rows_affected = conn.rows_affected()

            # if transaction object is instance of QueryToolCommand
            # and transaction aborted for some reason then issue a
            # rollback to cleanup
            if isinstance(trans_obj, QueryToolCommand):
                trans_status = conn.transaction_status()
                if trans_status == TX_STATUS_INERROR and \
                        trans_obj.auto_rollback:
                    conn.execute_void("ROLLBACK;")

            st, result = conn.async_fetchmany_2darray(on_demand_record_count)

            # There may be additional messages even if result is present
            # eg: Function can provide result as well as RAISE messages
            messages = conn.messages()
            if messages:
                additional_messages = ''.join(messages)
            notifies = conn.get_notifies()

            if st:
                if 'primary_keys' in session_obj:
                    primary_keys = session_obj['primary_keys']

                # Fetch column information
                columns_info = conn.get_column_info()
                client_primary_key = generate_client_primary_key_name(
                    columns_info
                )
                session_obj['client_primary_key'] = client_primary_key

                # If trans_obj is a QueryToolCommand then check for updatable
                # resultsets and primary keys
                if isinstance(trans_obj, QueryToolCommand) and \
                        trans_obj.check_updatable_results_pkeys_oids():
                    pk_names, primary_keys = trans_obj.get_primary_keys()
                    session_obj['has_oids'] = trans_obj.has_oids()
                    # Update command_obj in session obj
                    session_obj['command_obj'] = pickle.dumps(
                        trans_obj, -1)
                    # If primary_keys exist, add them to the session_obj to
                    # allow for saving any changes to the data
                    if primary_keys is not None:
                        session_obj['primary_keys'] = primary_keys

                if 'has_oids' in session_obj:
                    has_oids = session_obj['has_oids']
                    if has_oids:
                        oids = {'oid': 'oid'}

                if columns_info is not None:
                    # Only QueryToolCommand or TableCommand can be editable
                    if hasattr(trans_obj, 'obj_id') and trans_obj.can_edit():
                        columns = trans_obj.get_columns_types(conn)

                    else:
                        for col in columns_info:
                            col_type = dict()
                            col_type['type_code'] = col['type_code']
                            col_type['type_name'] = None
                            col_type['internal_size'] = col['internal_size']
                            col_type['display_size'] = col['display_size']
                            columns[col['name']] = col_type

                if columns:
                    st, types = fetch_pg_types(columns, trans_obj)

                    if not st:
                        return internal_server_error(types)

                    for col_name, col_info in columns.items():
                        for col_type in types:
                            if col_type['oid'] == col_info['type_code']:
                                typname = col_type['typname']
                                col_info['type_name'] = typname

                        # Using characters %, (, ) in the argument names is not
                        # supported in psycopg
                        col_info['pgadmin_alias'] = \
                            re.sub("[%()]+", "|", col_name).\
                            encode('unicode_escape').decode('utf-8')

                    session_obj['columns_info'] = columns

                # status of async_fetchmany_2darray is True and result is none
                # means nothing to fetch
                if result and rows_affected > -1:
                    res_len = len(result)
                    if res_len == on_demand_record_count:
                        has_more_rows = True

                    if res_len > 0:
                        rows_fetched_from = trans_obj.get_fetched_row_cnt()
                        trans_obj.update_fetched_row_cnt(
                            rows_fetched_from + res_len)
                        rows_fetched_from += 1
                        rows_fetched_to = trans_obj.get_fetched_row_cnt()
                        session_obj['command_obj'] = pickle.dumps(
                            trans_obj, -1)

                # As we changed the transaction object we need to
                # restore it and update the session variable.
                update_session_grid_transaction(trans_id, session_obj)

            # Procedure/Function output may comes in the form of Notices
            # from the database server, so we need to append those outputs
            # with the original result.
            if result is None:
                result = conn.status_message()
                if result is not None and additional_messages is not None:
                    result = additional_messages + result
                else:
                    result = result if result is not None \
                        else additional_messages

        elif status == ASYNC_EXECUTION_ABORTED:
            status = 'Cancel'
        else:
            status = 'Busy'
            messages = conn.messages()
            if messages and len(messages) > 0:
                result = ''.join(messages)

    else:
        status = 'NotConnected'
        result = error_msg

    transaction_status = conn.transaction_status() if conn else 0
    data_obj['db_name'] = conn.db if conn else None

    data_obj['db_id'] = trans_obj.did \
        if trans_obj is not None and hasattr(trans_obj, 'did') else 0

    return make_json_response(
        data={
            'status': status, 'result': result,
            'rows_affected': rows_affected,
            'rows_fetched_from': rows_fetched_from,
            'rows_fetched_to': rows_fetched_to,
            'additional_messages': additional_messages,
            'notifies': notifies,
            'has_more_rows': has_more_rows,
            'colinfo': columns_info,
            'primary_keys': primary_keys,
            'types': types,
            'client_primary_key': client_primary_key,
            'has_oids': has_oids,
            'oids': oids,
            'transaction_status': transaction_status,
            'data_obj': data_obj,
        }
    )


@blueprint.route(
    '/fetch/<int:trans_id>', methods=["GET"], endpoint='fetch'
)
@blueprint.route(
    '/fetch/<int:trans_id>/<int:fetch_all>', methods=["GET"],
    endpoint='fetch_all'
)
@login_required
def fetch(trans_id, fetch_all=None):
    result = None
    has_more_rows = False
    rows_fetched_from = 0
    rows_fetched_to = 0
    on_demand_record_count = Preferences.module(MODULE_NAME).preference(
        'on_demand_record_count').get()
    fetch_row_cnt = -1 if fetch_all == 1 else on_demand_record_count

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and session_obj is not None:
        status, result = conn.async_fetchmany_2darray(fetch_row_cnt)
        if not status:
            status = 'Error'
        else:
            status = 'Success'
            res_len = len(result) if result else 0
            if fetch_row_cnt != -1 and res_len == on_demand_record_count:
                has_more_rows = True

            if res_len:
                rows_fetched_from = trans_obj.get_fetched_row_cnt()
                trans_obj.update_fetched_row_cnt(rows_fetched_from + res_len)
                rows_fetched_from += 1
                rows_fetched_to = trans_obj.get_fetched_row_cnt()
                session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
                update_session_grid_transaction(trans_id, session_obj)
    else:
        status = 'NotConnected'
        result = error_msg

    return make_json_response(
        data={
            'status': status,
            'result': result,
            'has_more_rows': has_more_rows,
            'rows_fetched_from': rows_fetched_from,
            'rows_fetched_to': rows_fetched_to
        }
    )


@blueprint.route(
    '/fetch_all_from_start/<int:trans_id>/<int:limit>', methods=["GET"],
    endpoint='fetch_all_from_start'
)
@login_required
def fetch_all_from_start(trans_id, limit=-1):
    """
    This function is used to fetch all the records from start and reset
    the cursor back to it's previous position.
    """
    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and session_obj is not None:
        # Reset the cursor to start to fetch all the records.
        conn.reset_cursor_at(0)

        status, result = conn.async_fetchmany_2darray(limit)
        if not status:
            status = 'Error'
        else:
            status = 'Success'

        # Reset the cursor back to it's actual position
        conn.reset_cursor_at(trans_obj.get_fetched_row_cnt())
    else:
        status = 'NotConnected'
        result = error_msg

    return make_json_response(
        data={
            'status': status,
            'result': result
        }
    )


def fetch_pg_types(columns_info, trans_obj):
    """
    This method is used to fetch the pg types, which is required
    to map the data type comes as a result of the query.

    Args:
        columns_info:
    """

    # get the default connection as current connection attached to trans id
    # holds the cursor which has query result so we cannot use that connection
    # to execute another query otherwise we'll lose query result.

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
    default_conn = manager.connection(conn_id=trans_obj.conn_id,
                                      did=trans_obj.did)

    # Connect to the Server if not connected.
    res = []
    if not default_conn.connected():
        status, msg = default_conn.connect()
        if not status:
            return status, msg

    oids = [columns_info[col]['type_code'] for col in columns_info]

    if oids:
        status, res = default_conn.execute_dict(
            "SELECT oid, pg_catalog.format_type(oid, NULL) AS typname FROM "
            "pg_catalog.pg_type WHERE oid = ANY(%s) ORDER BY oid;", [oids]
        )

        if not status:
            return False, res

        return status, res['rows']
    else:
        return True, []


def generate_client_primary_key_name(columns_info):
    temp_key = '__temp_PK'
    if not columns_info:
        return temp_key

    initial_temp_key_len = len(temp_key)
    duplicate = False
    suffix = 1
    while True:
        for col in columns_info:
            if col['name'] == temp_key:
                duplicate = True
                break
        if duplicate:
            if initial_temp_key_len == len(temp_key):
                temp_key += str(suffix)
                suffix += 1
            else:
                temp_key = temp_key[:-1] + str(suffix)
                suffix += 1
            duplicate = False
        else:
            break
    return temp_key


def _check_and_connect(trans_obj):
    """
    Check and connect to the database for transaction.
    :param trans_obj: Transaction object.
    :return: If any error return error with error msg,
    if not then return connection object.
    """
    manager = get_driver(
        PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
    if hasattr(trans_obj, 'conn_id'):
        conn = manager.connection(did=trans_obj.did,
                                  conn_id=trans_obj.conn_id)
    else:
        conn = manager.connection(did=trans_obj.did)  # default connection

    # Connect to the Server if not connected.
    if not conn.connected():
        status, msg = conn.connect()
        if not status:
            return True, msg, conn
    return False, '', conn


@blueprint.route(
    '/save/<int:trans_id>', methods=["PUT", "POST"], endpoint='save'
)
@login_required
def save(trans_id):
    """
    This method is used to save the data changes to the server

    Args:
        trans_id: unique transaction id
    """
    if request.data:
        changed_data = json.loads(request.data)
    else:
        changed_data = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        # If there is no primary key found then return from the function.
        if ('primary_keys' not in session_obj or
            len(session_obj['primary_keys']) <= 0 or
                len(changed_data) <= 0) and 'has_oids' not in session_obj:
            return make_json_response(
                data={
                    'status': False,
                    'result': gettext('No primary key found for this object, '
                                      'so unable to save records.')
                }
            )

        is_error, errmsg, conn = _check_and_connect(trans_obj)
        if is_error:
            return make_json_response(
                data={'status': status, 'result': "{}".format(errmsg)}
            )

        status, res, query_results, _rowid = trans_obj.save(
            changed_data,
            session_obj['columns_info'],
            session_obj['client_primary_key'],
            conn)
    else:
        status = False
        res = error_msg
        query_results = None
        _rowid = None

    transaction_status = conn.transaction_status()

    return make_json_response(
        data={
            'status': status,
            'result': res,
            'query_results': query_results,
            '_rowid': _rowid,
            'transaction_status': transaction_status
        }
    )


@blueprint.route(
    '/filter/inclusive/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='inclusive_filter'
)
@login_required
def append_filter_inclusive(trans_id):
    """
    This method is used to append and apply the filter.

    Args:
        trans_id: unique transaction id
    """
    if request.data:
        filter_data = json.loads(request.data)
    else:
        filter_data = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        res = None
        filter_sql = ''
        driver = get_driver(PG_DEFAULT_DRIVER)

        for column_name in filter_data:
            column_value = filter_data[column_name]
            if column_value is None:
                filter_sql = driver.qtIdent(conn, column_name) + ' IS NULL '
            else:
                filter_sql = driver.qtIdent(
                    conn, column_name
                ) + ' = ' + driver.qtLiteral(column_value, conn)

        trans_obj.append_filter(filter_sql)

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route(
    '/filter/exclusive/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='exclusive_filter'
)
@login_required
def append_filter_exclusive(trans_id):
    """
    This method is used to append and apply the filter.

    Args:
        trans_id: unique transaction id
    """
    if request.data:
        filter_data = json.loads(request.data)
    else:
        filter_data = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)
    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        res = None
        filter_sql = ''
        driver = get_driver(PG_DEFAULT_DRIVER)

        for column_name in filter_data:
            column_value = filter_data[column_name]
            if column_value is None:
                filter_sql = driver.qtIdent(
                    conn, column_name) + ' IS NOT NULL '
            else:
                filter_sql = driver.qtIdent(
                    conn, column_name
                ) + ' IS DISTINCT FROM ' + driver.qtLiteral(column_value, conn)

        # Call the append_filter method of transaction object
        trans_obj.append_filter(filter_sql)

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route(
    '/filter/remove/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='remove_filter'
)
@login_required
def remove_filter(trans_id):
    """
    This method is used to remove the filter.

    Args:
        trans_id: unique transaction id
    """

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        res = None

        # Call the remove_filter method of transaction object
        trans_obj.remove_filter()

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route(
    '/limit/<int:trans_id>', methods=["PUT", "POST"], endpoint='set_limit'
)
@login_required
def set_limit(trans_id):
    """
    This method is used to set the limit for the SQL.

    Args:
        trans_id: unique transaction id
    """
    if request.data:
        limit = json.loads(request.data)
    else:
        limit = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        res = None

        # Call the set_limit method of transaction object
        trans_obj.set_limit(limit)

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


def _check_for_transaction_before_cancel(trans_id):
    """
    Check if transaction exists or not before cancel it.
    :param trans_id: Transaction ID for check.
    :return: return error is transaction not found, else return grid data.
    """

    if 'gridData' not in session:
        return True, ''

    grid_data = session['gridData']

    # Return from the function if transaction id not found
    if str(trans_id) not in grid_data:
        return True, ''

    return False, grid_data


def _check_and_cancel_transaction(trans_obj, delete_connection, conn, manager):
    """
    Check for connection and cancel current transaction.
    :param trans_obj: transaction object for cancel.
    :param delete_connection: Flag for remove connection.
    :param conn: Connection
    :param manager: Manager
    :return: Return status and result of transaction cancel.
    """
    if conn.connected():
        # on successful connection cancel the running transaction
        status, result = conn.cancel_transaction(
            trans_obj.conn_id, trans_obj.did)

        # Delete connection if we have created it to
        # cancel the transaction
        if delete_connection:
            manager.release(did=trans_obj.did)
    else:
        status = False
        result = SERVER_CONNECTION_CLOSED
    return status, result


@blueprint.route(
    '/cancel/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='cancel_transaction'
)
@login_required
def cancel_transaction(trans_id):
    """
    This method is used to cancel the running transaction

    Args:
        trans_id: unique transaction id
    """
    is_error, grid_data = _check_for_transaction_before_cancel(trans_id)
    if is_error:
        return make_json_response(
            success=0,
            errormsg=ERROR_MSG_TRANS_ID_NOT_FOUND,
            info='DATAGRID_TRANSACTION_REQUIRED', status=404)

    # Fetch the object for the specified transaction id.
    # Use pickle.loads function to get the command object
    session_obj = grid_data[str(trans_id)]
    trans_obj = pickle.loads(session_obj['command_obj'])

    if trans_obj is not None and session_obj is not None:

        # Fetch the main connection object for the database.
        try:
            manager = get_driver(
                PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
            conn = manager.connection(**({"database": trans_obj.dbname}
                                         if trans_obj.dbname is not None
                                         else {"did": trans_obj.did}))

        except Exception as e:
            return internal_server_error(errormsg=str(e))

        delete_connection = False

        # Connect to the Server if not connected.
        if not conn.connected():
            status, msg = conn.connect()
            if not status:
                return internal_server_error(errormsg=str(msg))
            delete_connection = True

        status, result = _check_and_cancel_transaction(trans_obj,
                                                       delete_connection, conn,
                                                       manager)
    else:
        status = False
        result = gettext(
            'Either transaction object or session object not found.')

    return make_json_response(
        data={
            'status': status, 'result': result
        }
    )


@blueprint.route(
    '/object/get/<int:trans_id>',
    methods=["GET"], endpoint='get_object_name'
)
@login_required
def get_object_name(trans_id):
    """
    This method is used to get the object name

    Args:
        trans_id: unique transaction id
    """

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:
        res = trans_obj.object_name
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route(
    '/auto_commit/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='auto_commit'
)
@login_required
def set_auto_commit(trans_id):
    """
    This method is used to set the value for auto commit .

    Args:
        trans_id: unique transaction id
    """
    if request.data:
        auto_commit = json.loads(request.data)
    else:
        auto_commit = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        res = None

        # Call the set_auto_commit method of transaction object
        trans_obj.set_auto_commit(auto_commit)

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route(
    '/auto_rollback/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='auto_rollback'
)
@login_required
def set_auto_rollback(trans_id):
    """
    This method is used to set the value for auto commit .

    Args:
        trans_id: unique transaction id
    """
    if request.data:
        auto_rollback = json.loads(request.data)
    else:
        auto_rollback = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        res = None

        # Call the set_auto_rollback method of transaction object
        trans_obj.set_auto_rollback(auto_rollback)

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route(
    '/autocomplete/<int:trans_id>',
    methods=["PUT", "POST"], endpoint='autocomplete'
)
@login_required
def auto_complete(trans_id):
    """
    This method implements the autocomplete feature.

    Args:
        trans_id: unique transaction id
    """
    full_sql = ''
    text_before_cursor = ''

    if request.data:
        data = json.loads(request.data)
    else:
        data = request.args or request.form

    if len(data) > 0:
        full_sql = data[0]
        text_before_cursor = data[1]

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id, auto_comp=True)

    if error_msg == ERROR_MSG_TRANS_ID_NOT_FOUND:
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
            trans_obj is not None and session_obj is not None:

        with sqleditor_close_session_lock:
            if trans_id not in auto_complete_objects:
                # Create object of SQLAutoComplete class and pass
                # connection object
                auto_complete_objects[trans_id] = \
                    SQLAutoComplete(sid=trans_obj.sid, did=trans_obj.did,
                                    conn=conn)

            auto_complete_obj = auto_complete_objects[trans_id]
            # # Get the auto completion suggestions.
            res = auto_complete_obj.get_completions(full_sql,
                                                    text_before_cursor)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route("/sqleditor.js")
@login_required
def script():
    """render the required javascript"""
    return Response(
        response=render_template(
            "sqleditor/js/sqleditor.js",
            tab_size=blueprint.tab_size.get(),
            use_spaces=blueprint.use_spaces.get(),
            _=gettext
        ),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


@blueprint.route('/load_file/', methods=["PUT", "POST"], endpoint='load_file')
@login_required
def load_file():
    """
    This function gets name of file from request data
    reads the data and sends back in response
    """
    if request.data:
        file_data = json.loads(request.data)

    file_path = unquote(file_data['file_name'])

    # get the current storage from request if available
    # or get it from last_storage preference.
    if 'storage' in file_data:
        storage_folder = file_data['storage']
    else:
        storage_folder = Preferences.module('file_manager').preference(
            'last_storage').get()

    # retrieve storage directory path
    storage_manager_path = get_storage_directory(
        shared_storage=storage_folder)

    try:
        Filemanager.check_access_permission(storage_manager_path, file_path)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    if storage_manager_path:
        # generate full path of file
        file_path = os.path.join(
            storage_manager_path,
            file_path.lstrip('/').lstrip('\\')
        )

    (status, err_msg, is_binary,
     is_startswith_bom, enc) = Filemanager.check_file_for_bom_and_binary(
        file_path
    )

    if not status:
        return internal_server_error(
            errormsg=gettext(err_msg)
        )

    if is_binary:
        return internal_server_error(
            errormsg=gettext("File type not supported")
        )

    return Response(read_file_generator(file_path, enc), mimetype='text/plain')


@blueprint.route('/save_file/', methods=["PUT", "POST"], endpoint='save_file')
@login_required
def save_file():
    """
    This function retrieves file_name and data from request.
    and then save the data to the file
    """
    if request.data:
        file_data = json.loads(request.data)

    # retrieve storage directory path
    last_storage = Preferences.module('file_manager').preference(
        'last_storage').get()
    if last_storage != MY_STORAGE:
        selected_dir_list = [sdir for sdir in SHARED_STORAGE if
                             sdir['name'] == last_storage]
        selected_dir = selected_dir_list[0] if len(
            selected_dir_list) == 1 else None

        if selected_dir and selected_dir['restricted_access'] and \
                not current_user.has_role("Administrator"):
            return make_json_response(success=0,
                                      errormsg=ACCESS_DENIED_MESSAGE,
                                      info='ACCESS_DENIED',
                                      status=403)
        storage_manager_path = get_storage_directory(
            shared_storage=last_storage)
    else:
        storage_manager_path = get_storage_directory()

    # generate full path of file
    file_path = unquote(file_data['file_name'])

    try:
        Filemanager.check_access_permission(storage_manager_path, file_path)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    if storage_manager_path is not None:
        file_path = os.path.join(
            storage_manager_path,
            file_path.lstrip('/').lstrip('\\')
        )

    # Get value for encoding if file is already loaded to SQL editor
    def get_file_encoding_of_loaded_file(file_name):
        encoding = 'utf-8'
        for ele in Filemanager.loaded_file_encoding_list:
            if file_name in ele:
                encoding = ele[file_name]
        return encoding

    enc = get_file_encoding_of_loaded_file(os.path.basename(file_path))

    file_content = file_data['file_content'].encode(enc)
    error_str = gettext("Error: {0}")

    # write to file
    try:
        with open(file_path, 'wb+') as output_file:
            output_file.write(file_content)
    except IOError as e:
        err_msg = error_str.format(e.strerror)
        return internal_server_error(errormsg=err_msg)
    except Exception as e:
        err_msg = error_str.format(e.strerror)
        return internal_server_error(errormsg=err_msg)

    return make_json_response(
        data={
            'status': True,
        }
    )


@blueprint.route(
    '/query_tool/download/<int:trans_id>',
    methods=["POST"],
    endpoint='query_tool_download'
)
@login_required
def start_query_download_tool(trans_id):
    (status, error_msg, sync_conn, trans_obj,
     session_obj) = check_transaction_status(trans_id)

    if not status or sync_conn is None or trans_obj is None or \
            session_obj is None:
        return internal_server_error(
            errormsg=TRANSACTION_STATUS_CHECK_FAILED
        )

    data = request.values if request.values else request.get_json(silent=True)
    if data is None:
        return make_json_response(
            status=410,
            success=0,
            errormsg=gettext(
                "Could not find the required parameter (query)."
            )
        )

    try:

        # This returns generator of records.
        status, gen, conn_obj = \
            sync_conn.execute_on_server_as_csv(records=10)

        if not status:
            return make_json_response(
                data={
                    'status': status, 'result': gen
                }
            )

        r = Response(
            gen(conn_obj,
                trans_obj,
                quote=blueprint.csv_quoting.get(),
                quote_char=blueprint.csv_quote_char.get(),
                field_separator=blueprint.csv_field_separator.get(),
                replace_nulls_with=blueprint.replace_nulls_with.get()),
            mimetype='text/csv' if
            blueprint.csv_field_separator.get() == ','
            else 'text/plain'
        )

        import time
        extn = 'csv' if blueprint.csv_field_separator.get() == ',' else 'txt'
        filename = data['filename'] if data.get('filename', '') != "" else \
            '{0}.{1}'.format(int(time.time()), extn)

        # We will try to encode report file name with latin-1
        # If it fails then we will fallback to default ascii file name
        # werkzeug only supports latin-1 encoding supported values
        try:
            tmp_file_name = filename
            tmp_file_name.encode('latin-1', 'strict')
        except UnicodeEncodeError:
            filename = "download.csv"

        r.headers[
            "Content-Disposition"
        ] = "attachment;filename={0}".format(filename)

        return r
    except (ConnectionLost, SSHTunnelConnectionLost):
        raise
    except Exception as e:
        current_app.logger.error(e)
        err_msg = "Error: {0}".format(
            e.strerror if hasattr(e, 'strerror') else str(e))
        return internal_server_error(errormsg=err_msg)


@blueprint.route(
    '/status/<int:trans_id>',
    methods=["GET"],
    endpoint='connection_status'
)
@login_required
def query_tool_status(trans_id):
    """
    The task of this function to return the status of the current connection
    used in query tool instance with given transaction ID.
    Args:
        trans_id: Transaction ID

    Returns:
        Response with the connection status

        Psycopg Status Code Mapping:
        -----------------------------
        TRANSACTION_STATUS_IDLE     = 0
        TRANSACTION_STATUS_ACTIVE   = 1
        TRANSACTION_STATUS_INTRANS  = 2
        TRANSACTION_STATUS_INERROR  = 3
        TRANSACTION_STATUS_UNKNOWN  = 4
    """
    (status, error_msg, conn, trans_obj,
     session_obj) = check_transaction_status(trans_id)

    if not status and error_msg and isinstance(error_msg, str):
        return internal_server_error(
            errormsg=error_msg
        )

    if conn and trans_obj and session_obj:
        status = conn.transaction_status()

        if status is not None:
            # Check for the asynchronous notifies statements.
            notifies = conn.get_notifies()

            return make_json_response(
                data={
                    'status': status,
                    'message': gettext(
                        CONNECTION_STATUS_MESSAGE_MAPPING.get(status),
                    ),
                    'notifies': notifies
                }
            )
        else:
            return internal_server_error(
                errormsg=TRANSACTION_STATUS_CHECK_FAILED
            )
    else:
        return internal_server_error(
            errormsg=TRANSACTION_STATUS_CHECK_FAILED
        )


@blueprint.route(
    '/filter_dialog/<int:trans_id>',
    methods=["GET"], endpoint='get_filter_data'
)
@login_required
def get_filter_data(trans_id):
    """
    This method is used to get all the columns for data sorting dialog.

    Args:
        trans_id: unique transaction id
    """

    status, error_msg, conn, trans_obj, session_ob = \
        check_transaction_status(trans_id)

    return FilterDialog.get(status, error_msg, conn, trans_obj, session_ob)


@blueprint.route(
    '/get_server_connection/<int:sgid>/<int:sid>',
    methods=["GET"], endpoint='_check_server_connection_status'
)
@login_required
def _check_server_connection_status(sgid, sid=None):
    """
    This function returns the server connection details
    """
    try:
        driver = get_driver(PG_DEFAULT_DRIVER)
        from pgadmin.browser.server_groups.servers import \
            server_icon_and_background
        server = Server.query.filter_by(
            id=sid).first()

        manager = driver.connection_manager(server.id)
        conn = manager.connection()
        connected = conn.connected()

        msg = "Success"
        return make_json_response(
            data={
                'status': True,
                'msg': msg,
                'result': {
                    'server': connected
                }
            }
        )

    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            data={
                'status': False,
                'msg': ERROR_FETCHING_DATA,
                'result': {
                    'server': False
                }
            }
        )


@blueprint.route(
    '/new_connection_dialog/<int:sgid>/<int:sid>',
    methods=["GET"], endpoint='get_new_connection_data'
)
@blueprint.route(
    '/new_connection_dialog',
    methods=["GET"], endpoint='get_new_connection_servers'
)
@login_required
def get_new_connection_data(sgid=None, sid=None):
    """
    This method is used to get required data for get new connection.
    :extract_sql_from_network_parameters,
    """
    try:
        driver = get_driver(PG_DEFAULT_DRIVER)
        from pgadmin.browser.server_groups.servers import \
            server_icon_and_background
        server_groups = ServerGroup.query.all()
        server_group_data = {server_group.name: [] for server_group in
                             server_groups}
        servers = Server.query.all()

        for server in servers:
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()
            server_group_data[server.servers.name].append({
                'label': server.name,
                "value": server.id,
                'image': server_icon_and_background(connected, manager,
                                                    server),
                'fgcolor': server.fgcolor,
                'bgcolor': server.bgcolor,
                'connected': connected})

        msg = "Success"
        return make_json_response(
            data={
                'status': True,
                'msg': msg,
                'result': {
                    'server_list': server_group_data
                }
            }
        )

    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            data={
                'status': False,
                'msg': ERROR_FETCHING_DATA,
                'result': {
                    'server_list': []
                }
            }
        )


@blueprint.route(
    '/new_connection_database/<int:sgid>/<int:sid>',
    methods=["GET"], endpoint='get_new_connection_database'
)
@login_required
def get_new_connection_database(sgid, sid=None):
    """
    This method is used to get required data for get new connection.
    :extract_sql_from_network_parameters,
    """
    try:
        database_list = []
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        if conn.connected():
            is_connected = True
        else:
            is_connected = False
        if is_connected:
            if sid:
                template_path = 'databases/sql/#{0}#'.format(manager.version)
                last_system_oid = 0
                server_node_res = manager

                db_disp_res = None
                params = None
                if server_node_res and server_node_res.db_res:
                    db_disp_res = ", ".join(
                        ['%s'] * len(server_node_res.db_res.split(','))
                    )
                    params = tuple(server_node_res.db_res.split(','))
                sql = render_template(
                    "/".join([template_path, _NODES_SQL]),
                    last_system_oid=last_system_oid,
                    db_restrictions=db_disp_res
                )
                status, databases = conn.execute_dict(sql, params)
                _db = manager.db
                database_list = [
                    {
                        'label': database['name'],
                        'value': database['did'],
                        'selected': True if database['name'] == _db else False
                    } for database in databases['rows']]
            else:
                status = False

            msg = "Success"
            return make_json_response(
                data={
                    'status': status,
                    'msg': msg,
                    'result': {
                        'data': database_list,
                    }
                }
            )
        else:
            return make_json_response(
                data={
                    'status': False,
                    'msg': SERVER_CONNECTION_CLOSED,
                    'result': {
                        'database_list': [],
                    }
                }
            )
    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            data={
                'status': False,
                'msg': ERROR_FETCHING_DATA,
                'result': {
                    'database_list': [],
                }
            }
        )


@blueprint.route(
    '/new_connection_user/<int:sgid>/<int:sid>',
    methods=["GET"], endpoint='get_new_connection_user'
)
@login_required
def get_new_connection_user(sgid, sid=None):
    """
    This method is used to get required data for get new connection.
    :extract_sql_from_network_parameters,
    """
    try:
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        user_list = []
        if conn.connected():
            is_connected = True
        else:
            is_connected = False
        if is_connected:
            if sid:
                sql_path = 'roles/sql/#{0}#'.format(manager.version)
                status, users = conn.execute_2darray(
                    render_template(sql_path + _NODES_SQL)
                )
                _user = manager.user
                user_list = [
                    {'value': user['rolname'], 'label': user['rolname'],
                     'selected': True if user['rolname'] == _user else False}
                    for user in users['rows'] if user['rolcanlogin']]
            else:
                status = False

            msg = "Success"
            return make_json_response(
                data={
                    'status': status,
                    'msg': msg,
                    'result': {
                        'data': user_list,
                    }
                }
            )
        else:
            return make_json_response(
                data={
                    'status': False,
                    'msg': SERVER_CONNECTION_CLOSED,
                    'result': {
                        'user_list': [],
                    }
                }
            )
    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            data={
                'status': False,
                'msg': 'Unable to fetch data.',
                'result': {
                    'user_list': [],
                }
            }
        )


@blueprint.route(
    '/new_connection_role/<int:sgid>/<int:sid>',
    methods=["GET"], endpoint='get_new_connection_role'
)
@login_required
def get_new_connection_role(sgid, sid=None):
    """
    This method is used to get required data for get new connection.
    :extract_sql_from_network_parameters,
    """
    try:
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        role_list = []
        if conn.connected():
            is_connected = True
        else:
            is_connected = False
        if is_connected:
            if sid:
                sql_path = 'roles/sql/#{0}#'.format(manager.version)
                status, roles = conn.execute_2darray(
                    render_template(sql_path + _NODES_SQL)
                )
                role_list = [
                    {'value': role['rolname'], 'label': role['rolname']} for
                    role in roles['rows']]
            else:
                status = False

            msg = "Success"
            return make_json_response(
                data={
                    'status': status,
                    'msg': msg,
                    'result': {
                        'data': role_list,
                    }
                }
            )
        else:
            return make_json_response(
                data={
                    'status': False,
                    'msg': SERVER_CONNECTION_CLOSED,
                    'result': {
                        'user_list': [],
                    }
                }
            )
    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            data={
                'status': False,
                'msg': 'Unable to fetch data.',
                'result': {
                    'user_list': [],
                }
            }
        )


@blueprint.route(
    '/connect_server/<int:sid>',
    methods=["POST"],
    endpoint="connect_server"
)
@login_required
def connect_server(sid):
    # Check if server is already connected then no need to reconnect again.
    server = Server.query.filter_by(id=sid).first()
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(sid)

    conn = manager.connection()
    if conn.connected():
        return make_json_response(
            success=1,
            info=gettext("Server connected."),
            data={}
        )

    view = SchemaDiffRegistry.get_node_view('server')
    return view.connect(
        server.servergroup_id, sid
    )


@blueprint.route(
    '/filter_dialog/<int:trans_id>',
    methods=["PUT"], endpoint='set_filter_data'
)
@login_required
def set_filter_data(trans_id):
    """
    This method is used to update the columns for data sorting dialog.

    Args:
        trans_id: unique transaction id
    """

    status, error_msg, conn, trans_obj, session_ob = \
        check_transaction_status(trans_id)

    return FilterDialog.save(
        status, error_msg, conn, trans_obj, session_ob,
        request=request,
        trans_id=trans_id
    )


@blueprint.route(
    '/query_history/<int:trans_id>',
    methods=["POST"], endpoint='add_query_history'
)
@login_required
def add_query_history(trans_id):
    """
    This method adds to query history for user/server/database

    Args:
        sid: server id
        did: database id
    """

    status, error_msg, conn, trans_obj, session_ob = \
        check_transaction_status(trans_id)

    if not trans_obj:
        return make_json_response(
            data={
                'status': False,
            }
        )
    return QueryHistory.save(current_user.id, trans_obj.sid, conn.db,
                             request=request)


@blueprint.route(
    '/query_history/<int:trans_id>',
    methods=["DELETE"], endpoint='clear_query_history'
)
@login_required
def clear_query_history(trans_id):
    """
    This method returns clears history for user/server/database

    Args:
        sid: server id
        did: database id
    """

    status, error_msg, conn, trans_obj, session_ob = \
        check_transaction_status(trans_id)

    filter_json = request.get_json(silent=True)
    return QueryHistory.clear(current_user.id, trans_obj.sid, conn.db,
                              filter_json)


@blueprint.route(
    '/query_history/<int:trans_id>',
    methods=["GET"], endpoint='get_query_history'
)
@login_required
def get_query_history(trans_id):
    """
    This method returns query history for user/server/database

    Args:
        sid: server id
        did: database id
    """

    status, error_msg, conn, trans_obj, session_ob = \
        check_transaction_status(trans_id)

    return QueryHistory.get(current_user.id, trans_obj.sid, conn.db)


@blueprint.route(
    '/get_macros/<int:trans_id>',
    methods=["GET"], endpoint='get_macros'
)
@blueprint.route(
    '/get_macros/<int:macro_id>/<int:trans_id>',
    methods=["GET"], endpoint='get_macro'
)
@login_required
def macros(trans_id, macro_id=None, json_resp=True):
    """
    This method is used to get all the columns for data sorting dialog.

    Args:
        trans_id: unique transaction id
        macro_id: Macro id
    """

    status, error_msg, conn, trans_obj, session_ob = \
        check_transaction_status(trans_id)

    return get_macros(macro_id, json_resp)


@blueprint.route(
    '/set_macros/<int:trans_id>',
    methods=["PUT"], endpoint='set_macros'
)
@login_required
def update_macros(trans_id):
    """
    This method is used to get all the columns for data sorting dialog.

    Args:
        trans_id: unique transaction id
    """

    status, error_msg, conn, trans_obj, session_ob = \
        check_transaction_status(trans_id)

    return set_macros()
