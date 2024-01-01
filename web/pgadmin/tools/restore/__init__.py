##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Restore Utility"""

import json

from flask import render_template, request, current_app, Response
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, fs_short_path, does_utility_exist, \
    get_server, filename_with_file_manager_path
from pgadmin.utils.ajax import make_json_response, bad_request, \
    internal_server_error

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.constants import MIMETYPE_APP_JS

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
            if arg and len(arg) >= 2 and arg[:2] == '--':
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
@login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route("/restore.js")
@login_required
def script():
    """render own javascript"""
    return Response(
        response=render_template(
            "restore/js/restore.js", _=_
        ),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


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
        _file = filename_with_file_manager_path(data['file'])
    except Exception as e:
        return True, internal_server_error(errormsg=str(e)), data, None

    if _file is None:
        return True, make_json_response(
            status=410,
            success=0,
            errormsg=_("File could not be found.")
        ), data, _file

    return False, '', data, _file


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
            errormsg=_("Could not find the specified server.")
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


def _set_args_param_values(data, manager, server, driver, conn, _file):
    """
    add args to the list.
    :param data: Data.
    :param manager: Manager.
    :param server: Server.
    :param driver: Driver.
    :param conn: Connection.
    :param _file: File.
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

    args.append(fs_short_path(_file))

    return args


@blueprint.route('/job/<int:sid>', methods=['POST'], endpoint='create_job')
@login_required
def create_restore_job(sid):
    """
    Args:
        sid: Server ID

        Creates a new job for restore task

    Returns:
        None
    """
    is_error, errmsg, data, _file = _get_create_req_data()
    if is_error:
        return errmsg

    is_error, errmsg, driver, manager, conn, \
        connected, server = _connect_server(sid)
    if is_error:
        return errmsg

    utility = manager.utility('restore')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )

    args = _set_args_param_values(data, manager, server, driver, conn, _file)

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
@login_required
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
            errormsg=_("Could not find the specified server.")
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
