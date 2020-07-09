##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the sqleditor frame."""
import os
import pickle
import sys
import re

import simplejson as json
from flask import Response, url_for, render_template, session, request, \
    current_app
from flask_babelex import gettext
from flask_security import login_required, current_user
from urllib.parse import unquote

from config import PG_DEFAULT_DRIVER, ON_DEMAND_RECORD_COUNT
from pgadmin.misc.file_manager import Filemanager
from pgadmin.tools.sqleditor.command import QueryToolCommand
from pgadmin.tools.sqleditor.utils.constant_definition import ASYNC_OK, \
    ASYNC_EXECUTION_ABORTED, \
    CONNECTION_STATUS_MESSAGE_MAPPING, TX_STATUS_INERROR
from pgadmin.tools.sqleditor.utils.start_running_query import StartRunningQuery
from pgadmin.tools.sqleditor.utils.update_session_grid_transaction import \
    update_session_grid_transaction
from pgadmin.utils import PgAdminModule
from pgadmin.utils import get_storage_directory
from pgadmin.utils.ajax import make_json_response, bad_request, \
    success_return, internal_server_error
from pgadmin.utils.driver import get_driver
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.exception import ConnectionLost, SSHTunnelConnectionLost,\
    CryptKeyMissing
from pgadmin.utils.sqlautocomplete.autocomplete import SQLAutoComplete
from pgadmin.tools.sqleditor.utils.query_tool_preferences import \
    register_query_tool_preferences
from pgadmin.tools.sqleditor.utils.query_tool_fs_utils import \
    read_file_generator
from pgadmin.tools.sqleditor.utils.filter_dialog import FilterDialog
from pgadmin.tools.sqleditor.utils.query_history import QueryHistory

