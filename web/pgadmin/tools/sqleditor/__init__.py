##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the sqleditor frame."""
MODULE_NAME = 'sqleditor'

import simplejson as json
import os
import pickle
import random

from flask import Response, url_for, render_template, session, request
from flask_babel import gettext
from flask_security import login_required
from pgadmin.tools.sqleditor.command import QueryToolCommand
from pgadmin.utils import PgAdminModule
from pgadmin.utils import get_storage_directory
from pgadmin.utils.ajax import make_json_response, bad_request, \
    success_return, internal_server_error
from pgadmin.utils.driver import get_driver
from pgadmin.utils.sqlautocomplete.autocomplete import SQLAutoComplete

from config import PG_DEFAULT_DRIVER

# import unquote from urlib for python2.x and python3.x
try:
    from urllib import unquote
except Exception as e:
    from urllib.parse import unquote

# Async Constants
ASYNC_OK = 1
ASYNC_READ_TIMEOUT = 2
ASYNC_WRITE_TIMEOUT = 3
ASYNC_NOT_CONNECTED = 4
ASYNC_EXECUTION_ABORTED = 5

# Transaction status constants
TX_STATUS_IDLE = 0
TX_STATUS__ACTIVE = 1
TX_STATUS_INTRANS = 2
TX_STATUS_INERROR = 3


class SqlEditorModule(PgAdminModule):
    """
    class SqlEditorModule(PgAdminModule)

        A module class for SQL Grid derived from PgAdminModule.
    """

    LABEL = gettext("SQL Editor")

    def get_own_menuitems(self):
        return {}

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.sqleditor',
            'path': url_for('sqleditor.index') + "sqleditor",
            'when': None
        }]

    def get_panels(self):
        return []

    def register_preferences(self):
        self.items_per_page = self.preference.register(
            'display', 'items_per_page',
            gettext("Items per page in grid"), 'integer', 50,
            category_label=gettext('Display'),
            min_val=50,
            max_val=2000,
            help_str=gettext('The number of rows to display per page in the results grid. '
                             'Value should be between 50 and 2000.')
        )

        self.info_notifier_timeout = self.preference.register(
            'display', 'info_notifier_timeout',
            gettext("Query info notifier timeout"), 'integer', 5,
            category_label=gettext('Display'),
            min_val=-1,
            max_val=999999,
            help_str=gettext('The length of time to display the query info notifier after execution has completed. '
                             'A value of -1 disables the notifier and a value of 0 displays it until clicked. '
                             'Values greater than 1 display the notifier for the number of seconds specified.')
        )

        self.explain_verbose = self.preference.register(
            'Explain', 'explain_verbose',
            gettext("Verbose output?"), 'boolean', False,
            category_label=gettext('Explain')
        )

        self.explain_costs = self.preference.register(
            'Explain', 'explain_costs',
            gettext("Show costs?"), 'boolean', False,
            category_label=gettext('Explain')
        )

        self.explain_buffers = self.preference.register(
            'Explain', 'explain_buffers',
            gettext("Show buffers?"), 'boolean', False,
            category_label=gettext('Explain')
        )

        self.explain_timing = self.preference.register(
            'Explain', 'explain_timing',
            gettext("Show timing"), 'boolean', False,
            category_label=gettext('Explain')
        )

        self.auto_commit = self.preference.register(
            'Options', 'auto_commit',
            gettext("Auto commit?"), 'boolean', True,
            category_label=gettext('Options')
        )

        self.auto_rollback = self.preference.register(
            'Options', 'auto_rollback',
            gettext("Auto rollback?"), 'boolean', False,
            category_label=gettext('Options')
        )

        self.sql_font_size = self.preference.register(
            'Options', 'sql_font_size',
            gettext("Font size"), 'numeric', '1',
            min_val=0.1,
            max_val=10,
            category_label=gettext('Display'),
            help_str=gettext('The font size to use for the SQL text boxes and editors. '
                             'The value specified is in "em" units, in which 1 is the default relative font size. '
                             'For example, to increase the font size by 20% use a value of 1.2, or to reduce by 20%, '
                             'use a value of 0.8. Minimum 0.1, maximum 10.')
        )

        self.tab_size = self.preference.register(
            'Options', 'tab_size',
            gettext("Tab size"), 'integer', 4,
            min_val=2,
            max_val=8,
            category_label=gettext('Options'),
            help_str=gettext('The number of spaces per tab. Minimum 2, maximum 8.')
        )

        self.use_spaces = self.preference.register(
            'Options', 'use_spaces',
            gettext("Use spaces?"), 'boolean', False,
            category_label=gettext('Options'),
            help_str=gettext('Specifies whether or not to insert spaces instead of tabs when the tab key is used.')
        )


