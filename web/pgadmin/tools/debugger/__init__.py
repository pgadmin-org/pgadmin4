##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the debugger"""

MODULE_NAME = 'debugger'

import simplejson as json
import random

from flask import url_for, Response, render_template, request, session, current_app
from flask_babel import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request
from pgadmin.utils.ajax import make_json_response, \
    internal_server_error
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.model import db, DebuggerFunctionArguments

# Constants
ASYNC_OK = 1


class DebuggerModule(PgAdminModule):
    """
    class DebuggerModule(PgAdminModule)

        A module class for debugger which is derived from PgAdminModule.

    Methods:
    -------
    * get_own_javascripts(self)
      - Method is used to load the required javascript files for debugger module

    """

    def get_own_javascripts(self):
        scripts = list()
        for name, script in [
            ['pgadmin.tools.debugger.controller', 'js/debugger'],
            ['pgadmin.tools.debugger.ui', 'js/debugger_ui'],
            ['pgadmin.tools.debugger.direct', 'js/direct']
        ]:
            scripts.append({
                'name': name,
                'path': url_for('debugger.index') + script,
                'when': None
            })

        return scripts


blueprint = DebuggerModule(MODULE_NAME, __name__)


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=gettext("This URL can not be called directly!"))


@blueprint.route("/js/debugger.js")
@login_required
def script():
    """render the main debugger javascript file"""
    return Response(response=render_template("debugger/js/debugger.js", _=gettext),
                    status=200,
                    mimetype="application/javascript")


@blueprint.route("/js/debugger_ui.js")
@login_required
def script_debugger_js():
    """render the debugger UI javascript file"""
    return Response(response=render_template("debugger/js/debugger_ui.js", _=gettext),
                    status=200,
                    mimetype="application/javascript")


@blueprint.route("/js/direct.js")
@login_required
def script_debugger_direct_js():
    """render the javascript file required send and receive the response from server for debugging"""
    return Response(response=render_template("debugger/js/direct.js", _=gettext),
                    status=200,
                    mimetype="application/javascript")


def update_session_debugger_transaction(trans_id, data):
    """Update the session variables required for debugger with transaction ID"""
    debugger_data = session['debuggerData']
    debugger_data[str(trans_id)] = data

    session['debuggerData'] = debugger_data


def update_session_function_transaction(trans_id, data):
    """Update the session variables of functions required to debug with transaction ID"""
    function_data = session['functionData']
    function_data[str(trans_id)] = data
    session['functionData'] = function_data


