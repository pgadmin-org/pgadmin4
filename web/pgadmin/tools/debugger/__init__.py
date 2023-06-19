##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the debugger"""

import json
import secrets
import re
import copy

from flask import render_template, request, current_app
from flask_babel import gettext
from flask_security import login_required
from werkzeug.user_agent import UserAgent

from pgadmin.utils import PgAdminModule, \
    SHORTCUT_FIELDS as shortcut_fields, \
    ACCESSKEY_FIELDS as accesskey_fields
from pgadmin.utils.ajax import bad_request
from pgadmin.utils.ajax import make_json_response, \
    internal_server_error, gone
from pgadmin.utils.driver import get_driver
from pgadmin.settings import get_setting

from config import PG_DEFAULT_DRIVER
from pgadmin.model import db, DebuggerFunctionArguments
from pgadmin.tools.debugger.utils.debugger_instance import DebuggerInstance
from pgadmin.browser.server_groups.servers.databases.extensions.utils \
    import get_extension_details
from pgadmin.utils.constants import PREF_LABEL_KEYBOARD_SHORTCUTS, \
    SERVER_CONNECTION_CLOSED
from pgadmin.preferences import preferences

MODULE_NAME = 'debugger'

# Constants
PLDBG_EXTN = 'pldbgapi'
ASYNC_OK = 1
DEBUGGER_SQL_PATH = 'debugger/sql'
DEBUGGER_SQL_V1_PATH = 'debugger/sql/v1'
DEBUGGER_SQL_V3_PATH = 'debugger/sql/v3'