blueprint = SqlEditorModule(MODULE_NAME, __name__, static_url_path='/static')


@blueprint.route('/')
@login_required
def index():
    return bad_request(errormsg=gettext('This URL cannot be requested directly.'))


def update_session_grid_transaction(trans_id, data):
    grid_data = session['gridData']
    grid_data[str(trans_id)] = data

    session['gridData'] = grid_data


def check_transaction_status(trans_id):
    """
    This function is used to check the transaction id
    is available in the session object and connection
    status.

    Args:
        trans_id:

    Returns: status and connection object

    """
    grid_data = session['gridData']

    # Return from the function if transaction id not found
    if str(trans_id) not in grid_data:
        return False, gettext('Transaction ID not found in the session.'), None, None, None

    # Fetch the object for the specified transaction id.
    # Use pickle.loads function to get the command object
    session_obj = grid_data[str(trans_id)]
    trans_obj = pickle.loads(session_obj['command_obj'])

    try:
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
        conn = manager.connection(did=trans_obj.did, conn_id=trans_obj.conn_id)
    except Exception as e:
        return False, internal_server_error(errormsg=str(e)), None, None, None

    if conn.connected():
        return True, None, conn, trans_obj, session_obj
    else:
        return False, gettext('Not connected to server or connection with the server has been closed.'), \
               None, trans_obj, session_obj


@blueprint.route('/view_data/start/<int:trans_id>', methods=["GET"])
@login_required
def start_view_data(trans_id):
    """
    This method is used to execute query using asynchronous connection.

    Args:
        trans_id: unique transaction id
    """
    limit = -1

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:
        try:

            # Fetch the sql and primary_keys from the object
            sql = trans_obj.get_sql()
            pk_names, primary_keys = trans_obj.get_primary_keys()

            # Fetch the applied filter.
            filter_applied = trans_obj.is_filter_applied()

            # Fetch the limit for the SQL query
            limit = trans_obj.get_limit()

            can_edit = trans_obj.can_edit()
            can_filter = trans_obj.can_filter()

            # Store the primary keys to the session object
            session_obj['primary_keys'] = primary_keys
            update_session_grid_transaction(trans_id, session_obj)

            # Execute sql asynchronously
            status, result = conn.execute_async(sql)
        except Exception as e:
            return internal_server_error(errormsg=str(e))
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
            'items_per_page': blueprint.items_per_page.get(),
            'info_notifier_timeout': blueprint.info_notifier_timeout.get()
        }
    )