@blueprint.route('/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>', methods=['GET'])
@blueprint.route('/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>/<int:trid>', methods=['GET'])
@login_required
def init_function(node_type, sid, did, scid, fid, trid=None):
    """
    init_function(node_type, sid, did, scid, fid, trid)

    This method is responsible to initialize the function required for debugging.
    This method is also responsible for storing the all functions data to session variable.
    This is only required for direct debugging. As Indirect debugging does not require these data because user will
    provide all the arguments and other functions information through another session to invoke the target.

    Parameters:
        node_type
        - Node type - Function or Procedure
        sid
        - Server Id
        did
        - Database Id
        scid
        - Schema Id
        fid
        - Function Id
        trid
        - Trigger Function Id
    """
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
    conn = manager.connection(did=did)

    # Get the server version, server type and user information
    ver = manager.version
    server_type = manager.server_type
    user = manager.user_info

    # Check server type is ppas or not
    ppas_server = False
    if server_type == 'ppas':
        ppas_server = True

    # Set the template path required to read the sql files
    template_path = 'debugger/sql'

    if node_type == 'trigger':
        # Find trigger function id from trigger id
        sql = render_template("/".join([template_path, 'get_trigger_function_info.sql']), table_id=fid, trigger_id=trid)

        status, tr_set = conn.execute_dict(sql)
        if not status:
            current_app.logger.debug("Error retrieving trigger function information from database")
            return internal_server_error(errormsg=tr_set)

        fid = tr_set['rows'][0]['tgfoid']

    # if ppas server and node type is edb function or procedure then extract last argument as function id
    if node_type == 'edbfunc' or node_type == 'edbproc':
        fid = trid

    sql = ''
    sql = render_template("/".join([template_path, 'get_function_debug_info.sql']), is_ppas_database=ppas_server,
                          hasFeatureFunctionDefaults=True, fid=fid)
    status, r_set = conn.execute_dict(sql)
    if not status:
        current_app.logger.debug("Error retrieving function information from database")
        return internal_server_error(errormsg=r_set)

    ret_status = status

    # Check that the function is actually debuggable...
    if r_set['rows'][0]:
        # Function with a colon in the name cannot be debugged.
        # If this is an EDB wrapped function, no debugging allowed
        # Function with return type "trigger" can not be debugged.
        if ":" in r_set['rows'][0]['name']:
            ret_status = False
            msg = gettext("Functions with a colon in the name cannot be debugged.")
        elif ppas_server and r_set['rows'][0]['prosrc'].lstrip().startswith('$__EDBwrapped__$'):
            ret_status = False
            msg = gettext("EDB Advanced Server wrapped functions cannot be debugged.")
        else:
            # If user is super user then we should check debugger library is loaded or not
            if user['is_superuser']:
                status_in, rid_pre = conn.execute_scalar("SHOW shared_preload_libraries")
                if not status_in:
                    return internal_server_error(gettext("Could not fetch debugger plugin information."))

                # Need to check if plugin is really loaded or not with "plugin_debugger" string
                if "plugin_debugger" not in rid_pre:
                    ret_status = False
                    msg = gettext("The debugger plugin is not enabled. Please add the plugin to the shared_preload_libraries setting in the postgresql.conf file and restart the database server.")

            status_in, rid_tar = conn.execute_scalar(
                "SELECT count(*) FROM pg_proc WHERE proname = 'pldbg_get_target_info'")
            if not status_in:
                current_app.logger.debug("Failed to check for the pldbg_get_target_info function.")
                return internal_server_error(gettext("Failed to check for the pldbg_get_target_info function."))

            if rid_tar == 0:
                msg = gettext("The debugger plugin is not enabled. Please create the pldbgapi extension in this database.")
                ret_status = False
    else:
        ret_status = False
        msg = gettext("The function/procedure cannot be debugged")

    # Return the response that function can not be debug...
    if not ret_status:
        current_app.logger.debug(msg)
        return internal_server_error(msg)

    # Store the function information in session variable
    if 'funcData' not in session:
        function_data = dict()
    else:
        function_data = session['funcData']

    data = {}
    data['name'] = r_set['rows'][0]['proargnames']
    data['type'] = r_set['rows'][0]['proargtypenames']
    data['use_default'] = r_set['rows'][0]['pronargdefaults']
    data['default_value'] = r_set['rows'][0]['proargdefaults']
    data['require_input'] = True

    # Below will check do we really required for the user input arguments and show input dialog
    if not r_set['rows'][0]['proargtypenames']:
        data['require_input'] = False
    else:
        if r_set['rows'][0]['pkg'] != 0 and r_set['rows'][0]['pkgconsoid'] != 0:
            data['require_input'] = True

        if r_set['rows'][0]['proargmodes']:
            pro_arg_modes = r_set['rows'][0]['proargmodes'].split(",")
            for pr_arg_mode in pro_arg_modes:
                if pr_arg_mode == 'o' or pr_arg_mode == 't':
                    data['require_input'] = False
                    continue
                else:
                    data['require_input'] = True
                    break

    r_set['rows'][0]['require_input'] = data['require_input']

    function_data = {
        'oid': fid,
        'name': r_set['rows'][0]['name'],
        'is_func': r_set['rows'][0]['isfunc'],
        'is_callable': False,
        'schema': r_set['rows'][0]['schemaname'],
        'language': r_set['rows'][0]['lanname'],
        'return_type': r_set['rows'][0]['rettype'],
        'args_type': r_set['rows'][0]['proargtypenames'],
        'args_name': r_set['rows'][0]['proargnames'],
        'arg_mode': r_set['rows'][0]['proargmodes'],
        'use_default': r_set['rows'][0]['pronargdefaults'],
        'default_value': r_set['rows'][0]['proargdefaults'],
        'pkgname': r_set['rows'][0]['pkgname'],
        'pkg': r_set['rows'][0]['pkg'],
        'require_input': data['require_input'],
        'args_value': ''
    }

    session['funcData'] = function_data

    return make_json_response(
        data=r_set['rows'],
        status=200
    )


@blueprint.route('/direct/<int:trans_id>', methods=['GET'])
@login_required
def direct_new(trans_id):
    debugger_data = session['debuggerData']
    # Return from the function if transaction id not found
    if str(trans_id) not in debugger_data:
        return make_json_response(data={'status': True})

    obj = debugger_data[str(trans_id)]

    # if indirect debugging pass value 0 to client and for direct debugging pass it to 1
    debug_type = 0 if obj['debug_type'] == 'indirect' else 1

    """
    Animations and transitions are not automatically GPU accelerated and by default use browser's slow rendering engine.
    We need to set 'translate3d' value of '-webkit-transform' property in order to use GPU.
    After applying this property under linux, Webkit calculates wrong position of the elements so panel contents are not visible.
    To make it work, we need to explicitly set '-webkit-transform' property to 'none' for .ajs-notifier, .ajs-message, .ajs-modal classes.

    This issue is only with linux runtime application and observed in Query tool and debugger.
    When we open 'Open File' dialog then whole Query-tool panel content is not visible though it contains HTML element in back end.

    The port number should have already been set by the runtime if we're running in desktop mode.
    """
    is_linux_platform = False

    from sys import platform as _platform
    if "linux" in _platform:
        is_linux_platform = True

    return render_template(
        "debugger/direct.html",
        _=gettext,
        function_name='test',
        uniqueId=trans_id,
        debug_type=debug_type,
        is_desktop_mode=current_app.PGADMIN_RUNTIME,
        is_linux=is_linux_platform,
        stylesheets=[url_for('debugger.static', filename='css/debugger.css')]
    )


