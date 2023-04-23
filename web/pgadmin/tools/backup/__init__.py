##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Implements Backup Utility"""

import json
import os
import functools
import operator

from flask import render_template, request, current_app, \
    url_for, Response
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, html, \
    fs_short_path, document_dir, does_utility_exist, get_server, \
    filename_with_file_manager_path
from pgadmin.utils.ajax import make_json_response, bad_request, unauthorized

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server, SharedServer
from pgadmin.misc.bgprocess import escape_dquotes_process_arg
from pgadmin.utils.constants import MIMETYPE_APP_JS

# set template path for sql scripts
MODULE_NAME = 'backup'
server_info = {}


class BackupModule(PgAdminModule):
    """
    class BackupModule():

        It is a utility which inherits PgAdminModule
        class and define methods to load its own
        javascript file.
    """

    LABEL = _('Backup')

    def show_system_objects(self):
        """
        return system preference objects
        """
        return self.pref_show_system_objects

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for backup module
        """
        return ['backup.create_server_job', 'backup.create_object_job',
                'backup.utility_exists']


# Create blueprint for BackupModule class
blueprint = BackupModule(
    MODULE_NAME, __name__, static_url_path=''
)


class BACKUP():
    """
    Constants defined for Backup utilities
    """
    GLOBALS = 1
    SERVER = 2
    OBJECT = 3


class BackupMessage(IProcessDesc):
    """
    BackupMessage(IProcessDesc)

    Defines the message shown for the backup operation.
    """

    def __init__(self, _type, _sid, _bfile, *_args, **_kwargs):
        self.backup_type = _type
        self.sid = _sid
        self.bfile = _bfile
        self.database = _kwargs['database'] if 'database' in _kwargs else None
        self.cmd = ''
        self.args_str = "{0} ({1}:{2})"

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
    def type_desc(self):
        if self.backup_type == BACKUP.OBJECT:
            return _("Backing up an object on the server")
        if self.backup_type == BACKUP.GLOBALS:
            return _("Backing up the global objects")
        elif self.backup_type == BACKUP.SERVER:
            return _("Backing up the server")
        else:
            # It should never reach here.
            return _("Unknown Backup")

    @property
    def message(self):
        server_name = self.get_server_name()

        if self.backup_type == BACKUP.OBJECT:
            return _(
                "Backing up an object on the server '{0}' "
                "from database '{1}'"
            ).format(server_name, self.database)
        if self.backup_type == BACKUP.GLOBALS:
            return _("Backing up the global objects on "
                     "the server '{0}'").format(
                server_name
            )
        elif self.backup_type == BACKUP.SERVER:
            return _("Backing up the server '{0}'").format(
                server_name
            )
        else:
            # It should never reach here.
            return "Unknown Backup"

    def details(self, cmd, args):
        server_name = self.get_server_name()
        backup_type = _("Backup")
        if self.backup_type == BACKUP.OBJECT:
            backup_type = _("Backup Object")
        elif self.backup_type == BACKUP.GLOBALS:
            backup_type = _("Backup Globals")
        elif self.backup_type == BACKUP.SERVER:
            backup_type = _("Backup Server")

        return {
            "message": self.message,
            "cmd": cmd + self.cmd,
            "server": server_name,
            "object": self.database,
            "type": backup_type,
        }


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route("/backup.js")
@login_required
def script():
    """render own javascript"""
    return Response(
        response=render_template(
            "backup/js/backup.js", _=_
        ),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


def _get_args_params_values(data, conn, backup_obj_type, backup_file, server,
                            manager):
    """
    Used internally by create_backup_objects_job. This function will create
    the required args and params for the job.
    :param data: input data
    :param conn: connection obj
    :param backup_obj_type: object type
    :param backup_file: file name
    :param server: server obj
    :param manager: connection manager
    :return: args array
    """
    from pgadmin.utils.driver import get_driver
    driver = get_driver(PG_DEFAULT_DRIVER)

    host, port = (manager.local_bind_host, str(manager.local_bind_port)) \
        if manager.use_ssh_tunnel else (server.host, str(server.port))
    args = [
        '--file',
        backup_file,
        '--host',
        host,
        '--port',
        port,
        '--username',
        server.username,
        '--no-password'
    ]

    def set_param(key, param, assertion=True):
        if not assertion:
            return
        if data.get(key, None):
            args.append(param)

    def set_value(key, param, default_value=None, assertion=True):
        if not assertion:
            return
        val = data.get(key, default_value)
        if val:
            args.append(param)
            args.append(val)

    if backup_obj_type != 'objects':
        args.append('--database')
        args.append(server.maintenance_db)

    if backup_obj_type == 'globals':
        args.append('--globals-only')

    set_param('verbose', '--verbose')
    set_param('dqoute', '--quote-all-identifiers')
    set_value('role', '--role')

    if backup_obj_type == 'objects' and data.get('format', None):
        args.extend(['--format={0}'.format({
            'custom': 'c',
            'tar': 't',
            'plain': 'p',
            'directory': 'd'
        }[data['format']])])

        set_param('blobs', '--blobs', data['format'] in ['custom', 'tar'])
        set_value('ratio', '--compress', None,
                  ['custom', 'plain', 'directory'])

    set_param('only_data', '--data-only',
              data.get('only_data', None))
    set_param('disable_trigger', '--disable-triggers',
              data.get('only_data', None) and
              data.get('format', '') == 'plain')

    set_param('only_schema', '--schema-only',
              data.get('only_schema', None) and
              not data.get('only_data', None))

    set_param('dns_owner', '--no-owner')
    set_param('include_create_database', '--create')
    set_param('include_drop_database', '--clean')
    set_param('pre_data', '--section=pre-data')
    set_param('data', '--section=data')
    set_param('post_data', '--section=post-data')
    set_param('dns_privilege', '--no-privileges')
    set_param('dns_tablespace', '--no-tablespaces')
    set_param('dns_unlogged_tbl_data', '--no-unlogged-table-data')
    set_param('use_insert_commands', '--inserts')
    set_param('use_column_inserts', '--column-inserts')
    set_param('disable_quoting', '--disable-dollar-quoting')
    set_param('with_oids', '--oids')
    set_param('use_set_session_auth', '--use-set-session-authorization')

    set_param('no_comments', '--no-comments', manager.version >= 110000)
    set_param('load_via_partition_root', '--load-via-partition-root',
              manager.version >= 110000)

    set_value('encoding', '--encoding')
    set_value('no_of_jobs', '--jobs')

    args.extend(
        functools.reduce(operator.iconcat, map(
            lambda s: ['--schema', r'{0}'.format(driver.qtIdent(conn, s).
                                                 replace('"', '\"'))],
            data.get('schemas', [])), []
        )
    )

    args.extend(
        functools.reduce(operator.iconcat, map(
            lambda t: ['--table',
                       r'{0}'.format(driver.qtIdent(conn, t[0], t[1])
                                     .replace('"', '\"'))],
            data.get('tables', [])), []
        )
    )

    return args


@blueprint.route(
    '/job/<int:sid>', methods=['POST'], endpoint='create_server_job'
)
@blueprint.route(
    '/job/<int:sid>/object', methods=['POST'], endpoint='create_object_job'
)
@login_required
def create_backup_objects_job(sid):
    """
    Args:
        sid: Server ID

        Creates a new job for backup task
        (Backup Database(s)/Schema(s)/Table(s))

    Returns:
        None
    """

    data = json.loads(request.data)
    backup_obj_type = data.get('type', 'objects')

    try:
        backup_file = filename_with_file_manager_path(
            data['file'], (data.get('format', '') != 'directory'))
    except PermissionError as e:
        return unauthorized(errormsg=str(e))
    except Exception as e:
        return bad_request(errormsg=str(e))

    # Fetch the server details like hostname, port, roles etc
    server = get_server(sid)

    if server is None:
        return make_json_response(
            success=0,
            errormsg=_("Could not find the specified server.")
        )

    # To fetch MetaData for the server
    from pgadmin.utils.driver import get_driver
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)
    conn = manager.connection()
    connected = conn.connected()

    if not connected:
        return make_json_response(
            success=0,
            errormsg=_("Please connect to the server first.")
        )

    utility = manager.utility('backup') if backup_obj_type == 'objects' \
        else manager.utility('backup_server')

    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )

    args = _get_args_params_values(
        data, conn, backup_obj_type, backup_file, server, manager)

    escaped_args = [
        escape_dquotes_process_arg(arg) for arg in args
    ]
    try:
        bfile = data['file'].encode('utf-8') \
            if hasattr(data['file'], 'encode') else data['file']
        if backup_obj_type == 'objects':
            args.append(data['database'])
            escaped_args.append(data['database'])
            p = BatchProcess(
                desc=BackupMessage(
                    BACKUP.OBJECT, server.id, bfile,
                    *args,
                    database=data['database']
                ),
                cmd=utility, args=escaped_args
            )
        else:
            p = BatchProcess(
                desc=BackupMessage(
                    BACKUP.SERVER if backup_obj_type != 'globals'
                    else BACKUP.GLOBALS,
                    server.id, bfile,
                    *args
                ),
                cmd=utility, args=escaped_args
            )

        manager.export_password_env(p.id)
        # Check for connection timeout and if it is greater than 0 then
        # set the environment variable PGCONNECT_TIMEOUT.
        timeout = manager.get_connection_param_value('connect_timeout')
        if timeout and int(timeout) > 0:
            env = dict()
            env['PGCONNECT_TIMEOUT'] = str(timeout)
            p.set_env_variables(server, env=env)
        else:
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
    '/utility_exists/<int:sid>/<backup_obj_type>', endpoint='utility_exists'
)
@login_required
def check_utility_exists(sid, backup_obj_type):
    """
    This function checks the utility file exist on the given path.

    Args:
        sid: Server ID
        backup_obj_type: Type of the object
    Returns:
        None
    """
    server = get_server(sid)

    if server is None:
        return make_json_response(
            success=0,
            errormsg=_("Could not find the specified server.")
        )

    from pgadmin.utils.driver import get_driver
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)

    utility = manager.utility('backup') if backup_obj_type == 'objects' \
        else manager.utility('backup_server')

    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )

    return make_json_response(success=1)