@blueprint.route('/query_tool/start/<int:trans_id>', methods=["PUT", "POST"])
@login_required
def start_query_tool(trans_id):
    """
    This method is used to execute query using asynchronous connection.

    Args:
        trans_id: unique transaction id
    """

    if request.data:
        sql = json.loads(request.data, encoding='utf-8')
    else:
        sql = request.args or request.form

    grid_data = session['gridData']

    # Return from the function if transaction id not found
    if str(trans_id) not in grid_data:
        return make_json_response(
            data={
                'status': False, 'result': gettext('Transaction ID not found in the session.'),
                'can_edit': False, 'can_filter': False
            }
        )

    # Fetch the object for the specified transaction id.
    # Use pickle.loads function to get the command object
    session_obj = grid_data[str(trans_id)]
    trans_obj = pickle.loads(session_obj['command_obj'])

    can_edit = False
    can_filter = False

    if trans_obj is not None and session_obj is not None:
        conn_id = trans_obj.conn_id

        # if conn_id is None then we will have to create a new connection
        if conn_id is None:
            # Create asynchronous connection using random connection id.
            conn_id = str(random.randint(1, 9999999))

        try:
            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
            conn = manager.connection(did=trans_obj.did, conn_id=conn_id)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

        # Connect to the Server if not connected.
        if not conn.connected():
            status, msg = conn.connect()
            if not status:
                return internal_server_error(errormsg=str(msg))

        if conn.connected():
            # on successful connection set the connection id to the
            # transaction object
            trans_obj.set_connection_id(conn_id)

            # As we changed the transaction object we need to
            # restore it and update the session variable.
            session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
            update_session_grid_transaction(trans_id, session_obj)

            # If auto commit is False and transaction status is Idle
            # then call is_begin_not_required() function to check BEGIN
            # is required or not.

            if not trans_obj.auto_commit \
                    and conn.transaction_status() == TX_STATUS_IDLE \
                    and is_begin_required(sql):
                conn.execute_void("BEGIN;")

            # Execute sql asynchronously with params is None
            # and formatted_error is True.
            status, result = conn.execute_async(sql)

            # If the transaction aborted for some reason and
            # Auto RollBack is True then issue a rollback to cleanup.
            trans_status = conn.transaction_status()
            if trans_status == TX_STATUS_INERROR and trans_obj.auto_rollback:
                conn.execute_void("ROLLBACK;")
        else:
            status = False
            result = gettext('Not connected to server or connection with the server has been closed.')

        can_edit = trans_obj.can_edit()
        can_filter = trans_obj.can_filter()

    else:
        status = False
        result = gettext('Either Transaction object or Session object not found.')

    return make_json_response(
        data={
            'status': status, 'result': result,
            'can_edit': can_edit, 'can_filter': can_filter,
            'items_per_page': blueprint.items_per_page.get(),
            'info_notifier_timeout': blueprint.info_notifier_timeout.get()
        }
    )


@blueprint.route('/query_tool/preferences/<int:trans_id>', methods=["GET", "PUT"])
@login_required
def preferences(trans_id):
    """
        This method is used to get/put explain options from/to preferences

        Args:
            trans_id: unique transaction id
    """
    if request.method == 'GET':

        # Check the transaction and connection status
        status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
        if status and conn is not None \
                and trans_obj is not None and session_obj is not None:
            # Call the set_auto_commit and set_auto_rollback method of transaction object
            trans_obj.set_auto_commit(blueprint.auto_commit.get())
            trans_obj.set_auto_rollback(blueprint.auto_rollback.get())

            # As we changed the transaction object we need to
            # restore it and update the session variable.
            session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
            update_session_grid_transaction(trans_id, session_obj)

        return make_json_response(
            data={
                'explain_verbose': blueprint.explain_verbose.get(),
                'explain_costs': blueprint.explain_costs.get(),
                'explain_buffers': blueprint.explain_buffers.get(),
                'explain_timing': blueprint.explain_timing.get(),
                'auto_commit': blueprint.auto_commit.get(),
                'auto_rollback': blueprint.auto_rollback.get()
            }
        )
    else:
        data = None
        if request.data:
            data = json.loads(request.data, encoding='utf-8')
        else:
            data = request.args or request.form
        for k, v in data.items():
            v = bool(v)
            if k == 'explain_verbose':
                blueprint.explain_verbose.set(v)
            elif k == 'explain_costs':
                blueprint.explain_costs.set(v)
            elif k == 'explain_buffers':
                blueprint.explain_buffers.set(v)
            elif k == 'explain_timing':
                blueprint.explain_timing.set(v)

        return success_return()