@blueprint.route('/initialize_target/<debug_type>/<int:sid>/<int:did>/<int:scid>/<int:func_id>',
                 methods=['GET', 'POST'])
@blueprint.route('/initialize_target/<debug_type>/<int:sid>/<int:did>/<int:scid>/<int:func_id>/<int:tri_id>',
                 methods=['GET', 'POST'])
@login_required
def initialize_target(debug_type, sid, did, scid, func_id, tri_id=None):
    """
    initialize_target(debug_type, sid, did, scid, func_id, tri_id)

    This method is responsible for creating an asynchronous connection.
    It will also create a unique transaction id and store the information
    into session variable.

    Parameters:
        debug_type
        - Type of debugging (Direct or Indirect)
        sid
        - Server Id
        did
        - Database Id
        scid
        - Schema Id
        func_id
        - Function Id
        tri_id
        - Trigger Function Id
    """

    # Create asynchronous connection using random connection id.
    conn_id = str(random.randint(1, 9999999))
    try:
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection(did=did, conn_id=conn_id)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    # Connect the Server
    status, msg = conn.connect()
    if not status:
        return internal_server_error(errormsg=str(msg))

    # Set the template path required to read the sql files
    template_path = 'debugger/sql'

    if tri_id is not None:
        # Find trigger function id from trigger id
        sql = render_template("/".join([template_path, 'get_trigger_function_info.sql']), table_id=func_id, trigger_id=tri_id)

        status, tr_set = conn.execute_dict(sql)
        if not status:
            current_app.logger.debug("Error retrieving trigger function information from database")
            return internal_server_error(errormsg=tr_set)

        func_id = tr_set['rows'][0]['tgfoid']

    # Create a unique id for the transaction
    trans_id = str(random.randint(1, 9999999))

    # If there is no debugging information in session variable then create the store that information
    if 'debuggerData' not in session:
        debugger_data = dict()
    else:
        debugger_data = session['debuggerData']

    status = True

    # Find out the debugger version and store it in session variables
    status, rid = conn.execute_scalar(
        "SELECT COUNT(*) FROM pg_catalog.pg_proc p \
            LEFT JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid \
        WHERE n.nspname = ANY(current_schemas(false)) AND p.proname = 'pldbg_get_proxy_info';"
    )

    if not status:
        return internal_server_error(errormsg=rid)
    else:
        if rid == 0:
            debugger_version = 1

        status, rid = conn.execute_scalar("SELECT proxyapiver FROM pldbg_get_proxy_info();")

        if status:
            if rid == 2 or rid == 3:
                debugger_version = rid
            else:
                status = False

    # Add the debugger version information to pgadmin4 log file
    current_app.logger.debug("Debugger version is: %d", debugger_version)

    # We need to pass the value entered by the user in dialog for direct debugging
    # Here we get the value in case of direct debugging so update the session variables accordingly
    # For indirect debugging user will provide the data from another session so below condition will be be required
    if request.method == 'POST':
        data = json.loads(request.values['data'], encoding='utf-8')
        if data:
            d = session['funcData']
            d['args_value'] = data
            session['funcData'] = d

    # Update the debugger data session variable
    # Here frame_id is required when user debug the multilevel function. When user select the frame from client we
    # need to update the frame here and set the breakpoint information on that function oid
    debugger_data[str(trans_id)] = {
        'conn_id': conn_id,
        'server_id': sid,
        'database_id': did,
        'schema_id': scid,
        'function_id': func_id,
        'debug_type': debug_type,
        'debugger_version': debugger_version,
        'frame_id': 0,
        'restart_debug': 0
    }

    # Store the grid dictionary into the session variable
    session['debuggerData'] = debugger_data

    # Update the function session  information with same transaction id
    func_data = session['funcData']

    # Store the function information in session variable
    if 'functionData' not in session:
        function_data = dict()
    else:
        function_data = session['functionData']

    function_data[str(trans_id)] = {
        'oid': func_data['oid'],
        'name': func_data['name'],
        'is_func': func_data['is_func'],
        'is_callable': func_data['is_callable'],
        'schema': func_data['schema'],
        'language': func_data['language'],
        'return_type': func_data['return_type'],
        'args_type': func_data['args_type'],
        'args_name': func_data['args_name'],
        'arg_mode': func_data['arg_mode'],
        'use_default': func_data['use_default'],
        'default_value': func_data['default_value'],
        'pkgname': func_data['pkgname'],
        'pkg': func_data['pkg'],
        'require_input': func_data['require_input'],
        'args_value': func_data['args_value']
    }

    # Update the session variable of function information
    session['functionData'] = function_data

    # Delete the 'funcData' session variables as it is not used now as target is initialized
    del session['funcData']

    return make_json_response(data={'status': status, 'debuggerTransId': trans_id})