class DebuggerModule(PgAdminModule):
    """
    class DebuggerModule(PgAdminModule)

        A module class for debugger which is derived from PgAdminModule.
    """
    LABEL = gettext("Debugger")

    def register_preferences(self):
        self.preference.register(
            'keyboard_shortcuts', 'btn_start',
            gettext('Accesskey (Continue/Start)'), 'keyboardshortcut',
            {
                'key': {
                    'key_code': 67,
                    'char': 'c'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=accesskey_fields
        )

        self.preference.register(
            'keyboard_shortcuts', 'btn_stop',
            gettext('Accesskey (Stop)'), 'keyboardshortcut',
            {
                'key': {
                    'key_code': 83,
                    'char': 's'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=accesskey_fields
        )

        self.preference.register(
            'keyboard_shortcuts', 'btn_step_into',
            gettext('Accesskey (Step into)'), 'keyboardshortcut',
            {
                'key': {
                    'key_code': 73,
                    'char': 'i'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=accesskey_fields
        )

        self.preference.register(
            'keyboard_shortcuts', 'btn_step_over',
            gettext('Accesskey (Step over)'), 'keyboardshortcut',
            {
                'key': {
                    'key_code': 79,
                    'char': 'o'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=accesskey_fields
        )

        self.preference.register(
            'keyboard_shortcuts', 'btn_toggle_breakpoint',
            gettext('Accesskey (Toggle breakpoint)'), 'keyboardshortcut',
            {
                'key': {
                    'key_code': 84,
                    'char': 't'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=accesskey_fields
        )

        self.preference.register(
            'keyboard_shortcuts', 'btn_clear_breakpoints',
            gettext('Accesskey (Clear all breakpoints)'), 'keyboardshortcut',
            {
                'key': {
                    'key_code': 88,
                    'char': 'x'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=accesskey_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'edit_grid_values',
            gettext('Edit grid values'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': True,
                'control': False,
                'key': {
                    'key_code': 81,
                    'char': 'q'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'move_previous',
            gettext('Previous tab'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': True,
                'control': False,
                'key': {
                    'key_code': 219,
                    'char': '['
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'move_next',
            gettext('Next tab'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': True,
                'control': False,
                'key': {
                    'key_code': 221,
                    'char': ']'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

        self.preference.register(
            'keyboard_shortcuts',
            'switch_panel',
            gettext('Switch Panel'),
            'keyboardshortcut',
            {
                'alt': True,
                'shift': True,
                'control': False,
                'key': {
                    'key_code': 9,
                    'char': 'Tab'
                }
            },
            category_label=PREF_LABEL_KEYBOARD_SHORTCUTS,
            fields=shortcut_fields
        )

    def get_exposed_url_endpoints(self):
        """
        Returns the list of URLs exposed to the client.
        """
        return ['debugger.index', 'debugger.init_for_function',
                'debugger.init_for_trigger',
                'debugger.direct', 'debugger.initialize_target_for_function',
                'debugger.initialize_target_for_trigger', 'debugger.close',
                'debugger.restart',
                'debugger.start_listener', 'debugger.execute_query',
                'debugger.messages',
                'debugger.start_execution', 'debugger.set_breakpoint',
                'debugger.clear_all_breakpoint', 'debugger.deposit_value',
                'debugger.select_frame', 'debugger.get_arguments',
                'debugger.set_arguments', 'debugger.clear_arguments',
                'debugger.poll_end_execution_result', 'debugger.poll_result'
                ]

    def on_logout(self):
        """
        This is a callback function when user logout from pgAdmin
        :param user:
        :return:
        """
        close_debugger_session(None, close_all=True)


blueprint = DebuggerModule(MODULE_NAME, __name__)


@blueprint.route("/", endpoint='index')
@login_required
def index():
    return bad_request(
        errormsg=gettext("This URL cannot be called directly.")
    )


def execute_dict_search_path(conn, sql, search_path):
    sql_search = "SET search_path={0};".format(search_path)
    status, res = conn.execute_void(sql_search)

    if not status:
        current_app.logger.debug(
            "Error setting the search path.")
        return False, res

    status, res = conn.execute_dict(sql)
    return status, res


def execute_async_search_path(conn, sql, search_path):
    sql_search = "SET search_path={0};".format(search_path)
    status, res = conn.execute_void(sql_search)

    if not status:
        current_app.logger.debug(
            "Error setting the search path.")
        return False, res

    status, res = conn.execute_async(sql)
    return status, res


def check_server_type(server_type, manager):
    """
    Check for server is ppas or not and is_proc_supported or not.
    :param server_type:
    :param manager:
    :return:
    """
    ppas_server = False
    is_proc_supported = False
    if server_type == 'ppas':
        ppas_server = True
    else:
        is_proc_supported = True if manager.version >= 110000 else False

    return ppas_server, is_proc_supported


def check_node_type(node_type, fid, trid, conn, ppas_server,
                    is_proc_supported):
    """
    Check node type and return fid.
    :param node_type:
    :param fid:
    :param trid:
    :param conn:
    :param ppas_server:
    :param is_proc_supported:
    :return:
    """
    if node_type == 'trigger':
        # Find trigger function id from trigger id
        sql = render_template(
            "/".join([DEBUGGER_SQL_PATH, 'get_trigger_function_info.sql']),
            table_id=fid, trigger_id=trid
        )

        status, tr_set = conn.execute_dict(sql)
        if not status:
            current_app.logger.debug(
                "Error retrieving trigger function information from database")
            return True, internal_server_error(errormsg=tr_set), None, None

        fid = tr_set['rows'][0]['tgfoid']

    # if ppas server and node type is edb function or procedure then extract
    # last argument as function id
    if node_type == 'edbfunc' or node_type == 'edbproc':
        fid = trid

    sql = ''
    sql = render_template(
        "/".join([DEBUGGER_SQL_PATH, 'get_function_debug_info.sql']),
        is_ppas_database=ppas_server,
        hasFeatureFunctionDefaults=True,
        fid=fid,
        is_proc_supported=is_proc_supported

    )
    status, r_set = conn.execute_dict(sql)
    if not status:
        current_app.logger.debug(
            "Error retrieving function information from database")
        return True, internal_server_error(errormsg=r_set), None, None

    if len(r_set['rows']) == 0:
        return True, gone(
            gettext("The specified %s could not be found." % node_type)), \
            None, None

    return False, None, r_set, status


@blueprint.route(
    '/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>',
    methods=['GET'], endpoint='init_for_function'
)
@blueprint.route(
    '/init/<node_type>/<int:sid>/<int:did>/<int:scid>/<int:fid>/<int:trid>',
    methods=['GET'], endpoint='init_for_trigger'
)
@login_required
def init_function(node_type, sid, did, scid, fid, trid=None):
    """
    init_function(node_type, sid, did, scid, fid, trid)

    This method is responsible to initialize the function required for
    debugging.
    This method is also responsible for storing the all functions data to
    session variable.
    This is only required for direct debugging. As Indirect debugging does
    not require these data because user will
    provide all the arguments and other functions information through another
    session to invoke the target.
    It will also create a unique transaction id and store the information
    into session variable.

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
    server_type = manager.server_type

    # Check server type is ppas or not
    ppas_server, is_proc_supported = check_server_type(server_type, manager)

    is_error, err_msg, r_set, status = check_node_type(node_type, fid, trid,
                                                       conn, ppas_server,
                                                       is_proc_supported)
    if is_error:
        return err_msg

    ret_status = status
    msg = ''
    # Check that the function is actually debuggable...
    if r_set['rows'][0]:
        # If func/proc is not defined in package body
        # then it is not debuggable
        if (r_set['rows'][0]['pkgname'] is not None or
            r_set['rows'][0]['pkgname'] != '') and \
                r_set['rows'][0]['prosrc'] == '':
            ret_status = False
            msg = r_set['rows'][0]['name'] + ' ' + \
                gettext("is not defined in package body.")

        # Function with a colon in the name cannot be debugged.
        # If this is an EDB wrapped function, no debugging allowed
        # Function with return type "trigger" cannot be debugged.
        elif ":" in r_set['rows'][0]['name']:
            ret_status = False
            msg = gettext(
                "Functions with a colon in the name cannot be debugged.")
        elif ppas_server and r_set['rows'][0]['prosrc'].lstrip().startswith(
                '$__EDBwrapped__$'):
            ret_status = False
            msg = gettext(
                "EDB Advanced Server wrapped functions cannot be debugged.")
        # We cannot debug if PPAS and argument mode is VARIADIC
        elif ppas_server and r_set['rows'][0]['lanname'] == 'edbspl' and \
                r_set['rows'][0]['proargmodes'] is not None and \
                'v' in r_set['rows'][0]['proargmodes']:
            ret_status = False
            msg = gettext(
                "An 'edbspl' target with a variadic argument is not supported"
                " and cannot be debugged."
            )
        else:
            is_error, err_msg, ret_status, msg = check_debugger_enabled(
                conn, ret_status)

            if is_error:
                return err_msg

    # Return the response that function cannot be debug...
    if not ret_status:
        current_app.logger.debug(msg)
        return internal_server_error(msg)

    data = {'name': r_set['rows'][0]['proargnames'],
            'type': r_set['rows'][0]['proargtypenames'],
            'use_default': r_set['rows'][0]['pronargdefaults'],
            'default_value': r_set['rows'][0]['proargdefaults'],
            'require_input': True}

    # Below will check do we really required for the user input arguments and
    # show input dialog
    data['require_input'] = check_user_ip_req(r_set, data)

    r_set['rows'][0]['require_input'] = data['require_input']

    # Create a debugger instance
    de_inst = DebuggerInstance()
    de_inst.function_data = {
        'oid': fid,
        'name': r_set['rows'][0]['name'],
        'is_func': r_set['rows'][0]['isfunc'],
        'is_ppas_database': ppas_server,
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

    return make_json_response(
        data=dict(
            debug_info=r_set['rows'],
            trans_id=de_inst.trans_id
        ),
        status=200
    )


def check_debugger_enabled(conn, ret_status):
    """
    Check debugger enabled or not, also check pldbgapi extension is present
    or not
    :param conn:
    :param ret_status:
    :return:
    """
    msg = ''
    status_in, rid_tar = conn.execute_scalar(
        "SELECT count(*) FROM pg_catalog.pg_proc WHERE "
        "proname = 'pldbg_get_target_info'"
    )
    if not status_in:
        current_app.logger.debug(
            "Failed to find the pldbgapi extension in this database.")
        return True, internal_server_error(
            gettext("Failed to find the pldbgapi extension in "
                    "this database.")
        ), None, None

    # We also need to check to make sure that the debugger library is
    # also available.
    status_in, ret_oid = conn.execute_scalar(
        "SELECT count(*) FROM pg_catalog.pg_proc WHERE "
        "proname = 'plpgsql_oid_debug'"
    )
    if not status_in:
        current_app.logger.debug(
            "Failed to find the pldbgapi extension in this database.")
        return True, internal_server_error(
            gettext("Failed to find the pldbgapi extension in "
                    "this database.")
        ), None, None

    # Debugger plugin is configured but pldggapi extension is not
    # created so return error
    if rid_tar == '0' or ret_oid == '0':
        msg = gettext(
            "The debugger plugin is not enabled. Please create the "
            "pldbgapi extension in this database."
        )
        ret_status = False
    return False, None, ret_status, msg


def check_user_ip_req(r_set, data):
    """
    Check if user input is required or not for debugger.
    :param r_set:
    :param data:
    :return:
    """
    if not r_set['rows'][0]['proargtypenames']:
        return False

    if r_set['rows'][0]['pkg'] != 0 and \
            r_set['rows'][0]['pkgconsoid'] != 0:
        data['require_input'] = True

    if r_set['rows'][0]['proargmodes']:
        pro_arg_modes = r_set['rows'][0]['proargmodes'].split(",")
        for pr_arg_mode in pro_arg_modes:
            if pr_arg_mode == 'o' or pr_arg_mode == 't':
                data['require_input'] = False
            else:
                data['require_input'] = True
                break

    return data['require_input']


@blueprint.route('/direct/<int:trans_id>', methods=['GET'], endpoint='direct')
@login_required
def direct_new(trans_id):
    de_inst = DebuggerInstance(trans_id)

    # Return from the function if transaction id not found
    if de_inst.debugger_data is None:
        return make_json_response(data={'status': True})

    # if indirect debugging pass value 0 to client and for direct debugging
    # pass it to 1
    debug_type = 0 if de_inst.debugger_data['debug_type'] == 'indirect' else 1

    """
    Animations and transitions are not automatically GPU accelerated and by
    default use browser's slow rendering engine.
    We need to set 'translate3d' value of '-webkit-transform' property in
    order to use GPU.
    After applying this property under linux, Webkit calculates wrong position
    of the elements so panel contents are not visible.
    To make it work, we need to explicitly set '-webkit-transform' property
    to 'none' for .ajs-notifier, .ajs-message, .ajs-modal classes.

    This issue is only with linux runtime application and observed in Query
    tool and debugger. When we open 'Open File' dialog then whole Query-tool
    panel content is not visible though it contains HTML element in back end.

    The port number should have already been set by the runtime if we're
    running in desktop mode.
    """
    is_linux_platform = False

    from sys import platform as _platform
    if "linux" in _platform:
        is_linux_platform = True

    # We need client OS information to render correct Keyboard shortcuts
    user_agent = UserAgent(request.headers.get('User-Agent'))

    function_arguments = '('
    if de_inst.function_data is not None and \
        'args_name' in de_inst.function_data and \
        de_inst.function_data['args_name'] is not None and \
            de_inst.function_data['args_name'] != '':
        args_name_list = de_inst.function_data['args_name'].split(",")
        args_type_list = de_inst.function_data['args_type'].split(",")
        index = 0
        for args_name in args_name_list:
            function_arguments = '{}{} {}, '.format(function_arguments,
                                                    args_name,
                                                    args_type_list[index])
            index += 1
        # Remove extra comma and space from the arguments list
        if len(args_name_list) > 0:
            function_arguments = function_arguments[:-2]

    function_arguments += ')'

    layout = get_setting('Debugger/Layout')

    function_name_with_arguments = \
        de_inst.debugger_data['function_name'] + function_arguments

    manager = get_driver(PG_DEFAULT_DRIVER).get_connection(
        de_inst.debugger_data['server_id'],
        database=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['conn_id'])
    title = get_debugger_title(de_inst.debugger_data['function_name'],
                               function_arguments,
                               de_inst.function_data['schema'], manager.db)

    return render_template(
        "debugger/direct.html",
        _=gettext,
        function_name=de_inst.debugger_data['function_name'],
        title=title,
        uniqueId=trans_id,
        debug_type=debug_type,
        is_desktop_mode=current_app.PGADMIN_RUNTIME,
        is_linux=is_linux_platform,
        client_platform=user_agent.platform,
        function_name_with_arguments=function_name_with_arguments,
        layout=layout
    )


def get_debugger_title(function_name, args, schema, database):
    browser_pref = preferences('browser', 'debugger_tab_title_placeholder')
    placeholders = browser_pref.json['value']
    title = placeholders.replace('%FUNCTION%', function_name)
    if title.find('%ARGS%') != -1:
        args = args.split('(')[-1][:-1]
        title = title.replace('%ARGS%', args)
    title = title.replace('%SCHEMA%', schema)
    title = title.replace('%DATABASE%', database)

    return title


def get_debugger_version(conn, search_path):
    """
    Function returns the debugger version.
    :param conn:
    :return:
    """
    debugger_version = 0
    status, res = conn.execute_void("SET search_path={0};".format(search_path))

    if not status:
        return False, internal_server_error(errormsg=res)

    status, rid = conn.execute_scalar(
        "SELECT COUNT(*) FROM pg_catalog.pg_proc p"
        " LEFT JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid"
        " WHERE n.nspname = ANY(current_schemas(false)) AND"
        " p.proname = 'pldbg_get_proxy_info';"
    )

    if not status:
        return False, internal_server_error(errormsg=rid)

    if int(rid) == 0:
        debugger_version = 1
    else:
        status, rid = conn.execute_scalar(
            "SELECT proxyapiver FROM pldbg_get_proxy_info();")

        if status and rid in (2, 3):
            debugger_version = rid

    return True, debugger_version


def validate_debug(conn, debug_type, is_superuser):
    """
    This function is used to validate the options required for debugger.
    :param conn:
    :param debug_type:
    :param is_superuser:
    :return:
    """
    if debug_type == 'indirect':
        if not is_superuser:
            # If user is super user then we should check debugger library is
            # loaded or not
            msg = gettext("You must be a superuser to set a global breakpoint"
                          " and perform indirect debugging.")
            return False, internal_server_error(errormsg=msg)

        status, rid_pre = conn.execute_scalar(
            "SHOW shared_preload_libraries"
        )

        if not status:
            return False, internal_server_error(
                gettext("Could not fetch debugger plugin information.")
            )

        # Need to check if plugin is really loaded or not with
        # "plugin_debugger" string
        if "plugin_debugger" not in rid_pre:
            msg = gettext(
                "The debugger plugin is not enabled. "
                "Please add the plugin to the shared_preload_libraries "
                "setting in the postgresql.conf file and restart the "
                "database server for indirect debugging."
            )
            current_app.logger.debug(msg)
            return False, internal_server_error(msg)

    # Check debugger extension version for EPAS 11 and above.
    # If it is 1.0 then return error to upgrade the extension.
    status, ext_version = conn.execute_scalar(
        "SELECT installed_version FROM pg_catalog.pg_available_extensions "
        "WHERE name = 'pldbgapi'"
    )
    if not status:
        return False, internal_server_error(errormsg=ext_version)
    if conn.manager.server_type == 'ppas' and conn.manager.sversion >= 110000 \
            and float(ext_version) < 1.1:
        return False, internal_server_error(
            errormsg=gettext("Please upgrade the pldbgapi extension "
                             "to 1.1 or above and try again."))

    return True, None


def get_search_path(conn):
    status, res = get_extension_details(conn, PLDBG_EXTN)
    if not status:
        return False, internal_server_error(errormsg=res)

    status, res = conn.execute_scalar(
        "SELECT current_setting('search_path')||',{0}'".format(res['schema']))

    if not status:
        return False, internal_server_error(errormsg=res)

    return True, res


@blueprint.route(
    '/initialize_target/<debug_type>/<int:trans_id>/<int:sid>/<int:did>/'
    '<int:scid>/<int:func_id>',
    methods=['POST'],
    endpoint='initialize_target_for_function'
)
@blueprint.route(
    '/initialize_target/<debug_type>/<int:trans_id>/<int:sid>/<int:did>/'
    '<int:scid>/<int:func_id>/<int:tri_id>',
    methods=['POST'],
    endpoint='initialize_target_for_trigger'
)
@login_required
def initialize_target(debug_type, trans_id, sid, did,
                      scid, func_id, tri_id=None):
    """
    initialize_target(debug_type, sid, did, scid, func_id, tri_id)

    This method is responsible for creating an asynchronous connection.

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
    conn_id = str(secrets.choice(range(1, 9999999)))
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
    conn = manager.connection(did=did, conn_id=conn_id)
    data_obj = {}

    # Connect the Server
    status, msg = conn.connect()
    if not status:
        return internal_server_error(errormsg=str(msg))

    user = manager.user_info
    status, error = validate_debug(conn, debug_type, user['is_superuser'])
    if not status:
        return error

    if tri_id is not None:
        # Find trigger function id from trigger id
        sql = render_template(
            "/".join([DEBUGGER_SQL_PATH, 'get_trigger_function_info.sql']),
            table_id=func_id, trigger_id=tri_id
        )

        status, tr_set = conn.execute_dict(sql)
        if not status:
            current_app.logger.debug(
                "Error retrieving trigger function information from database")
            return internal_server_error(errormsg=tr_set)

        func_id = tr_set['rows'][0]['tgfoid']

    status, search_path = get_search_path(conn)
    if not status:
        return search_path

    # Find out the debugger version and store it in session variables
    status, debugger_version = get_debugger_version(conn, search_path)
    if not status:
        return debugger_version

    # Add the debugger version information to pgadmin4 log file
    current_app.logger.debug("Debugger version is: %d", debugger_version)

    de_inst = DebuggerInstance(trans_id)
    # We need to pass the value entered by the user in dialog for direct
    # debugging, Here we get the value in case of direct debugging so update
    # the session variables accordingly, For indirect debugging user will
    # provide the data from another session so below condition will
    # be be required
    if request.data:
        de_inst.function_data['args_value'] = \
            json.loads(request.data)

    # Update the debugger data session variable
    # Here frame_id is required when user debug the multilevel function.
    # When user select the frame from client we need to update the frame
    # here and set the breakpoint information on that function oid
    de_inst.debugger_data = {
        'conn_id': conn_id,
        'server_id': sid,
        'database_id': did,
        'schema_id': scid,
        'function_id': func_id,
        'function_name': de_inst.function_data['name'],
        'debug_type': debug_type,
        'debugger_version': debugger_version,
        'search_path': search_path,
        'frame_id': 0,
        'restart_debug': 0
    }

    de_inst.update_session()
    data_obj['db_name'] = conn.db

    return make_json_response(data={'status': status,
                                    'debuggerTransId': trans_id,
                                    'data_obj': data_obj})


@blueprint.route(
    '/close/<int:trans_id>', methods=["DELETE"], endpoint='close'
)
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

    close_debugger_session(trans_id)
    return make_json_response(data={'status': True})


@blueprint.route(
    '/restart/<int:trans_id>', methods=['GET'], endpoint='restart'
)
@login_required
def restart_debugging(trans_id):
    """
    restart_debugging(trans_id)

    This method is responsible to restart the same function for the debugging.

    Parameters:
        trans_id
        - Transaction ID
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['conn_id'])

    if conn.connected():
        # Update the session variable "restart_debug" to know that same
        # function debugging has been restarted. Delete the existing debugger
        # data in session variable and update with new data
        if de_inst.debugger_data['restart_debug'] == 0:
            de_inst.debugger_data['restart_debug'] = 1
            de_inst.update_session()

        de_inst.function_data.update({
            'server_id': de_inst.debugger_data['server_id'],
            'database_id': de_inst.debugger_data['database_id'],
            'schema_id': de_inst.debugger_data['schema_id'],
            'function_id': de_inst.debugger_data['function_id'],
            'trans_id': str(trans_id),
            'proargmodes': de_inst.function_data['arg_mode'],
            'proargtypenames': de_inst.function_data['args_type'],
            'pronargdefaults': de_inst.function_data['use_default'],
            'proargdefaults': de_inst.function_data['default_value'],
            'proargnames': de_inst.function_data['args_name'],
            'require_input': de_inst.function_data['require_input']
        })

        return make_json_response(
            data={
                'status': True, 'restart_debug': True,
                'result': de_inst.function_data
            }
        )
    else:
        status = False
        result = SERVER_CONNECTION_CLOSED
        return make_json_response(data={'status': status, 'result': result})


@blueprint.route(
    '/start_listener/<int:trans_id>', methods=['POST'],
    endpoint='start_listener'
)
@login_required
def start_debugger_listener(trans_id):
    """
    start_debugger_listener(trans_id)

    This method is responsible to listen and get the required information
    requested by user during debugging

    Parameters:
        trans_id
        - Transaction ID
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['conn_id'])

    ver = manager.version
    server_type = manager.server_type

    # find the debugger version and execute the query accordingly
    dbg_version = de_inst.debugger_data['debugger_version']
    if dbg_version <= 2:
        template_path = DEBUGGER_SQL_V1_PATH
    else:
        template_path = DEBUGGER_SQL_V3_PATH

    # If user again start the same debug function with different arguments
    # then we need to save that values to session variable and database.
    if request.data:
        data = json.loads(request.data)
        if data:
            de_inst.function_data['args_value'] = data
            de_inst.update_session()

    if conn.connected():

        # For the direct debugging extract the function arguments values from
        # user and pass to jinja template to create the query for execution.
        if de_inst.debugger_data['debug_type'] == 'direct':
            str_query = ''
            if de_inst.function_data['pkg'] == 0:
                # Form the function name with schema name
                func_name = driver.qtIdent(
                    conn,
                    de_inst.function_data['schema'],
                    de_inst.function_data['name']
                )
            else:
                # Form the edb package function/procedure name with schema name
                func_name = driver.qtIdent(
                    conn, de_inst.function_data['schema'],
                    de_inst.function_data['pkgname'],
                    de_inst.function_data['name']
                )

            if de_inst.debugger_data['restart_debug'] == 0:
                # render the SQL template and send the query to server
                if de_inst.function_data['language'] == 'plpgsql':
                    sql = render_template(
                        "/".join([template_path,
                                  'debug_plpgsql_execute_target.sql']),
                        packge_oid=de_inst.function_data['pkg'],
                        function_oid=de_inst.debugger_data['function_id']
                    )
                else:
                    sql = render_template(
                        "/".join([template_path,
                                  'debug_spl_execute_target.sql']),
                        packge_oid=de_inst.function_data['pkg'],
                        function_oid=de_inst.debugger_data['function_id']
                    )
                status, res = execute_dict_search_path(
                    conn, sql, de_inst.debugger_data['search_path'])
                if not status:
                    return internal_server_error(errormsg=res)

            if de_inst.function_data['arg_mode']:
                # In EDBAS 90, if an SPL-function has both an OUT-parameter
                # and a return value (which is not possible on PostgreSQL
                # otherwise), the return value is transformed into an extra
                # OUT-parameter named "_retval_"
                if de_inst.function_data['args_name']:
                    arg_name = de_inst.function_data['args_name'].split(",")
                    if '_retval_' in arg_name:
                        arg_mode = de_inst.function_data['arg_mode'].split(",")
                        arg_mode.pop()
                    else:
                        arg_mode = de_inst.function_data['arg_mode'].split(",")
                else:
                    arg_mode = de_inst.function_data['arg_mode'].split(",")
            else:
                arg_mode = ['i'] * len(
                    de_inst.function_data['args_type'].split(",")
                )

            if de_inst.function_data['args_type']:
                if de_inst.function_data['args_name']:
                    arg_name = de_inst.function_data['args_name'].split(",")
                    if '_retval_' in arg_name:
                        arg_type = de_inst.function_data[
                            'args_type'].split(",")
                        arg_type.pop()
                    else:
                        arg_type = de_inst.function_data[
                            'args_type'].split(",")
                else:
                    arg_type = de_inst.function_data['args_type'].split(",")

            debugger_args_values = []
            if de_inst.function_data['args_value']:
                debugger_args_values = copy.deepcopy(
                    de_inst.function_data['args_value'])
                for arg in debugger_args_values:
                    if arg['type'].endswith('[]') and arg['value'] and arg[
                            'value'] != 'NULL':
                        val_list = arg['value'][1:-1].split(',')
                        arg['value'] = get_debugger_arg_val(val_list)

            # Below are two different template to execute and start executer
            if manager.server_type != 'pg' and manager.version < 90300:
                str_query = render_template(
                    "/".join([DEBUGGER_SQL_PATH, 'execute_edbspl.sql']),
                    func_name=func_name,
                    is_func=de_inst.function_data['is_func'],
                    lan_name=de_inst.function_data['language'],
                    ret_type=de_inst.function_data['return_type'],
                    data=debugger_args_values,
                    arg_type=arg_type,
                    args_mode=arg_mode,
                    conn=conn
                )
            else:
                str_query = render_template(
                    "/".join([DEBUGGER_SQL_PATH, 'execute_plpgsql.sql']),
                    func_name=func_name,
                    is_func=de_inst.function_data['is_func'],
                    ret_type=de_inst.function_data['return_type'],
                    data=debugger_args_values,
                    is_ppas_database=de_inst.function_data['is_ppas_database'],
                    conn=conn
                )

            status, result = execute_async_search_path(
                conn, str_query, de_inst.debugger_data['search_path'])

            if not status:
                return internal_server_error(errormsg=result)
        else:

            sql = render_template(
                "/".join([template_path, 'create_listener.sql']))

            status, res = execute_dict_search_path(
                conn, sql, de_inst.debugger_data['search_path'])
            if not status:
                return internal_server_error(errormsg=res)

            # Get and store the session variable which is required to fetch
            # other information during debugging
            int_session_id = res['rows'][0]['pldbg_create_listener']

            # In EnterpriseDB versions <= 9.1 the
            # pldbg_set_global_breakpoint function took five arguments,
            # the 2nd argument being the package's OID, if any. Starting
            # with 9.2, the package OID argument is gone, and the function
            # takes four arguments like the community version has always
            # done.
            if server_type == 'ppas' and ver <= 90100:
                sql = render_template(
                    "/".join([template_path, 'add_breakpoint_edb.sql']),
                    session_id=int_session_id,
                    function_oid=de_inst.debugger_data['function_id']
                )

                status, res = execute_dict_search_path(
                    conn, sql, de_inst.debugger_data['search_path'])
                if not status:
                    return internal_server_error(errormsg=res)
            else:
                sql = render_template(
                    "/".join([template_path, 'add_breakpoint_pg.sql']),
                    session_id=int_session_id,
                    function_oid=de_inst.debugger_data['function_id']
                )

                status, res = execute_dict_search_path(
                    conn, sql, de_inst.debugger_data['search_path'])
                if not status:
                    return internal_server_error(errormsg=res)

            # wait for the target
            sql = render_template(
                "/".join([template_path, 'wait_for_target.sql']),
                session_id=int_session_id
            )

            de_inst.debugger_data['exe_conn_id'] = \
                de_inst.debugger_data['conn_id']
            de_inst.debugger_data['restart_debug'] = 1
            de_inst.debugger_data['frame_id'] = 0
            de_inst.debugger_data['session_id'] = int_session_id
            de_inst.update_session()

            status, res = execute_async_search_path(
                conn, sql, de_inst.debugger_data['search_path'])
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                data={'status': status, 'result': res}
            )
    else:
        status = False
        result = SERVER_CONNECTION_CLOSED

    return make_json_response(data={'status': status, 'result': result})


def get_debugger_arg_val(val_list):
    """Get debugger arguments is list"""
    debugger_args_data = []
    for _val in val_list:
        debugger_args_data.append({
            'value': _val
        })
    return debugger_args_data


@blueprint.route(
    '/execute_query/<int:trans_id>/<query_type>', methods=['GET'],
    endpoint='execute_query'
)
@login_required
def execute_debugger_query(trans_id, query_type):
    """
    execute_debugger_query(trans_id, query_type)

    This method is responsible to execute the query and return value. As this
    method is generic so user has to pass the query_type to get the required
    information for debugging.

    e.g. If user want to execute 'step_into' then query_type='step_into'.
         If user want to execute 'continue' then query_type='continue'

    Parameters:
        trans_id
        - Transaction ID
        query_type
        - Type of query to execute
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    template_path = DEBUGGER_SQL_V1_PATH \
        if de_inst.debugger_data['debugger_version'] <= 2 \
        else DEBUGGER_SQL_V3_PATH

    if not conn.connected():
        result = SERVER_CONNECTION_CLOSED
        return internal_server_error(errormsg=result)

    sql = render_template(
        "/".join([template_path, query_type + ".sql"]),
        session_id=de_inst.debugger_data['session_id']
    )
    # As the query type is continue or step_into or step_over then we
    # may get result after some time so poll the result.
    # We need to update the frame id variable when user move the next
    # step for debugging.
    if query_type in ('continue', 'step_into', 'step_over'):
        # We should set the frame_id to 0 when execution starts.
        de_inst.debugger_data['frame_id'] = 0
        de_inst.update_session()

        status, result = execute_async_search_path(
            conn, sql, de_inst.debugger_data['search_path'])

        if result and 'select() failed waiting for target' in result:
            status = True
            result = None

        if not status:
            return internal_server_error(errormsg=result)
        return make_json_response(
            data={'status': status, 'result': result}
        )

    status, result = execute_dict_search_path(
        conn, sql, de_inst.debugger_data['search_path'])
    if not status:
        return internal_server_error(errormsg=result)
    if query_type == 'abort_target':
        return make_json_response(
            info=gettext('Debugging aborted successfully.'),
            data={'status': 'Success', 'result': result}
        )

    return make_json_response(
        data={'status': 'Success', 'result': result['rows']}
    )


@blueprint.route(
    '/messages/<int:trans_id>/', methods=["GET"], endpoint='messages'
)
@login_required
def messages(trans_id):
    """
    messages(trans_id)

    This method polls the messages returned by the database server.

    Parameters:
        trans_id
        - unique transaction id.
    """
    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': 'NotConnected',
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['conn_id'])

    port_number = ''

    if conn.connected():
        status = 'Busy'
        notify = conn.messages()
        if notify:
            # In notice message we need to find "PLDBGBREAK" string to find
            # the port number to attach.
            # Notice message returned by the server is
            # "NOTICE:  PLDBGBREAK:7".
            # From the above message we need to find out port number
            # as "7" so below logic will find 7 as port number
            # and attach listened to that port number
            tmp_list = [x for x in notify if 'PLDBGBREAK' in x]
            if len(tmp_list) > 0:
                port_number = re.search(r'\d+', tmp_list[0])
                if port_number is not None:
                    status = 'Success'
                    port_number = port_number.group(0)

        return make_json_response(
            data={'status': status, 'result': port_number}
        )
    else:
        result = SERVER_CONNECTION_CLOSED
        return internal_server_error(errormsg=str(result))


@blueprint.route(
    '/start_execution/<int:trans_id>/<int:port_num>', methods=['GET'],
    endpoint='start_execution'
)
@login_required
def start_execution(trans_id, port_num):
    """
    start_execution(trans_id, port_num)

    This method is responsible for creating an asynchronous connection for
    execution thread. Also store the session id into session return with
    attach port query for the direct debugging.

    Parameters:
        trans_id
        - Transaction ID
        port_num
        - Port number to attach
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': 'NotConnected',
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    # Create asynchronous connection using random connection id.
    exe_conn_id = str(secrets.choice(range(1, 9999999)))
    try:
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
            de_inst.debugger_data['server_id'])
        conn = manager.connection(
            did=de_inst.debugger_data['database_id'],
            conn_id=exe_conn_id)
    except Exception as e:
        return internal_server_error(errormsg=str(e))

    # Connect the Server
    status, msg = conn.connect()
    if not status:
        return internal_server_error(errormsg=str(msg))

    # find the debugger version and execute the query accordingly
    dbg_version = de_inst.debugger_data['debugger_version']
    if dbg_version <= 2:
        template_path = DEBUGGER_SQL_V1_PATH
    else:
        template_path = DEBUGGER_SQL_V3_PATH

    # connect to port and store the session ID in the session variables
    sql = render_template(
        "/".join([template_path, 'attach_to_port.sql']), port=port_num)
    status_port, res_port = execute_dict_search_path(
        conn, sql, de_inst.debugger_data['search_path'])
    if not status_port:
        return internal_server_error(errormsg=res_port)

    de_inst.debugger_data['restart_debug'] = 0
    de_inst.debugger_data['frame_id'] = 0
    de_inst.debugger_data['exe_conn_id'] = exe_conn_id
    de_inst.debugger_data['debugger_version'] = dbg_version
    de_inst.debugger_data['session_id'] = \
        res_port['rows'][0]['pldbg_attach_to_port']
    de_inst.update_session()

    return make_json_response(
        data={
            'status': 'Success',
            'result': res_port['rows'][0]['pldbg_attach_to_port']
        }
    )


@blueprint.route(
    '/set_breakpoint/<int:trans_id>/<int:line_no>/<int:set_type>',
    methods=['GET'], endpoint='set_breakpoint'
)
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

    de_inst = DebuggerInstance(trans_id)

    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = de_inst.debugger_data['debugger_version']
    if dbg_version <= 2:
        template_path = DEBUGGER_SQL_V1_PATH
    else:
        template_path = DEBUGGER_SQL_V3_PATH

    query_type = ''

    # We need to find out function OID before sending the foid to set the
    # breakpoint because it may possible that debugging function has multi
    # level function for debugging so we need to save the debug level to
    # session variable and pass tha appropriate foid to set the breakpoint.
    sql_ = render_template(
        "/".join([template_path, "get_stack_info.sql"]),
        session_id=de_inst.debugger_data['session_id']
    )
    status, res_stack = execute_dict_search_path(
        conn, sql_, de_inst.debugger_data['search_path'])
    if not status:
        return internal_server_error(errormsg=res_stack)

    # For multilevel function debugging, we need to fetch current selected
    # frame's function oid for setting the breakpoint. For single function
    # the frame id will be 0.
    foid = res_stack['rows'][de_inst.debugger_data['frame_id']]['func']

    # Check the result of the stack before setting the breakpoint
    if conn.connected():
        if set_type == 1:
            query_type = 'set_breakpoint'
        else:
            query_type = 'clear_breakpoint'

        sql = render_template(
            "/".join([template_path, query_type + ".sql"]),
            session_id=de_inst.debugger_data['session_id'],
            foid=foid, line_number=line_no
        )

        status, result = execute_dict_search_path(
            conn, sql, de_inst.debugger_data['search_path'])
        result = result['rows']
        if not status:
            return internal_server_error(errormsg=result)
    else:
        status = False
        result = SERVER_CONNECTION_CLOSED

    return make_json_response(
        data={'status': status, 'result': result}
    )


def get_debugger_template_path(de_inst):
    # find the debugger version and execute the query accordingly
    dbg_version = de_inst.debugger_data['debugger_version']
    if dbg_version <= 2:
        template_path = DEBUGGER_SQL_V1_PATH
    else:
        template_path = DEBUGGER_SQL_V3_PATH

    return template_path


@blueprint.route(
    '/clear_all_breakpoint/<int:trans_id>', methods=['POST'],
    endpoint='clear_all_breakpoint'
)
@login_required
def clear_all_breakpoint(trans_id):
    """
    clear_all_breakpoint(trans_id)

    This method is responsible to clear all the breakpoint

    Parameters:
        trans_id
        - Transaction ID
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED
            }
        )
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    template_path = get_debugger_template_path(de_inst)

    status = True
    result = ''

    if not conn.connected():
        status = False
        result = SERVER_CONNECTION_CLOSED

        return make_json_response(
            data={'status': status, 'result': result}
        )

    if 'breakpoint_list' in json.loads(request.data):
        line_numbers = []
        if json.loads(request.data)['breakpoint_list'] is not None and \
                json.loads(request.data)['breakpoint_list'] != '':
            line_numbers = json.loads(request.data)[
                'breakpoint_list'].split(",")

        for line_no in line_numbers:
            sql = render_template(
                "/".join([template_path, "clear_breakpoint.sql"]),
                session_id=de_inst.debugger_data['session_id'],
                foid=de_inst.debugger_data['function_id'],
                line_number=line_no
            )

            status, result = execute_dict_search_path(
                conn, sql, de_inst.debugger_data['search_path'])
            if not status:
                return internal_server_error(errormsg=result)
            result = result['rows']
    else:
        return make_json_response(data={'status': False})

    return make_json_response(
        data={'status': status, 'result': result}
    )


@blueprint.route(
    '/deposit_value/<int:trans_id>', methods=['POST'],
    endpoint='deposit_value'
)
@login_required
def deposit_parameter_value(trans_id):
    """
    deposit_parameter_value(trans_id)

    This method is responsible to change the value of variables

    Parameters:
        trans_id
        - Transaction ID
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED
            }
        )
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = de_inst.debugger_data['debugger_version']
    if dbg_version <= 2:
        template_path = DEBUGGER_SQL_V1_PATH
    else:
        template_path = DEBUGGER_SQL_V3_PATH

    if conn.connected():
        # get the data sent through post from client
        data = json.loads(request.data)

        if data:
            sql = render_template(
                "/".join([template_path, "deposit_value.sql"]),
                session_id=de_inst.debugger_data['session_id'],
                var_name=data[0]['name'], line_number=-1,
                val=data[0]['value'], conn=conn
            )

            status, result = execute_dict_search_path(
                conn, sql, de_inst.debugger_data['search_path'])
            if not status:
                return internal_server_error(errormsg=result)

            # Check if value deposited successfully or not and depending on
            # the result, return the message information.
            if result['rows'][0]['pldbg_deposit_value']:
                info = gettext('Value deposited successfully')
            else:
                info = gettext('Error while setting the value')
            return make_json_response(
                data={
                    'status': status,
                    'info': info,
                    'result': result['rows'][0]['pldbg_deposit_value']
                }
            )
    else:
        status = False
        result = SERVER_CONNECTION_CLOSED

    return make_json_response(data={'status': status, 'result': result})


@blueprint.route(
    '/select_frame/<int:trans_id>/<int:frame_id>', methods=['GET'],
    endpoint='select_frame'
)
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
    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['exe_conn_id'])

    # find the debugger version and execute the query accordingly
    dbg_version = de_inst.debugger_data['debugger_version']
    if dbg_version <= 2:
        template_path = DEBUGGER_SQL_V1_PATH
    else:
        template_path = DEBUGGER_SQL_V3_PATH

    de_inst.debugger_data['frame_id'] = frame_id
    de_inst.update_session()

    if conn.connected():
        sql = render_template(
            "/".join([template_path, "select_frame.sql"]),
            session_id=de_inst.debugger_data['session_id'],
            frame_id=frame_id
        )

        status, result = execute_dict_search_path(
            conn, sql, de_inst.debugger_data['search_path'])
        if not status:
            return internal_server_error(errormsg=result)
    else:
        status = False
        result = SERVER_CONNECTION_CLOSED

    return make_json_response(
        data={'status': status, 'result': result['rows']}
    )


@blueprint.route(
    '/get_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>',
    methods=['GET'], endpoint='get_arguments'
)
@login_required
def get_arguments_sqlite(sid, did, scid, func_id):
    """
    get_arguments_sqlite(sid, did, scid, func_id)

    This method is responsible to get the function arguments saved to sqlite
    database during first debugging.

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
    dbg_func_args_count = int(DebuggerFunctionArguments.query.filter_by(
        server_id=sid,
        database_id=did,
        schema_id=scid,
        function_id=func_id
    ).count())

    args_data = []

    if dbg_func_args_count:
        """Update the Debugger Function Arguments settings"""
        dbg_func_args = DebuggerFunctionArguments.query.filter_by(
            server_id=sid,
            database_id=did,
            schema_id=scid,
            function_id=func_id
        )

        args_list = dbg_func_args.all()

        for i in range(0, dbg_func_args_count):
            info = {
                "arg_id": args_list[i].arg_id,
                "is_null": args_list[i].is_null,
                "is_expression": args_list[i].is_expression,
                "use_default": args_list[i].use_default,
                "value": args_list[i].value
            }
            args_data.append(info)

        # As we do have entry available for that function so we need to add
        # that entry
        return make_json_response(
            data={'result': args_data, 'args_count': dbg_func_args_count}
        )
    else:
        # As we do not have any entry available for that function so we need
        # to add that entry
        return make_json_response(
            data={'result': 'result', 'args_count': dbg_func_args_count}
        )


def get_array_string(data, i):
    """
    Get array string.
    :param data: data.
    :param i: index
    :return: Array string.
    """
    array_string = ''

    if data[i]['value']:
        array_string = data[i]['value'][1:-1].split(',')
        array_string = ','.join(array_string)
    else:
        array_string = data[i]['value']

    return array_string


@blueprint.route(
    '/set_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>',
    methods=['POST'], endpoint='set_arguments'
)
@login_required
def set_arguments_sqlite(sid, did, scid, func_id):
    """
    set_arguments_sqlite(sid, did, scid, func_id)

    This method is responsible for setting the value of function arguments
    to sqlite database

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

    if request.data:
        data = json.loads(request.data)

    try:
        for i in range(0, len(data)):
            dbg_func_args_exists = int(
                DebuggerFunctionArguments.query.filter_by(
                    server_id=data[i]['server_id'],
                    database_id=data[i]['database_id'],
                    schema_id=data[i]['schema_id'],
                    function_id=data[i]['function_id'],
                    arg_id=data[i]['arg_id']).count())

            # handle the Array list sent from the client
            array_string = ''
            if 'value' in data[i]:
                array_string = data[i]['value']

            if 'is_array_value' in data[i] and 'value' in data[i] and data[i][
                    'is_array_value']:
                array_string = get_array_string(data, i)

            # Check if data is already available in database then update the
            # existing value otherwise add the new value
            if dbg_func_args_exists:
                dbg_func_args = DebuggerFunctionArguments.query.filter_by(
                    server_id=data[i]['server_id'],
                    database_id=data[i]['database_id'],
                    schema_id=data[i]['schema_id'],
                    function_id=data[i]['function_id'],
                    arg_id=data[i]['arg_id']
                ).first()

                dbg_func_args.is_null = data[i]['is_null']
                dbg_func_args.is_expression = data[i]['is_expression']
                dbg_func_args.use_default = data[i]['use_default']
                dbg_func_args.value = array_string
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
        db.session.rollback()
        current_app.logger.exception(e)
        return make_json_response(
            status=410,
            success=0,
            errormsg=e.message
        )

    return make_json_response(data={'status': True, 'result': 'Success'})


@blueprint.route(
    '/clear_arguments/<int:sid>/<int:did>/<int:scid>/<int:func_id>',
    methods=['POST'], endpoint='clear_arguments'
)
@login_required
def clear_arguments_sqlite(sid, did, scid, func_id):
    """
    clear_arguments_sqlite(sid, did, scid, func_id)

    This method is responsible for clearing function arguments
    from sqlite database

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

    try:
        db.session.query(DebuggerFunctionArguments) \
            .filter(DebuggerFunctionArguments.server_id == sid,
                    DebuggerFunctionArguments.database_id == did,
                    DebuggerFunctionArguments.schema_id == scid,
                    DebuggerFunctionArguments.function_id == func_id) \
            .delete()

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(e)
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(e)
        )

    return make_json_response(data={'status': True, 'result': 'Success'})


def convert_data_to_dict(conn, result):
    """
    This function helps us to convert result set into dict

    Args:
        conn: Connection object
        result: 2d array result set

    Returns:
        Converted dict data
    """
    columns = []
    col_info = conn.get_column_info()
    # Check column info is available or not
    if col_info is not None and len(col_info) > 0:
        for col in col_info:
            items = list(col.items())
            column = dict()
            column['name'] = items[0][1]
            column['type_code'] = items[1][1]
            columns.append(column)

    # We need to convert result from 2D array to dict.
    # This Conversion is not an overhead as most of the time
    # result will be smaller.
    _tmp_result = []
    for row in result:
        temp = dict()
        count = 0
        for item in row:
            temp[columns[count]['name']] = item
            count += 1
        _tmp_result.append(temp)
    # Replace 2d array with dict result
    result = _tmp_result

    return columns, result


def get_additional_msgs(conn, statusmsg):
    additional_msgs = conn.messages()
    if len(additional_msgs) > 0:
        additional_msgs = [msg.strip("\n") for msg in additional_msgs]
        additional_msgs = "\n".join(additional_msgs)
        if statusmsg:
            statusmsg = additional_msgs + "\n" + statusmsg
        else:
            statusmsg = additional_msgs

    return additional_msgs, statusmsg


def poll_data(conn):
    """
    poll data.
    :param conn:
    :return:
    """
    statusmsg = conn.status_message()
    if statusmsg and statusmsg == 'SELECT 1':
        statusmsg = ''
    status, result = conn.poll()

    return status, result, statusmsg


def check_result(result, conn, statusmsg):
    """
    Check for error and return the final result.
    :param result:
    :param conn:
    :param statusmsg:
    :return:
    """
    if 'ERROR' in result:
        status = 'ERROR'
        return make_json_response(
            info=gettext("Execution completed with an error."),
            data={
                'status': status,
                'status_message': result
            }
        )
    else:
        status = 'Success'
        additional_msgs, statusmsg = get_additional_msgs(conn,
                                                         statusmsg)

        columns, result = convert_data_to_dict(conn, result)

        return make_json_response(
            success=1,
            info=gettext("Execution Completed."),
            data={
                'status': status,
                'result': result,
                'col_info': columns,
                'status_message': statusmsg}
        )


@blueprint.route(
    '/poll_end_execution_result/<int:trans_id>/',
    methods=["GET"], endpoint='poll_end_execution_result'
)
@login_required
def poll_end_execution_result(trans_id):
    """
    poll_end_execution_result(trans_id)

    This method polls the end of execution result messages returned by the
    database server.

    Parameters:
        trans_id
        - unique transaction id.
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={'status': 'NotConnected',
                  'result': SERVER_CONNECTION_CLOSED
                  }
        )

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['conn_id'])

    if conn.connected():
        status, result, statusmsg = poll_data(conn)
        if not status:
            status = 'ERROR'
            return make_json_response(
                info=gettext("Execution completed with an error."),
                data={
                    'status': status,
                    'status_message': result
                }
            )

        if status == ASYNC_OK and \
            not de_inst.function_data['is_func'] and\
            (de_inst.function_data['language'] == 'edbspl' or
                de_inst.function_data['language'] == 'plpgsql'):
            status = 'Success'
            additional_msgs, statusmsg = get_additional_msgs(conn, statusmsg)

            return make_json_response(
                success=1,
                info=gettext("Execution Completed."),
                data={
                    'status': status,
                    'status_message': statusmsg
                }
            )
        if result:
            return check_result(result, conn, statusmsg)
        else:
            status = 'Busy'
            additional_msgs, statusmsg = get_additional_msgs(conn,
                                                             statusmsg)
            return make_json_response(
                data={
                    'status': status,
                    'result': result,
                    'status_message': statusmsg
                }
            )
    else:
        status = 'NotConnected'
        result = SERVER_CONNECTION_CLOSED

    return make_json_response(data={'status': status, 'result': result})


@blueprint.route(
    '/poll_result/<int:trans_id>/', methods=["GET"], endpoint='poll_result'
)
@login_required
def poll_result(trans_id):
    """
    poll_result(trans_id)

    This method polls the result of the asynchronous query and returns the
    result.

    Parameters:
        trans_id
        - unique transaction id.
    """

    de_inst = DebuggerInstance(trans_id)
    if de_inst.debugger_data is None:
        return make_json_response(
            data={
                'status': 'NotConnected',
                'result': SERVER_CONNECTION_CLOSED
            }
        )

    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
        de_inst.debugger_data['server_id'])
    conn = manager.connection(
        did=de_inst.debugger_data['database_id'],
        conn_id=de_inst.debugger_data['exe_conn_id'])

    if conn.connected():
        status, result = conn.poll()
        if not status:
            status = 'ERROR'
        elif status == ASYNC_OK and result is not None:
            status = 'Success'
            columns, result = convert_data_to_dict(conn, result)
        else:
            status = 'Busy'
    else:
        status = 'NotConnected'
        result = SERVER_CONNECTION_CLOSED

    return make_json_response(
        data={
            'status': status,
            'result': result
        }
    )


def release_connection(manager, dbg_obj):
    """This function is used to release connection."""
    conn = manager.connection(
        did=dbg_obj['database_id'],
        conn_id=dbg_obj['conn_id'])
    if conn.connected():
        conn.cancel_transaction(
            dbg_obj['conn_id'],
            dbg_obj['database_id'])
    manager.release(conn_id=dbg_obj['conn_id'])

    if 'exe_conn_id' in dbg_obj:
        conn = manager.connection(
            did=dbg_obj['database_id'],
            conn_id=dbg_obj['exe_conn_id'])
        if conn.connected():
            conn.cancel_transaction(
                dbg_obj['exe_conn_id'],
                dbg_obj['database_id'])
        manager.release(conn_id=dbg_obj['exe_conn_id'])


def close_debugger_session(_trans_id, close_all=False):
    """
    This function is used to cancel the debugger transaction.

    :param trans_id: Transaction id
    :return:
    """

    if close_all:
        trans_ids = DebuggerInstance.get_trans_ids()
    else:
        trans_ids = [_trans_id]

    for trans_id in trans_ids:
        de_inst = DebuggerInstance(trans_id)
        dbg_obj = de_inst.debugger_data

        try:
            if dbg_obj is not None:
                manager = get_driver(PG_DEFAULT_DRIVER).\
                    connection_manager(dbg_obj['server_id'])

                if manager is not None:
                    release_connection(manager, dbg_obj)

            de_inst.clear()
        except Exception:
            de_inst.clear()
            raise