@blueprint.route('/poll/<int:trans_id>', methods=["GET"])
@login_required
def poll(trans_id):
    """
    This method polls the result of the asynchronous query and returns the result.

    Args:
        trans_id: unique transaction id
    """
    col_info = None
    result = None
    primary_keys = None
    rows_affected = 0
    additional_result = []

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None and session_obj is not None:
        status, result, col_info = conn.poll()
        if status == ASYNC_OK:
            status = 'Success'
            if 'primary_keys' in session_obj:
                primary_keys = session_obj['primary_keys']

            # if transaction object is instance of QueryToolCommand
            # and transaction aborted for some reason then issue a
            # rollback to cleanup
            if isinstance(trans_obj, QueryToolCommand):
                trans_status = conn.transaction_status()
                if (trans_status == TX_STATUS_INERROR and
                        trans_obj.auto_rollback):
                    conn.execute_void("ROLLBACK;")
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

    # Check column info is available or not
    if col_info is not None and len(col_info) > 0:
        columns = dict()
        rows_affected = conn.rows_affected()

        for col in col_info:
            items = list(col.items())
            col_type = dict()
            col_type['type_code'] = items[1][1]
            col_type['type_name'] = None
            columns[items[0][1]] = col_type

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['columns_info'] = columns
        update_session_grid_transaction(trans_id, session_obj)

    """
        Procedure/Function output may comes in the form of Notices from the
        database server, so we need to append those outputs with the
        original result.
    """
    if status == 'Success' and result is None:
        result = conn.status_message()
        messages = conn.messages()
        if messages:
            additional_result = ''.join(messages)
        else:
            additional_result = ''
        if result != 'SELECT 1' and result is not None:
            result = additional_result + result
        else:
            result = additional_result

        rows_affected = conn.rows_affected()

    return make_json_response(
        data={
            'status': status, 'result': result,
            'colinfo': col_info, 'primary_keys': primary_keys,
            'rows_affected': rows_affected
        }
    )


@blueprint.route('/fetch/types/<int:trans_id>', methods=["GET"])
@login_required
def fetch_pg_types(trans_id):
    """
    This method is used to fetch the pg types, which is required
    to map the data type comes as a result of the query.

    Args:
        trans_id: unique transaction id
    """

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        # List of oid for which we need type name from pg_type
        oid = ''
        res = {}
        if 'columns_info' in session_obj \
                and session_obj['columns_info'] is not None:
            for col in session_obj['columns_info']:
                type_obj = session_obj['columns_info'][col]
                oid += str(type_obj['type_code']) + ','

            # Remove extra comma
            oid = oid[:-1]
            status, res = conn.execute_dict(
                """SELECT oid, format_type(oid,null) as typname FROM pg_type WHERE oid IN ({0}) ORDER BY oid;
""".format(oid))

            if status:
                # iterate through pg_types and update the type name in session object
                for record in res['rows']:
                    for col in session_obj['columns_info']:
                        type_obj = session_obj['columns_info'][col]
                        if type_obj['type_code'] == record['oid']:
                            type_obj['type_name'] = record['typname']

                update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route('/save/<int:trans_id>', methods=["PUT", "POST"])
@login_required
def save(trans_id):
    """
    This method is used to save the changes to the server

    Args:
        trans_id: unique transaction id
    """

    if request.data:
        changed_data = json.loads(request.data, encoding='utf-8')
    else:
        changed_data = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        # If there is no primary key found then return from the function.
        if len(session_obj['primary_keys']) <= 0 or len(changed_data) <= 0:
            return make_json_response(
                data={'status': False,
                      'result': gettext('No primary key found for this object, so unable to save records.')}
            )

        status, res, query_res, _rowid = trans_obj.save(changed_data)
    else:
        status = False
        res = error_msg
        query_res = None

    return make_json_response(
        data={ 'status': status,
               'result': res,
               'query_result': query_res,
               '_rowid': _rowid }
        )