@blueprint.route('/close/<int:trans_id>', methods=["GET"])
def close(trans_id):
    """
    close(trans_id)

    This method is used to close the asynchronous connection
    and remove the information of unique transaction id from
    the session variable.

    Parameters:
        trans_id
        - unique transaction id.
    """
    # As debugger data is not in session that means we have already deleted and close the target
    if 'debuggerData' not in session:
        return make_json_response(data={'status': True})

    debugger_data = session['debuggerData']
    # Return from the function if transaction id not found
    if str(trans_id) not in debugger_data:
        return make_json_response(data={'status': True})

    obj = debugger_data[str(trans_id)]
    try:
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
        conn = manager.connection(did=obj['database_id'], conn_id=obj['conn_id'])
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    # Release the connection
    if conn.connected():
        # on successful connection cancel the running transaction
        status, result = conn.cancel_transaction(obj['conn_id'], obj['database_id'])

        # Delete the existing debugger data in session variable
        del session['debuggerData'][str(trans_id)]
        del session['functionData'][str(trans_id)]

        # Release the connection acquired during the debugging
        manager.release(did=obj['database_id'], conn_id=obj['conn_id'])
        return make_json_response(data={'status': True})
    else:
        return make_json_response(data={'status': False})


@blueprint.route('/restart/<int:trans_id>', methods=['GET'])
@login_required
def restart_debugging(trans_id):
    """
    restart_debugging(trans_id)

    This method is responsible to restart the same function for the debugging.

    Parameters:
        trans_id
        - Transaction ID
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': False,
                  'result': gettext('Not connected to server Or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['conn_id'])

    if conn.connected():
        # Update the session variable "restart_debug" to know that same function debugging has been restarted.
        # Delete the existing debugger data in session variable and update with new data
        if obj['restart_debug'] == 0:
            debugger_data = session['debuggerData']
            session_obj = debugger_data[str(trans_id)]
            session_obj['restart_debug'] = 1
            update_session_debugger_transaction(trans_id, session_obj)

        # Store the function information in session variable
        if 'functionData' not in session:
            function_data = dict()
        else:
            function_data = {
                'server_id': obj['server_id'],
                'database_id': obj['database_id'],
                'schema_id': obj['schema_id'],
                'function_id': obj['function_id'],
                'trans_id': str(trans_id),
                'proargmodes': session['functionData'][str(trans_id)]['arg_mode'],
                'proargtypenames': session['functionData'][str(trans_id)]['args_type'],
                'pronargdefaults': session['functionData'][str(trans_id)]['use_default'],
                'proargdefaults': session['functionData'][str(trans_id)]['default_value'],
                'proargnames': session['functionData'][str(trans_id)]['args_name'],
                'require_input': session['functionData'][str(trans_id)]['require_input']
            }

        return make_json_response(data={'status': True, 'restart_debug': True, 'result': function_data})
    else:
        status = False
        result = gettext('Not connected to server Or connection with the server has been closed.')

    return make_json_response(data={'status': status})


@blueprint.route('/start_listener/<int:trans_id>', methods=['GET', 'POST'])
@login_required
def start_debugger_listener(trans_id):
    """
    start_debugger_listener(trans_id)

    This method is responsible to listen and get the required information requested by user during debugging

    Parameters:
        trans_id
        - Transaction ID
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': False,
                  'result': gettext('Not connected to server Or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['conn_id'])

    ver = manager.version
    server_type = manager.server_type

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    # If user again start the same debug function with different arguments then we need to save that values to session
    # variable and database.
    if request.method == 'POST':
        data = json.loads(request.values['data'], encoding='utf-8')
        if data:
            function_data = session['functionData']
            session_obj = function_data[str(trans_id)]
            session_obj['args_value'] = data
            update_session_function_transaction(trans_id, session_obj)

    if conn.connected():

        # For the direct debugging extract the function arguments values from user and pass to jinja template
        # to create the query for execution.
        if obj['debug_type'] == 'direct':
            str_query = ''

            if session['functionData'][str(trans_id)]['pkg'] == 0:
                # Form the function name with schema name
                func_name = driver.qtIdent(conn, session['functionData'][str(trans_id)]['schema']) + '.' + driver.qtIdent(
                    conn, session['functionData'][str(trans_id)]['name'])
            else:
                # Form the edb package function/procedure name with schema name
                func_name = driver.qtIdent(conn, session['functionData'][str(trans_id)]['schema']) + '.' + \
                            driver.qtIdent(conn, session['functionData'][str(trans_id)]['pkgname']) + '.' + \
                            driver.qtIdent(conn, session['functionData'][str(trans_id)]['name'])

            if obj['restart_debug'] == 0:
                # render the SQL template and send the query to server
                if session['functionData'][str(trans_id)]['language'] == 'plpgsql':
                    sql = render_template("/".join([template_path, 'debug_plpgsql_execute_target.sql']),
                                          packge_oid=session['functionData'][str(trans_id)]['pkg'],
                                          function_oid=obj['function_id'])
                else:
                    sql = render_template("/".join([template_path, 'debug_spl_execute_target.sql']),
                                          packge_oid=session['functionData'][str(trans_id)]['pkg'],
                                          function_oid=obj['function_id'])
                status, res = conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            if session['functionData'][str(trans_id)]['arg_mode']:
                # In EDBAS 90, if an SPL-function has both an OUT-parameter
                # and a return value (which is not possible on PostgreSQL otherwise),
                # the return value is transformed into an extra OUT-parameter
                # named "_retval_"
                if session['functionData'][str(trans_id)]['args_name']:
                    arg_name = session['functionData'][str(trans_id)]['args_name'].split(",")
                    if '_retval_' in arg_name:
                        arg_mode = session['functionData'][str(trans_id)]['arg_mode'].split(",")
                        arg_mode.pop()
                    else:
                        arg_mode = session['functionData'][str(trans_id)]['arg_mode'].split(",")
                else:
                    arg_mode = session['functionData'][str(trans_id)]['arg_mode'].split(",")
            else:
                arg_mode = ['i'] * len(session['functionData'][str(trans_id)]['args_type'].split(","))

            if session['functionData'][str(trans_id)]['args_type']:
                if session['functionData'][str(trans_id)]['args_name']:
                    arg_name = session['functionData'][str(trans_id)]['args_name'].split(",")
                    if '_retval_' in arg_name:
                        arg_type = session['functionData'][str(trans_id)]['args_type'].split(",")
                        arg_type.pop()
                    else:
                        arg_type = session['functionData'][str(trans_id)]['args_type'].split(",")
                else:
                    arg_type = session['functionData'][str(trans_id)]['args_type'].split(",")

            # Below are two different template to execute and start executer
            if manager.server_type != 'pg' and manager.version < 90300:
                str_query = render_template("/".join(['debugger/sql', 'execute_edbspl.sql']),
                                            func_name=func_name,
                                            is_func=session['functionData'][str(trans_id)]['is_func'],
                                            lan_name=session['functionData'][str(trans_id)]['language'],
                                            ret_type=session['functionData'][str(trans_id)]['return_type'],
                                            data=session['functionData'][str(trans_id)]['args_value'],
                                            arg_type=arg_type,
                                            args_mode=arg_mode
                                            )
            else:
                str_query = render_template("/".join(['debugger/sql', 'execute_plpgsql.sql']),
                                            func_name=func_name,
                                            is_func=session['functionData'][str(trans_id)]['is_func'],
                                            ret_type=session['functionData'][str(trans_id)]['return_type'],
                                            data=session['functionData'][str(trans_id)]['args_value']
                                            )

            status, result = conn.execute_async(str_query)
            if not status:
                return internal_server_error(errormsg=result)
        else:
            if conn.connected():
                # For indirect debugging first create the listener and then wait for the target
                sql = render_template("/".join([template_path, 'create_listener.sql']))

                status, res = conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                # Get and store the session variable which is required to fetch other information during debugging
                int_session_id = res['rows'][0]['pldbg_create_listener']

                # In EnterpriseDB versions <= 9.1 the
                # pldbg_set_global_breakpoint function took five arguments,
                # the 2nd argument being the package's OID, if any. Starting
                # with 9.2, the package OID argument is gone, and the function
                # takes four arguments like the community version has always
                # done.
                if server_type == 'ppas' and ver <= 90100:
                    sql = render_template("/".join([template_path, 'add_breakpoint_edb.sql']),
                                          session_id=int_session_id,
                                          function_oid=obj['function_id'])

                    status, res = conn.execute_dict(sql)
                    if not status:
                        return internal_server_error(errormsg=res)
                else:
                    sql = render_template("/".join([template_path, 'add_breakpoint_pg.sql']),
                                          session_id=int_session_id,
                                          function_oid=obj['function_id'])

                    status, res = conn.execute_dict(sql)
                    if not status:
                        return internal_server_error(errormsg=res)

                # wait for the target
                sql = render_template("/".join([template_path, 'wait_for_target.sql']),
                                      session_id=int_session_id)

                status, res = conn.execute_async(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                debugger_data = session['debuggerData']
                session_obj = debugger_data[str(trans_id)]
                session_obj['exe_conn_id'] = obj['conn_id']
                session_obj['restart_debug'] = 1
                session_obj['frame_id'] = 0
                session_obj['session_id'] = int_session_id
                update_session_debugger_transaction(trans_id, session_obj)
                return make_json_response(data={'status': status, 'result': res})
            else:
                status = False
                result = gettext('Not connected to server or connection with the server has been closed.')
                return make_json_response(data={'status': status, 'result': result})
    else:
        status = False
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': result})


@blueprint.route('/execute_query/<int:trans_id>/<query_type>', methods=['GET'])
@login_required
def execute_debugger_query(trans_id, query_type):
    """
    execute_debugger_query(trans_id, query_type)

    This method is responsible to execute the query and return value. As this method is generic so user has to pass the
    query_type to get the required information for debugging.

    e.g. If user want to execute 'step_into' then query_type='step_into'.
         If user want to execute 'continue' then query_type='continue'

    Parameters:
        trans_id
        - Transaction ID
        query_type
        - Type of query to execute
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': False,
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    if conn.connected():
        sql = render_template("/".join([template_path, query_type + ".sql"]), session_id=obj['session_id'])
        # As the query type is continue or step_into or step_over then we may get result after some time so poll the
        # result. We need to update the frame id variable when user move the next step for debugging.
        if query_type == 'continue' or query_type == 'step_into' or query_type == 'step_over':
            # We should set the frame_id to 0 when execution starts.
            if obj['frame_id'] != 0:
                session_obj = debugger_data[str(trans_id)]
                session_obj['frame_id'] = 0
                update_session_debugger_transaction(trans_id, session_obj)

            status, result = conn.execute_async(sql)
            return make_json_response(data={'status': status, 'result': result})
        elif query_type == 'abort_target':
            status, result = conn.execute_dict(sql)

            manager.release(did=obj['database_id'], conn_id=obj['conn_id'])

            # Delete the existing debugger data in session variable
            del session['debuggerData'][str(trans_id)]
            del session['functionData'][str(trans_id)]

            if not status:
                return internal_server_error(errormsg=result)
            else:
                return make_json_response(info=gettext('Target Aborted.'), data={'status': status, 'result': result})
        else:
            status, result = conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)
    else:
        status = False
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': 'Success', 'result': result['rows']})


@blueprint.route('/messages/<int:trans_id>/', methods=["GET"])
@login_required
def messages(trans_id):
    """
    messages(trans_id)

    This method polls the messages returned by the database server.

    Parameters:
        trans_id
        - unique transaction id.
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': 'NotConnected',
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['conn_id'])

    port_number = ''

    if conn.connected():
        status, result, my_result = conn.poll()
        notify = conn.messages()
        if notify:
            # In notice message we need to find "PLDBGBREAK" string to find the port number to attach.
            # Notice message returned by the server is   "NOTICE:  PLDBGBREAK:7".
            # From the above message we need to find out port number as "7" so below logic will find 7 as port number
            # and attach listened to that port number
            offset = notify[0].find('PLDBGBREAK')
            str_len = len('PLDBGBREAK')
            str_len = str_len + 1
            tmpOffset = 0
            tmpFlag = False

            while notify[0][offset + str_len + tmpOffset].isdigit():
                status = 'Success'
                tmpFlag = True
                port_number = port_number + notify[0][offset + str_len + tmpOffset]
                tmpOffset = tmpOffset + 1

            if tmpFlag == False:
                status = 'Busy'
        else:
            status = 'Busy'
    else:
        status = 'NotConnected'
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': port_number})


@blueprint.route('/start_execution/<int:trans_id>/<int:port_num>', methods=['GET'])
@login_required
def start_execution(trans_id, port_num):
    """
    start_execution(trans_id, port_num)

    This method is responsible for creating an asynchronous connection for execution thread.
    Also store the session id into session return with attach port query for the direct debugging.

    Parameters:
        trans_id
        - Transaction ID
        port_num
        - Port number to attach
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': 'NotConnected',
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    dbg_version = obj['debugger_version']

    # Create asynchronous connection using random connection id.
    exe_conn_id = str(random.randint(1, 9999999))
    try:
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
        conn = manager.connection(did=obj['database_id'], conn_id=exe_conn_id)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    # Connect the Server
    status, msg = conn.connect()
    if not status:
        return internal_server_error(errormsg=str(msg))

    if 'debuggerData' not in session:
        debugger_data = dict()
    else:
        debugger_data = session['debuggerData']

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    # connect to port and store the session ID in the session variables
    sql = render_template("/".join([template_path, 'attach_to_port.sql']), port=port_num)
    status_port, res_port = conn.execute_dict(sql)
    if not status_port:
        return internal_server_error(errormsg=res_port)

    session_obj = debugger_data[str(trans_id)]
    session_obj['restart_debug'] = 0
    session_obj['frame_id'] = 0
    session_obj['exe_conn_id'] = exe_conn_id
    session_obj['debugger_version'] = dbg_version
    session_obj['session_id'] = res_port['rows'][0]['pldbg_attach_to_port']
    update_session_debugger_transaction(trans_id, session_obj)

    return make_json_response(data={'status': 'Success', 'result': res_port['rows'][0]['pldbg_attach_to_port']})


@blueprint.route('/set_breakpoint/<int:trans_id>/<int:line_no>/<int:set_type>', methods=['GET'])
@login_required
def set_clear_breakpoint(trans_id, line_no, set_type):
    """
    set_clear_breakpoint(trans_id, line_no, set_type)

    This method is responsible to set and clean the breakpoint

    Parameters:
        trans_id
        - Transaction ID
        line_no
        - Line number to set
        set_type
        - 0 - clear the breakpoint, 1 - set the breakpoint
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': False,
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    query_type = ''

    # We need to find out function OID before sending the foid to set the breakpoint because it may possible that
    # debugging function has multi level function for debugging so we need to save the debug level to session variable
    # and pass tha appropriate foid to set the breakpoint.
    sql_ = render_template("/".join([template_path, "get_stack_info.sql"]), session_id=obj['session_id'])
    status, res_stack = conn.execute_dict(sql_)
    if not status:
        return internal_server_error(errormsg=res_stack)

    # For multilevel function debugging, we need to fetch current selected frame's function oid for setting the
    # breakpoint. For single function the frame id will be 0.
    foid = res_stack['rows'][obj['frame_id']]['func']

    # Check the result of the stack before setting the breakpoint
    if conn.connected():
        if set_type == 1:
            query_type = 'set_breakpoint'
        else:
            query_type = 'clear_breakpoint'

        sql = render_template("/".join([template_path, query_type + ".sql"]), session_id=obj['session_id'],
                              foid=foid, line_number=line_no)

        status, result = conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)
    else:
        status = False
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': result['rows']})