MODULE_NAME = 'sqleditor'


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

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.sqleditor',
            'path': url_for('sqleditor.index') + "sqleditor",
            'when': None
        }]

    def get_panels(self):
        return []

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for sqleditor module
        """
        return [
            'sqleditor.view_data_start',
            'sqleditor.query_tool_start',
            'sqleditor.poll',
            'sqleditor.fetch',
            'sqleditor.fetch_all',
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
        ]

    def register_preferences(self):
        register_query_tool_preferences(self)


blueprint = SqlEditorModule(MODULE_NAME, __name__, static_url_path='/static')


@blueprint.route('/')
@login_required
def index():
    return bad_request(
        errormsg=gettext('This URL cannot be requested directly.')
    )


def check_transaction_status(trans_id):
    """
    This function is used to check the transaction id
    is available in the session object and connection
    status.

    Args:
        trans_id:

    Returns: status and connection object

    """

    if 'gridData' not in session:
        return False, gettext(
            'Transaction ID not found in the session.'
        ), None, None, None

    grid_data = session['gridData']

    # Return from the function if transaction id not found
    if str(trans_id) not in grid_data:
        return False, gettext(
            'Transaction ID not found in the session.'
        ), None, None, None

    # Fetch the object for the specified transaction id.
    # Use pickle.loads function to get the command object
    session_obj = grid_data[str(trans_id)]
    trans_obj = pickle.loads(session_obj['command_obj'])

    try:
        manager = get_driver(
            PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
        conn = manager.connection(
            did=trans_obj.did,
            conn_id=trans_obj.conn_id,
            auto_reconnect=False,
            use_binary_placeholder=True,
            array_to_string=True
        )
    except (ConnectionLost, SSHTunnelConnectionLost, CryptKeyMissing):
        raise
    except Exception as e:
        current_app.logger.error(e)
        return False, internal_server_error(errormsg=str(e)), None, None, None

    connect = True if 'connect' in request.args and \
                      request.args['connect'] == '1' else False

    if connect:
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

    if error_msg == gettext('Transaction ID not found in the session.'):
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
                data={'status': status, 'result': u"{}".format(msg)}
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
        try:
            status, result = conn.execute_async(sql)
        except (ConnectionLost, SSHTunnelConnectionLost) as e:
            raise
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
            'info_notifier_timeout': blueprint.info_notifier_timeout.get()
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
        sql_parameters = json.loads(request_data, encoding='utf-8')

        if type(sql_parameters) is str:
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

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and session_obj is not None:
        status, result = conn.poll(
            formatted_exception_msg=True, no_result=True)
        if not status:
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

            st, result = conn.async_fetchmany_2darray(ON_DEMAND_RECORD_COUNT)

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
                        # supported in psycopg2
                        col_info['pgadmin_alias'] = \
                            re.sub("[%()]+", "|", col_name)
                    session_obj['columns_info'] = columns

                # status of async_fetchmany_2darray is True and result is none
                # means nothing to fetch
                if result and rows_affected > -1:
                    res_len = len(result)
                    if res_len == ON_DEMAND_RECORD_COUNT:
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

    transaction_status = conn.transaction_status()

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
        },
        encoding=conn.python_encoding
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
    fetch_row_cnt = -1 if fetch_all == 1 else ON_DEMAND_RECORD_COUNT

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and session_obj is not None:
        status, result = conn.async_fetchmany_2darray(fetch_row_cnt)
        if not status:
            status = 'Error'
        else:
            status = 'Success'
            res_len = len(result)
            if fetch_row_cnt != -1 and res_len == ON_DEMAND_RECORD_COUNT:
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
        },
        encoding=conn.python_encoding
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
    default_conn = manager.connection(did=trans_obj.did)

    # Connect to the Server if not connected.
    res = []
    if not default_conn.connected():
        status, msg = default_conn.connect()
        if not status:
            return status, msg

    oids = [columns_info[col]['type_code'] for col in columns_info]

    if oids:
        status, res = default_conn.execute_dict(
            u"SELECT oid, format_type(oid, NULL) AS typname FROM pg_type "
            u"WHERE oid IN %s ORDER BY oid;", [tuple(oids)]
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
    while 1:
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
        changed_data = json.loads(request.data, encoding='utf-8')
    else:
        changed_data = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
       trans_obj is not None and session_obj is not None:

        # If there is no primary key found then return from the function.
        if ('primary_keys' not in session_obj or
           len(session_obj['primary_keys']) <= 0 or
           len(changed_data) <= 0) and \
           'has_oids' not in session_obj:
            return make_json_response(
                data={
                    'status': False,
                    'result': gettext('No primary key found for this object, '
                                      'so unable to save records.')
                }
            )

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
                return make_json_response(
                    data={'status': status, 'result': u"{}".format(msg)}
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
        },
        encoding=conn.python_encoding
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
        filter_data = json.loads(request.data, encoding='utf-8')
    else:
        filter_data = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
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
                ) + ' = ' + driver.qtLiteral(column_value)

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
        filter_data = json.loads(request.data, encoding='utf-8')
    else:
        filter_data = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
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
                ) + ' IS DISTINCT FROM ' + driver.qtLiteral(column_value)

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

    if error_msg == gettext('Transaction ID not found in the session.'):
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
        limit = json.loads(request.data, encoding='utf-8')
    else:
        limit = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
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

    if 'gridData' not in session:
        return make_json_response(
            success=0,
            errormsg=gettext('Transaction ID not found in the session.'),
            info='DATAGRID_TRANSACTION_REQUIRED', status=404)

    grid_data = session['gridData']

    # Return from the function if transaction id not found
    if str(trans_id) not in grid_data:
        return make_json_response(
            success=0,
            errormsg=gettext('Transaction ID not found in the session.'),
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
            conn = manager.connection(did=trans_obj.did)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

        delete_connection = False

        # Connect to the Server if not connected.
        if not conn.connected():
            status, msg = conn.connect()
            if not status:
                return internal_server_error(errormsg=str(msg))
            delete_connection = True

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
            result = gettext(
                'Not connected to server or connection with the server has '
                'been closed.'
            )
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

    if error_msg == gettext('Transaction ID not found in the session.'):
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
        auto_commit = json.loads(request.data, encoding='utf-8')
    else:
        auto_commit = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
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
        auto_rollback = json.loads(request.data, encoding='utf-8')
    else:
        auto_rollback = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
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
        data = json.loads(request.data, encoding='utf-8')
    else:
        data = request.args or request.form

    if len(data) > 0:
        full_sql = data[0]
        text_before_cursor = data[1]

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = \
        check_transaction_status(trans_id)

    if error_msg == gettext('Transaction ID not found in the session.'):
        return make_json_response(success=0, errormsg=error_msg,
                                  info='DATAGRID_TRANSACTION_REQUIRED',
                                  status=404)

    if status and conn is not None and \
       trans_obj is not None and session_obj is not None:

        # Create object of SQLAutoComplete class and pass connection object
        auto_complete_obj = SQLAutoComplete(
            sid=trans_obj.sid, did=trans_obj.did, conn=conn)

        # Get the auto completion suggestions.
        res = auto_complete_obj.get_completions(full_sql, text_before_cursor)
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
        mimetype="application/javascript"
    )


@blueprint.route('/load_file/', methods=["PUT", "POST"], endpoint='load_file')
@login_required
def load_file():
    """
    This function gets name of file from request data
    reads the data and sends back in reponse
    """
    if request.data:
        file_data = json.loads(request.data, encoding='utf-8')

    file_path = unquote(file_data['file_name'])
    if hasattr(str, 'decode'):
        file_path = unquote(
            file_data['file_name']
        ).encode('utf-8').decode('utf-8')

    # retrieve storage directory path
    storage_manager_path = get_storage_directory()
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
        file_data = json.loads(request.data, encoding='utf-8')

    # retrieve storage directory path
    storage_manager_path = get_storage_directory()

    # generate full path of file
    file_path = unquote(file_data['file_name'])
    if hasattr(str, 'decode'):
        file_path = unquote(
            file_data['file_name']
        ).encode('utf-8').decode('utf-8')

    try:
        Filemanager.check_access_permission(storage_manager_path, file_path)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    if storage_manager_path is not None:
        file_path = os.path.join(
            storage_manager_path,
            file_path.lstrip('/').lstrip('\\')
        )

    if hasattr(str, 'decode'):
        file_content = file_data['file_content']
    else:
        file_content = file_data['file_content'].encode()

    # write to file
    try:
        with open(file_path, 'wb+') as output_file:
            if hasattr(str, 'decode'):
                output_file.write(file_content.encode('utf-8'))
            else:
                output_file.write(file_content)
    except IOError as e:
        err_msg = gettext("Error: {0}").format(e.strerror)
        return internal_server_error(errormsg=err_msg)
    except Exception as e:
        err_msg = gettext("Error: {0}").format(e.strerror)
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
    sync_conn = None
    (status, error_msg, sync_conn, trans_obj,
     session_obj) = check_transaction_status(trans_id)

    if status and sync_conn is not None and \
       trans_obj is not None and session_obj is not None:

        data = request.values if request.values else None
        try:
            if data and 'query' in data:
                sql = data['query']

                # This returns generator of records.
                status, gen = sync_conn.execute_on_server_as_csv(
                    sql, records=2000
                )

                if not status:
                    return make_json_response(
                        data={
                            'status': status, 'result': gen
                        }
                    )

                r = Response(
                    gen(
                        quote=blueprint.csv_quoting.get(),
                        quote_char=blueprint.csv_quote_char.get(),
                        field_separator=blueprint.csv_field_separator.get(),
                        replace_nulls_with=blueprint.replace_nulls_with.get()
                    ),
                    mimetype='text/csv' if
                    blueprint.csv_field_separator.get() == ','
                    else 'text/plain'
                )

                if 'filename' in data and data['filename'] != "":
                    filename = data['filename']
                else:
                    import time
                    filename = '{0}.{1}'. \
                        format(int(time.time()), 'csv' if blueprint.
                               csv_field_separator.get() == ',' else 'txt')

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
    else:
        return internal_server_error(
            errormsg=gettext("Transaction status check failed.")
        )


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

        Psycopg2 Status Code Mapping:
        -----------------------------
        TRANSACTION_STATUS_IDLE     = 0
        TRANSACTION_STATUS_ACTIVE   = 1
        TRANSACTION_STATUS_INTRANS  = 2
        TRANSACTION_STATUS_INERROR  = 3
        TRANSACTION_STATUS_UNKNOWN  = 4
    """
    (status, error_msg, conn, trans_obj,
     session_obj) = check_transaction_status(trans_id)

    if not status and error_msg and type(error_msg) == str:
        return internal_server_error(
            errormsg=error_msg
        )

    if conn and trans_obj and session_obj:
        status = conn.transaction_status()

        if status is not None:
            # Check for the asynchronous notifies statements.
            conn.check_notifies(True)
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
                errormsg=gettext("Transaction status check failed.")
            )
    else:
        return internal_server_error(
            errormsg=gettext("Transaction status check failed.")
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

    return QueryHistory.clear(current_user.id, trans_obj.sid, conn.db)


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