@blueprint.route('/filter/get/<int:trans_id>', methods=["GET"])
@login_required
def get_filter(trans_id):
    """
    This method is used to get the existing filter.

    Args:
        trans_id: unique transaction id
    """

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        res = trans_obj.get_filter()
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route('/filter/apply/<int:trans_id>', methods=["PUT", "POST"])
@login_required
def apply_filter(trans_id):
    """
    This method is used to apply the filter.

    Args:
        trans_id: unique transaction id
    """
    if request.data:
        filter_sql = json.loads(request.data, encoding='utf-8')
    else:
        filter_sql = request.args or request.form

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        status, res = trans_obj.set_filter(filter_sql)

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route('/filter/inclusive/<int:trans_id>', methods=["PUT", "POST"])
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
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        res = None
        filter_sql = ''
        driver = get_driver(PG_DEFAULT_DRIVER)

        for column_name in filter_data:
            column_value = filter_data[column_name]
            if column_value is None:
                filter_sql = driver.qtIdent(conn, column_name) + ' IS NULL '
            else:
                filter_sql = driver.qtIdent(conn, column_name) + ' = ' + driver.qtLiteral(column_value)

        trans_obj.append_filter(filter_sql)

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route('/filter/exclusive/<int:trans_id>', methods=["PUT", "POST"])
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
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        res = None
        filter_sql = ''
        driver = get_driver(PG_DEFAULT_DRIVER)

        for column_name in filter_data:
            column_value = filter_data[column_name]
            if column_value is None:
                filter_sql = driver.qtIdent(conn, column_name) + ' IS NOT NULL '
            else:
                filter_sql = driver.qtIdent(conn, column_name) + ' IS DISTINCT FROM ' + driver.qtLiteral(column_value)

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


@blueprint.route('/filter/remove/<int:trans_id>', methods=["PUT", "POST"])
@login_required
def remove_filter(trans_id):
    """
    This method is used to remove the filter.

    Args:
        trans_id: unique transaction id
    """

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

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


@blueprint.route('/limit/<int:trans_id>', methods=["PUT", "POST"])
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
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

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


@blueprint.route('/cancel/<int:trans_id>', methods=["PUT", "POST"])
@login_required
def cancel_transaction(trans_id):
    """
    This method is used to cancel the running transaction

    Args:
        trans_id: unique transaction id
    """

    grid_data = session['gridData']

    # Return from the function if transaction id not found
    if str(trans_id) not in grid_data:
        return make_json_response(
            data={
                'status': False, 'result': gettext('Transaction ID not found in the session.')
            }
        )

    # Fetch the object for the specified transaction id.
    # Use pickle.loads function to get the command object
    session_obj = grid_data[str(trans_id)]
    trans_obj = pickle.loads(session_obj['command_obj'])

    if trans_obj is not None and session_obj is not None:

        # Fetch the main connection object for the database.
        try:
            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(trans_obj.sid)
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
            status, result = conn.cancel_transaction(trans_obj.conn_id, trans_obj.did)

            # Delete connection if we have created it to
            # cancel the transaction
            if delete_connection:
                manager.release(did=trans_obj.did)
        else:
            status = False
            result = gettext('Not connected to server or connection with the server has been closed.')
    else:
        status = False
        result = gettext('Either Transaction object or Session object not found.')

    return make_json_response(
        data={
            'status': status, 'result': result
        }
    )


@blueprint.route('/object/get/<int:trans_id>', methods=["GET"])
@login_required
def get_object_name(trans_id):
    """
    This method is used to get the object name

    Args:
        trans_id: unique transaction id
    """

    # Check the transaction and connection status
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        res = trans_obj.object_name
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route('/auto_commit/<int:trans_id>', methods=["PUT", "POST"])
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
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        res = None

        # Call the set_auto_commit method of transaction object
        trans_obj.set_auto_commit(auto_commit)

        # Set Auto commit in preferences
        blueprint.auto_commit.set(bool(auto_commit))

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route('/auto_rollback/<int:trans_id>', methods=["PUT", "POST"])
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
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        res = None

        # Call the set_auto_rollback method of transaction object
        trans_obj.set_auto_rollback(auto_rollback)

        # Set Auto Rollback in preferences
        blueprint.auto_rollback.set(bool(auto_rollback))

        # As we changed the transaction object we need to
        # restore it and update the session variable.
        session_obj['command_obj'] = pickle.dumps(trans_obj, -1)
        update_session_grid_transaction(trans_id, session_obj)
    else:
        status = False
        res = error_msg

    return make_json_response(data={'status': status, 'result': res})