@blueprint.route('/clear_all_breakpoint/<int:trans_id>', methods=['POST'])
@login_required
def clear_all_breakpoint(trans_id):
    """
    clear_all_breakpoint(trans_id)

    This method is responsible to clear all the breakpoint

    Parameters:
        trans_id
        - Transaction ID
    """
    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': False,
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    query_type = ''

    if conn.connected():
        # get the data sent through post from client
        if request.form['breakpoint_list']:
            line_numbers = request.form['breakpoint_list'].split(",")
            for line_no in line_numbers:
                sql = render_template("/".join([template_path, "clear_breakpoint.sql"]), session_id=obj['session_id'],
                                      foid=obj['function_id'], line_number=line_no)

                status, result = conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=result)
        else:
            return make_json_response(data={'status': False})
    else:
        status = False
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': result['rows']})


@blueprint.route('/deposit_value/<int:trans_id>', methods=['POST'])
@login_required
def deposit_parameter_value(trans_id):
    """
    deposit_parameter_value(trans_id)

    This method is responsible to change the value of variables

    Parameters:
        trans_id
        - Transaction ID
    """
    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': False,
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    query_type = ''

    if conn.connected():
        # get the data sent through post from client
        data = json.loads(request.values['data'], encoding='utf-8')

        if data:
            sql = render_template("/".join([template_path, "deposit_value.sql"]), session_id=obj['session_id'],
                                  var_name=data[0]['name'], line_number=-1, val=data[0]['value'])

            status, result = conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=result)

            # Check if value deposited successfully or not and depending on the result, return the message information.
            if result['rows'][0]['pldbg_deposit_value']:
                info = gettext('Value deposited successfully')
            else:
                info = gettext('Error while setting the value')
            return make_json_response(
                data={'status': status, 'info': info, 'result': result['rows'][0]['pldbg_deposit_value']})
    else:
        status = False
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': result})


