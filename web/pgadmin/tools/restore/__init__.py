##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Restore Utility"""

import json
import config

from flask import render_template, request, current_app, Response
from flask_babel import gettext as _
# This unused import is required as API test cases will fail if we remove it,
# Have to identify the cause and then remove it.
from flask_security import current_user, permissions_required
from pgadmin.user_login_check import pga_login_required
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, fs_short_path, does_utility_exist, \
    get_server, filename_with_file_manager_path
from pgadmin.utils.ajax import make_json_response, bad_request, \
    internal_server_error

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.constants import MIMETYPE_APP_JS, SERVER_NOT_FOUND
from pgadmin.tools.user_management.PgAdminPermissions import AllPermissionTypes

# set template path for sql scripts
MODULE_NAME = 'restore'
server_info = {}


class RestoreModule(PgAdminModule):
    """
    class RestoreModule():

        It is a utility which inherits PgAdminModule
        class and define methods to load its own
        javascript file.
    """

    LABEL = _('Restore')

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for backup module
        """
        return ['restore.create_job', 'restore.utility_exists']


# Create blueprint for RestoreModule class
blueprint = RestoreModule(
    MODULE_NAME, __name__, static_url_path=''
)


class RestoreMessage(IProcessDesc):
    def __init__(self, _sid, _bfile, *_args, **_kwargs):
        self.sid = _sid
        self.bfile = _bfile
        self.database = _kwargs['database'] if 'database' in _kwargs else None
        self.cmd = ''

        def cmd_arg(x):
            if x:
                x = x.replace('\\', '\\\\')
                x = x.replace('"', '\\"')
                x = x.replace('""', '\\"')
                return ' "' + x + '"'
            return ''

        for arg in _args:
            if arg and len(arg) >= 2 and arg.startswith('--'):
                self.cmd += ' ' + arg
            else:
                self.cmd += cmd_arg(arg)

    def get_server_name(self):
        s = get_server(self.sid)

        if s is None:
            return _("Not available")

        from pgadmin.utils.driver import get_driver
        driver = get_driver(PG_DEFAULT_DRIVER)
        manager = driver.connection_manager(self.sid)

        host = manager.local_bind_host if manager.use_ssh_tunnel else s.host
        port = manager.local_bind_port if manager.use_ssh_tunnel else s.port

        return "{0} ({1}:{2})".format(s.name, host, port)

    @property
    def message(self):
        return _("Restoring backup on the server '{0}'")\
            .format(self.get_server_name())

    @property
    def type_desc(self):
        return _("Restoring backup on the server")

    def details(self, cmd, args):
        return {
            "message": self.message,
            "cmd": cmd + self.cmd,
            "server": self.get_server_name(),
            "object": getattr(self, 'database', ''),
            "type": _("Restore"),
        }


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


def _get_create_req_data():
    """
    Get data from request for create restore job.
    :return: return data if no error occurred.
    """
    if request.form:
        data = json.loads(request.form['data'])
    else:
        data = json.loads(request.data)

    try:
        filepath = filename_with_file_manager_path(data['file'])
    except Exception as e:
        return True, internal_server_error(errormsg=str(e)), data, None

    if filepath is None:
        return True, make_json_response(
            status=410,
            success=0,
            errormsg=_("File could not be found.")
        ), data, filepath

    return False, '', data, filepath


def _connect_server(sid):
    """
    Get server object and try to connect with it.
    :param sid: Server ID.
    :return: if not error occurred then return connection data.
    """
    server = get_server(sid)

    if server is None:
        return True, make_json_response(
            success=0,
            errormsg=SERVER_NOT_FOUND
        ), None, None, None, None, None

    # To fetch MetaData for the server
    from pgadmin.utils.driver import get_driver

    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)
    conn = manager.connection()
    connected = conn.connected()

    if not connected:
        return True, make_json_response(
            success=0,
            errormsg=_("Please connect to the server first.")
        ), driver, manager, conn, connected, server

    return False, '', driver, manager, conn, connected, server


def set_param(key, param, data, args):
    """
    check and add parameter to args list.
    :param key: Key.
    :param param:  Parameter to be add in the args list.
    :param data: Data.
    :param args: args list.
    :return: Return true if key in data else return false.
    """
    if key in data and data[key]:
        args.append(param)
        return True
    return False


def set_value(key, param, data, args, default_value=None):
    """
    Add values to args list if key not present in data set default value.
    :param key: Key.
    :param param: Parameter to be add in the args list.
    :param data: Data.
    :param args: args list.
    :param default_value:  default value flag.
    :return:
    """
    if key in data and data[key] is not None and data[key] != '':
        args.append(param)
        args.append(data[key])
    elif default_value is not None:
        args.append(param)
        args.append(default_value)


def _set_value_with_schema(data, key, args, param, driver, conn):
    """
    Set value if with_schema flag is true.
    :param data: Data.
    :param key: Key.
    :param args: args list.
    :param param: parameter to be add in the args list.
    :param driver: Driver.
    :param conn: connection.
    :return:
    """
    if isinstance(data[key], list):
        s, t = data[key]
        args.extend([
            param,
            driver.qtIdent(
                conn, s
            ) + '.' + driver.qtIdent(conn, t)
        ])
    else:
        for s, o in data[key]:
            args.extend([
                param,
                driver.qtIdent(
                    conn, s
                ) + '.' + driver.qtIdent(conn, o)
            ])


def set_multiple(key, param, data, args, driver, conn, with_schema=True):
    if key in data and \
            len(data[key]) > 0:
        if with_schema:
            # This is temporary
            # Once object tree is implemented then we will use
            # list of tuples 'else' part
            _set_value_with_schema(data, key, args, param, driver, conn)
        else:
            for o in data[key]:
                args.extend([param, o])
        return True
    return False


def get_restore_util_args(data, manager, server, driver, conn, filepath):
    """
    return the args for the command
    :param data: Data.
    :param manager: Manager.
    :param server: Server.
    :param driver: Driver.
    :param conn: Connection.
    :param filepath: File.
    :return: args list.
    """
    args = []

    if 'list' in data:
        args.append('--list')
    else:
        args.extend([
            '--host',
            manager.local_bind_host if manager.use_ssh_tunnel else server.host,
            '--port',
            str(manager.local_bind_port) if manager.use_ssh_tunnel
            else str(server.port),
            '--username', server.username, '--no-password'
        ])

        set_value('role', '--role', data, args)
        set_value('database', '--dbname', data, args)

        if data['format'] == 'directory':
            args.extend(['--format=d'])
        set_value('no_of_jobs', '--jobs', data, args)

        # Sections
        set_param('pre_data', '--section=pre-data', data, args)
        set_param('data', '--section=data', data, args)
        set_param('post_data', '--section=post-data', data, args)

        # Do not Save
        if not set_param('only_data', '--data-only', data, args):
            set_param('dns_owner', '--no-owner', data, args)
            set_param('dns_privilege', '--no-privileges', data, args)
            set_param('dns_tablespace', '--no-tablespaces', data, args)
            if manager.version >= 110000:
                set_param('dns_comments', '--no-comments', data, args)
                set_param('dns_publications', '--no-publications', data, args)
                set_param('dns_subscriptions', '--no-subscriptions', data,
                          args)
                set_param('dns_security_labels', '--no-security-labels', data,
                          args)
            if manager.version >= 150000:
                set_param('dns_table_access_method',
                          '--no-table-access-method', data, args)

        # Query Options
        set_param('include_create_database', '--create', data, args)
        set_param('clean', '--clean', data, args)
        set_param('if_exists', '--if-exists', data, args)
        set_param('single_transaction', '--single-transaction', data, args)

        # Table options
        set_param('enable_row_security', '--enable-row-security', data, args)
        set_param('no_data_fail_table', '--no-data-for-failed-tables', data,
                  args)

        # Disable options
        if not set_param('only_schema', '--schema-only', data, args):
            set_param('disable_trigger', '--disable-triggers', data, args)

        # Misc Options
        set_param('verbose', '--verbose', data, args)
        set_param('use_set_session_auth', '--use-set-session-authorization',
                  data, args)
        set_param('exit_on_error', '--exit-on-error', data, args)
        set_value('exclude_schema', '--exclude-schema', data, args)

        set_multiple('schemas', '--schema', data, args, driver, conn, False)
        set_multiple('tables', '--table', data, args, driver, conn, False)
        set_multiple('functions', '--function', data, args, driver, conn,
                     False)
        set_multiple('triggers', '--trigger', data, args, driver, conn, False)
        set_multiple('trigger_funcs', '--function', data, args, driver, conn,
                     False)
        set_multiple('indexes', '--index', data, args, driver, conn, False)

    args.append(filepath)

    return args


def get_sql_util_args(data, manager, server, filepath):
    """
    return the args for the command
    :param data: Data.
    :param manager: Manager.
    :param server: Server.
    :param filepath: File.
    :return: args list.
    """
    args = [
        '--host',
        manager.local_bind_host if manager.use_ssh_tunnel else server.host,
        '--port',
        str(manager.local_bind_port) if manager.use_ssh_tunnel
        else str(server.port),
        '--username', server.username, '--dbname',
        data['database'],
        '--file', fs_short_path(filepath)
    ]

    return args


def use_restore_utility(data, manager, server, driver, conn, filepath):
    utility = manager.utility('restore')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return ret_val, None, None

    args = get_restore_util_args(data, manager, server, driver, conn, filepath)

    return None, utility, args


def is_safe_sql_file(path):
    """
    Security-first checker for psql meta-commands.

    Security Strategy:
    1. Strict Encoding: Rejects anything that isn't valid UTF-8.
    2. Normalization: Converts all line endings to \n before checking.
    3. Null Byte Prevention: Rejects files with binary nulls.
    4. Paranoid Regex: Flags any backslash at the start of a line.
    """
    try:
        with open(path, "rb") as f:
            raw_data = f.read()

        # --- SECURITY CHECK 1: Strict Encoding ---
        # We force UTF-8. If the file is UTF-16/32, this throws an error,
        # and we reject the file. This prevents encoding bypass attacks.
        try:
            # utf-8-sig handles the BOM automatically (and removes it)
            text_data = raw_data.decode("utf-8-sig")
        except UnicodeDecodeError:
            current_app.logger.warning(f"Security Alert: File {path} is not "
                                       f"valid UTF-8.")
            return False

        # --- SECURITY CHECK 2: Null Bytes ---
        # C-based tools (like psql) can behave unpredictably with null bytes.
        if "\0" in text_data:
            current_app.logger.warning(f"Security Alert: File {path} contains "
                                       f"null bytes.")
            return False

        # --- SECURITY CHECK 3: Normalized Line Endings ---
        # We normalize all weird line endings (\r, \r\n, Form Feed) to \n
        # so we don't have to write a complex regex.
        # Note: \x0b (Vertical Tab) and \x0c (Form Feed) are treated as breaks.
        normalized_text = text_data.replace("\r\n", "\n").replace(
            "\r","\n").replace(
            "\f", "\n").replace("\v", "\n")

        # --- SECURITY CHECK 4: The Scan ---
        # We iterate lines. This is safer than a multiline regex which can
        # sometimes encounter buffer limits or backtracking issues.
        for i, line in enumerate(normalized_text.split("\n"), 1):
            stripped = line.strip()

            # Check 1: Meta command at start of line
            if stripped.startswith("\\"):
                current_app.logger.warning(f"Security Alert: Meta-command "
                                           f"detected on line {i}:{stripped}")
                return False

            # Check 2 (Optional but Recommended): Dangerous trailing commands
            # psql allows `SELECT ... \gexec`. The \ is not at the start.
            # If you want to be 100% secure, block ALL backslashes.
            # If that is too aggressive, look for specific tokens:
            if "\\g" in line or "\\c" in line or "\\!" in line:
                current_app.logger.warning(f"Security Alert: Dangerous "
                                           f"meta-command pattern detected "
                                           f"on line {i}: {stripped}")
                return False

        return True
    except FileNotFoundError:
        current_app.logger.error("File not found.")
    except PermissionError:
        current_app.logger.error("Insufficient permissions to access.")

    return True


def use_sql_utility(data, manager, server, filepath):
    block_msg = _("Restore Blocked: The selected PLAIN SQL file contains "
                  "commands that are considered potentially unsafe or include "
                  "meta-commands (like \\! or \\i) that could execute "
                  "external shell commands or scripts on the pgAdmin server. "
                  "For security reasons, pgAdmin will not restore this PLAIN "
                  "SQL file. Please check the logs for more details.")
    confirm_msg = _("The selected PLAIN SQL file contains commands that are "
                    "considered potentially unsafe or include meta-commands "
                    "(like \\! or \\i) that could execute external shell "
                    "commands or scripts on the pgAdmin server.\n\n "
                    "Do you still wish to continue?")

    if config.SERVER_MODE and not config.ENABLE_PLAIN_SQL_RESTORE:
        return _("Plain SQL restore is disabled by default when running in "
                 "server mode. To allow this functionality, you must set the "
                 "configuration setting ENABLE_PLAIN_SQL_RESTORE to True and "
                 "then restart the pgAdmin application."), None, None, None

    # If data has confirmed, then no need to check for the safe SQL file again
    if not data.get('confirmed', False):
        # Check the SQL file is safe to process.
        safe_sql_file = is_safe_sql_file(filepath)
        if not safe_sql_file and config.SERVER_MODE:
            return block_msg, None, None, None
        elif not safe_sql_file and not config.SERVER_MODE:
            return None, None, None, confirm_msg

    utility = manager.utility('sql')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return ret_val, None, None, None

    args = get_sql_util_args(data, manager, server, filepath)

    return None, utility, args, None


@blueprint.route('/job/<int:sid>', methods=['POST'], endpoint='create_job')
@permissions_required(AllPermissionTypes.tools_restore)
@pga_login_required
def create_restore_job(sid):
    """
    Args:
        sid: Server ID

        Creates a new job for restore task

    Returns:
        None
    """
    confirmation_msg = None
    is_error, errmsg, data, filepath = _get_create_req_data()
    if is_error:
        return errmsg

    is_error, errmsg, driver, manager, conn, _, server = _connect_server(sid)
    if is_error:
        return errmsg

    if data['format'] == 'plain':
        error_msg, utility, args, confirmation_msg = use_sql_utility(
            data, manager, server, filepath)
    else:
        error_msg, utility, args = use_restore_utility(
            data, manager, server, driver, conn, filepath)

    if error_msg is not None:
        return make_json_response(
            success=0,
            errormsg=error_msg
        )

    if confirmation_msg is not None:
        return make_json_response(
            success=0,
            data={'confirmation_msg': confirmation_msg}
        )

    try:
        p = BatchProcess(
            desc=RestoreMessage(
                server.id,
                data['file'].encode('utf-8') if hasattr(
                    data['file'], 'encode'
                ) else data['file'],
                *args,
                database=data['database']
            ),
            cmd=utility, args=args, manager_obj=manager
        )
        p.set_env_variables(server)
        p.start()
        jid = p.id
    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(e)
        )
    # Return response
    return make_json_response(
        data={'job_id': jid, 'desc': p.desc.message, 'Success': 1}
    )


@blueprint.route(
    '/utility_exists/<int:sid>', endpoint='utility_exists'
)
@pga_login_required
def check_utility_exists(sid):
    """
    This function checks the utility file exist on the given path.

    Args:
        sid: Server ID
    Returns:
        None
    """
    # Fetch the server details like hostname, port, roles etc
    server = get_server(sid)

    if server is None:
        return make_json_response(
            success=0,
            errormsg=SERVER_NOT_FOUND
        )

    from pgadmin.utils.driver import get_driver
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)

    utility = manager.utility('restore')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )

    return make_json_response(success=1)