@blueprint.route('/autocomplete/<int:trans_id>', methods=["PUT", "POST"])
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
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)
    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        # Create object of SQLAutoComplete class and pass connection object
        auto_complete_obj = SQLAutoComplete(sid=trans_obj.sid, did=trans_obj.did, conn=conn)

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
    return Response(response=render_template("sqleditor/js/sqleditor.js",
                    tab_size=blueprint.tab_size.get(),
                    use_spaces=blueprint.use_spaces.get(),
                    _=gettext),
                    status=200,
                    mimetype="application/javascript"
           )


def is_begin_required(query):
    word_len = 0
    query = query.strip()
    query_len = len(query)

    # Check word length (since "beginx" is not "begin").
    while (word_len < query_len) and query[word_len].isalpha():
        word_len += 1

    # Transaction control commands.  These should include every keyword that
    #  gives rise to a TransactionStmt in the backend grammar, except for the
    #  savepoint-related commands.
    #
    #  (We assume that START must be START TRANSACTION, since there is
    #  presently no other "START foo" command.)

    keyword = query[0:word_len]

    if word_len == 5 and keyword.lower() == "abort":
        return False
    if word_len == 5 and keyword.lower() == "begin":
        return False
    if word_len == 5 and keyword.lower() == "start":
        return False
    if word_len == 6 and keyword.lower() == "commit":
        return False
    if word_len == 3 and keyword.lower() == "end":
        return False
    if word_len == 8 and keyword.lower() == "rollback":
        return False
    if word_len == 7 and keyword.lower() == "prepare":
        # PREPARE TRANSACTION is a TC command, PREPARE foo is not
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 11 and keyword.lower() == "transaction":
            return False
        return True

    # Commands not allowed within transactions. The statements checked for
    # here should be exactly those that call PreventTransactionChain() in the
    # backend.
    if word_len == 6 and keyword.lower() == "vacuum":
        return False

    if word_len == 7 and keyword.lower() == "cluster":
        # CLUSTER with any arguments is allowed in transactions
        query = query[word_len:query_len]
        query = query.strip()

        if query[0].isalpha():
            return True  # has additional words
        return False  # it's CLUSTER without arguments

    if word_len == 6 and keyword.lower() == "create":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 8 and keyword.lower() == "database":
            return False
        if word_len == 10 and keyword.lower() == "tablespace":
            return False

        # CREATE [UNIQUE] INDEX CONCURRENTLY isn't allowed in xacts
        if word_len == 7 and keyword.lower() == "cluster":
            query = query[word_len:query_len]
            query = query.strip()
            query_len = len(query)
            word_len = 0

            while (word_len < query_len) and query[word_len].isalpha():
                word_len += 1

            keyword = query[0:word_len]

        if word_len == 5 and keyword.lower() == "index":
            query = query[word_len:query_len]
            query = query.strip()
            query_len = len(query)
            word_len = 0

            while (word_len < query_len) and query[word_len].isalpha():
                word_len += 1

            keyword = query[0:word_len]
            if word_len == 12 and keyword.lower() == "concurrently":
                return False
        return True

    if word_len == 5 and keyword.lower() == "alter":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]

        # ALTER SYSTEM isn't allowed in xacts
        if word_len == 6 and keyword.lower() == "system":
            return False
        return True

    # Note: these tests will match DROP SYSTEM and REINDEX TABLESPACE, which
    # aren't really valid commands so we don't care much. The other four
    # possible matches are correct.
    if word_len == 4 and keyword.lower() == "drop" \
            or word_len == 7 and keyword.lower() == "reindex":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 8 and keyword.lower() == "database":
            return False
        if word_len == 6 and keyword.lower() == "system":
            return False
        if word_len == 10 and keyword.lower() == "tablespace":
            return False
        return True

    # DISCARD ALL isn't allowed in xacts, but other variants are allowed.
    if word_len == 7 and keyword.lower() == "discard":
        query = query[word_len:query_len]
        query = query.strip()
        query_len = len(query)
        word_len = 0

        while (word_len < query_len) and query[word_len].isalpha():
            word_len += 1

        keyword = query[0:word_len]
        if word_len == 3 and keyword.lower() == "all":
            return False
        return True

    return True