@blueprint.route('/select_frame/<int:trans_id>/<int:frame_id>', methods=['GET'])
@login_required
def select_frame(trans_id, frame_id):
    """
    select_frame(trans_id, frame_id)

    This method is responsible to select the frame from stack info

    Parameters:
        trans_id
        - Transaction ID
        frame_id
        - Frame id selected
    """
    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': False,
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = obj['debugger_version']
    if dbg_version <= 2:
        template_path = 'debugger/sql/v1'
    else:
        template_path = 'debugger/sql/v2'

    session_obj = debugger_data[str(trans_id)]
    session_obj['frame_id'] = frame_id
    update_session_debugger_transaction(trans_id, session_obj)

    if conn.connected():
        sql = render_template("/".join([template_path, "select_frame.sql"]), session_id=obj['session_id'],
                              frame_id=frame_id)

        status, result = conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)
    else:
        status = False
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': result['rows']})


@blueprint.route('/get_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>', methods=['GET'])
@login_required
def get_arguments_sqlite(sid, did, scid, func_id):
    """
    get_arguments_sqlite(sid, did, scid, func_id)

    This method is responsible to get the function arguments saved to sqlite database during first debugging.

    Parameters:
        sid
        - Server Id
        did
        - Database Id
        scid
        - Schema Id
        func_id
        - Function Id
    """

    """Get the count of the existing data available in sqlite database"""
    DbgFuncArgsCount = DebuggerFunctionArguments.query.filter_by(
        server_id=sid, database_id=did, schema_id=scid, function_id=func_id).count()

    args_data = []

    if DbgFuncArgsCount:
        """Update the Debugger Function Arguments settings"""
        DbgFuncArgs = DebuggerFunctionArguments.query.filter_by(
            server_id=sid, database_id=did, schema_id=scid, function_id=func_id)

        args_list = DbgFuncArgs.all()

        for i in range(0, DbgFuncArgsCount):
            info = {
                "arg_id": args_list[i].arg_id,
                "is_null": args_list[i].is_null,
                "is_expression": args_list[i].is_expression,
                "use_default": args_list[i].use_default,
                "value": args_list[i].value
            }
            args_data.append(info)

        # As we do have entry available for that function so we need to add that entry
        return make_json_response(data={'result': args_data, 'args_count': DbgFuncArgsCount})
    else:
        # As we do not have any entry available for that function so we need to add that entry
        return make_json_response(data={'result': 'result', 'args_count': DbgFuncArgsCount})