@blueprint.route('/load_file/', methods=["PUT", "POST"])
@login_required
def load_file():
    """
    This function gets name of file from request data
    reads the data and sends back in reponse
    """
    if request.data:
        file_data = json.loads(request.data, encoding='utf-8')

    file_path = unquote(file_data['file_name'])
    # retrieve storage directory path
    storage_manager_path = get_storage_directory()
    if storage_manager_path:
        # generate full path of file
        file_path = os.path.join(storage_manager_path, file_path.lstrip('/'))

    file_data = None

    # check if file type is text or binary
    textchars = bytearray(
        [7, 8, 9, 10, 12, 13, 27]) + bytearray(
        range(0x20, 0x7f)) + bytearray(range(0x80, 0x100))

    is_binary_string = lambda bytes: bool(
        bytes.translate(None, textchars)
    )

    # read file
    try:
        with open(file_path, 'rb') as fileObj:
            is_binary = is_binary_string(fileObj.read(1024))
            if not is_binary:
                fileObj.seek(0)
                file_data = fileObj.read()
            else:
                return internal_server_error(
                    errormsg=gettext("File type not supported")
                )
    except IOError as e:
        # we don't want to expose real path of file
        # so only show error message.
        if e.strerror == 'Permission denied':
            err_msg = "Error: {0}".format(e.strerror)
        else:
            err_msg = "Error: {0}".format(e.strerror)
        return internal_server_error(errormsg=err_msg)
    except Exception as e:
        err_msg = "Error: {0}".format(e.strerror)
        return internal_server_error(errormsg=err_msg)
    return make_json_response(
        data={
            'status': True, 'result': file_data,
        }
    )


@blueprint.route('/save_file/', methods=["PUT", "POST"])
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
    if storage_manager_path is not None:
        file_path = os.path.join(
            storage_manager_path,
            unquote(file_data['file_name'].lstrip('/'))
        )
    file_content = file_data['file_content']

    # write to file
    try:
        with open(file_path, 'w') as output_file:
            output_file.write(file_content)
    except IOError as e:
        if e.strerror == 'Permission denied':
            err_msg = "Error: {0}".format(e.strerror)
        else:
            err_msg = "Error: {0}".format(e.strerror)
        return internal_server_error(errormsg=err_msg)
    except Exception as e:
        err_msg = "Error: {0}".format(e.strerror)
        return internal_server_error(errormsg=err_msg)

    return make_json_response(
        data={
            'status': True,
        }
    )


@blueprint.route('/query_tool/download/<int:trans_id>', methods=["GET"])
@login_required
def start_query_download_tool(trans_id):
    sync_conn = None
    status, error_msg, conn, trans_obj, session_obj = check_transaction_status(trans_id)

    if status and conn is not None \
            and trans_obj is not None and session_obj is not None:

        data = request.args if request.args else None
        try:
            if data and 'query' in data:
                sql = data['query']
                conn_id = str(random.randint(1, 9999999))
                sync_conn = conn.manager.connection(
                    did=trans_obj.did,
                    conn_id=conn_id,
                    auto_reconnect=False,
                    async=False
                )

                sync_conn.connect(autocommit=False)

                def cleanup():
                    conn.manager.connections[sync_conn.conn_id]._release()
                    del conn.manager.connections[sync_conn.conn_id]

                # This returns generator of records.
                status, gen = sync_conn.execute_on_server_as_csv(sql, records=2000)

                if not status:
                    r = Response('"{0}"'.format(gen), mimetype='text/csv')
                    r.headers["Content-Disposition"] = "attachment;filename=error.csv"
                    r.call_on_close(cleanup)
                    return r

                r = Response(gen(), mimetype='text/csv')

                if 'filename' in data and data['filename'] != "":
                    filename = data['filename']
                else:
                    import time
                    filename = str(int(time.time())) + ".csv"

                r.headers["Content-Disposition"] = "attachment;filename={0}".format(filename)

                r.call_on_close(cleanup)
                return r

        except Exception as e:
            r = Response('"{0}"'.format(e), mimetype='text/csv')
            r.headers["Content-Disposition"] = "attachment;filename=error.csv"
            r.call_on_close(cleanup)
            return r
    else:
        return internal_server_error(errormsg=gettext("Transaction status check failed."))