@blueprint.route('/set_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>', methods=['POST'])
@login_required
def set_arguments_sqlite(sid, did, scid, func_id):
    """
    set_arguments_sqlite(sid, did, scid, func_id)

    This method is responsible for setting the value of function arguments to sqlite database

    Parameters:
        sid
        - Server Id
        did
        - Database Id
        scid
        - Schema Id
        func_id
        - Function Id
    """

    if request.values['data']:
        data = json.loads(request.values['data'], encoding='utf-8')

    try:
        for i in range(0, len(data)):
            DbgFuncArgsExists = DebuggerFunctionArguments.query.filter_by(
                server_id=data[i]['server_id'], database_id=data[i]['database_id'], schema_id=data[i]['schema_id'],
                function_id=data[i]['function_id'], arg_id=data[i]['arg_id']).count()

            # handle the Array list sent from the client
            array_string = ''
            if data[i]['value'].__class__.__name__ in ('list') and data[i]['value']:
                for k in range(0, len(data[i]['value'])):
                    array_string += data[i]['value'][k]['value']
                    if k != (len(data[i]['value']) - 1):
                        array_string += ','
            elif data[i]['value'].__class__.__name__ in ('list') and not data[i]['value']:
                array_string = ''
            else:
                array_string = data[i]['value']

            # Check if data is already available in database then update the existing value otherwise add the new value
            if DbgFuncArgsExists:
                DbgFuncArgs = DebuggerFunctionArguments.query.filter_by(
                    server_id=data[i]['server_id'], database_id=data[i]['database_id'], schema_id=data[i]['schema_id'],
                    function_id=data[i]['function_id'], arg_id=data[i]['arg_id']).first()

                DbgFuncArgs.is_null = data[i]['is_null']
                DbgFuncArgs.is_expression = data[i]['is_expression']
                DbgFuncArgs.use_default = data[i]['use_default']
                DbgFuncArgs.value = array_string
            else:
                debugger_func_args = DebuggerFunctionArguments(
                    server_id=data[i]['server_id'],
                    database_id=data[i]['database_id'],
                    schema_id=data[i]['schema_id'],
                    function_id=data[i]['function_id'],
                    arg_id=data[i]['arg_id'],
                    is_null=data[i]['is_null'],
                    is_expression=data[i]['is_expression'],
                    use_default=data[i]['use_default'],
                    value=array_string
                )

                db.session.add(debugger_func_args)

            db.session.commit()

    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            status=410,
            success=0,
            errormsg=e.message
        )

    return make_json_response(data={'status': True, 'result': 'Success'})


@blueprint.route('/poll_end_execution_result/<int:trans_id>/', methods=["GET"])
@login_required
def poll_end_execution_result(trans_id):
    """
    poll_end_execution_result(trans_id)

    This method polls the end of execution result messages returned by the database server.

    Parameters:
        trans_id
        - unique transaction id.
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': 'NotConnected',
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['conn_id'])

    if conn.connected():
        statusmsg = conn.status_message()
        status, result, col_info = conn.poll()
        if status == ASYNC_OK and session['functionData'][str(trans_id)]['language'] == 'edbspl':
            status = 'Success'
            return make_json_response(success=1, info=gettext("Execution Completed."),
                                      data={'status': status, 'status_message': statusmsg})
        if result:
            if 'ERROR' in result:
                status = 'ERROR'
                return make_json_response(info=gettext("Execution completed with error"),
                                          data={'status': status, 'status_message': result})
            else:
                status = 'Success'
                columns = []
                # Check column info is available or not
                if col_info is not None and len(col_info) > 0:
                    for col in col_info:
                        items = list(col.items())
                        column = dict()
                        column['name'] = items[0][1]
                        column['type_code'] = items[1][1]
                        columns.append(column)

                return make_json_response(success=1, info=gettext("Execution Completed."),
                                          data={'status': status, 'result': result,
                                                'col_info': columns, 'status_message': statusmsg})
        else:
            status = 'Busy'
    else:
        status = 'NotConnected'
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': result})


@blueprint.route('/poll_result/<int:trans_id>/', methods=["GET"])
@login_required
def poll_result(trans_id):
    """
    poll_result(trans_id)

    This method polls the result of the asynchronous query and returns the result.

    Parameters:
        trans_id
        - unique transaction id.
    """

    debugger_data = session['debuggerData']
    if str(trans_id) not in debugger_data:
        return make_json_response(
            data={'status': 'NotConnected',
                  'result': gettext('Not connected to server or connection with the server has been closed.')}
        )
    obj = debugger_data[str(trans_id)]

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(obj['server_id'])
    conn = manager.connection(did=obj['database_id'], conn_id=obj['exe_conn_id'])

    if conn.connected():
        status, result, my_result = conn.poll()
        if status == ASYNC_OK and result is not None:
            status = 'Success'
        else:
            status = 'Busy'
    else:
        status = 'NotConnected'
        result = gettext('Not connected to server or connection with the server has been closed.')

    return make_json_response(data={'status': status, 'result': result})
