##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Backup Utility"""

import simplejson as json
import os

from flask import render_template, request, current_app, \
    url_for, Response
from flask_babelex import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, html, \
    fs_short_path, document_dir, does_utility_exist
from pgadmin.utils.ajax import make_json_response, bad_request

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server
from pgadmin.misc.bgprocess import escape_dquotes_process_arg

# set template path for sql scripts
MODULE_NAME = 'backup'
server_info = {}


class BackupModule(PgAdminModule):
    """
    class BackupModule(Object):

        It is a utility which inherits PgAdminModule
        class and define methods to load its own
        javascript file.
    """

    LABEL = _('Backup')

    def get_own_javascripts(self):
        """"
        Returns:
            list: js files used by this module
        """
        return [{
            'name': 'pgadmin.tools.backup',
            'path': url_for('backup.index') + 'backup',
            'when': None
        }]

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


class BACKUP(object):
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

    def get_server_details(self):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        from pgadmin.utils.driver import get_driver
        driver = get_driver(PG_DEFAULT_DRIVER)
        manager = driver.connection_manager(self.sid)

        host = manager.local_bind_host if manager.use_ssh_tunnel else s.host
        port = manager.local_bind_port if manager.use_ssh_tunnel else s.port

        return s.name, host, port

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
        name, host, port = self.get_server_details()
        name = html.safe_str(name)
        host = html.safe_str(host)
        port = html.safe_str(port)

        if self.backup_type == BACKUP.OBJECT:
            return _(
                "Backing up an object on the server '{0}' "
                "from database '{1}'"
            ).format(
                "{0} ({1}:{2})".format(
                    name, host, port
                ),
                html.safe_str(self.database)
            )
        if self.backup_type == BACKUP.GLOBALS:
            return _("Backing up the global objects on "
                     "the server '{0}'").format(
                "{0} ({1}:{2})".format(
                    name, host, port
                )
            )
        elif self.backup_type == BACKUP.SERVER:
            return _("Backing up the server '{0}'").format(
                "{0} ({1}:{2})".format(
                    name, host, port
                )
            )
        else:
            # It should never reach here.
            return "Unknown Backup"

    def details(self, cmd, args):
        name, host, port = self.get_server_details()

        res = '<div>'

        if self.backup_type == BACKUP.OBJECT:
            msg = _(
                "Backing up an object on the server '{0}' "
                "from database '{1}'..."
            ).format(
                "{0} ({1}:{2})".format(
                    name, host, port
                ),
                self.database
            )
            res += html.safe_str(msg)
        elif self.backup_type == BACKUP.GLOBALS:
            msg = _("Backing up the global objects on "
                    "the server '{0}'...").format(
                "{0} ({1}:{2})".format(
                    name, host, port
                )
            )
            res += html.safe_str(msg)
        elif self.backup_type == BACKUP.SERVER:
            msg = _("Backing up the server '{0}'...").format(
                "{0} ({1}:{2})".format(
                    name, host, port
                )
            )
            res += html.safe_str(msg)
        else:
            # It should never reach here.
            res += "Backup"

        res += '</div><div class="py-1">'
        res += _("Running command:")
        res += '<div class="pg-bg-cmd enable-selection p-1">'
        res += html.safe_str(cmd + self.cmd)
        res += '</div></div>'

        return res


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
        mimetype="application/javascript"
    )


def filename_with_file_manager_path(_file, create_file=True):
    """
    Args:
        file: File name returned from client file manager
        create_file: Set flag to False when file creation doesn't required
    Returns:
        Filename to use for backup with full path taken from preference
    """
    # Set file manager directory from preference
    storage_dir = get_storage_directory()
    if storage_dir:
        _file = os.path.join(storage_dir, _file.lstrip(u'/').lstrip(u'\\'))
    elif not os.path.isabs(_file):
        _file = os.path.join(document_dir(), _file)

    def short_filepath():
        short_path = fs_short_path(_file)
        # fs_short_path() function may return empty path on Windows
        # if directory doesn't exists. In that case we strip the last path
        # component and get the short path.
        if os.name == 'nt' and short_path == '':
            base_name = os.path.basename(_file)
            dir_name = os.path.dirname(_file)
            short_path = fs_short_path(dir_name) + '\\' + base_name
        return short_path

    if create_file:
        # Touch the file to get the short path of the file on windows.
        with open(_file, 'a'):
            return short_filepath()

    return short_filepath()


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
    if request.form:
        data = json.loads(request.form['data'], encoding='utf-8')
    else:
        data = json.loads(request.data, encoding='utf-8')

    backup_obj_type = 'objects'
    if 'type' in data:
        backup_obj_type = data['type']

    try:
        if 'format' in data and data['format'] == 'directory':
            backup_file = filename_with_file_manager_path(data['file'], False)
        else:
            backup_file = filename_with_file_manager_path(data['file'])
    except Exception as e:
        return bad_request(errormsg=str(e))

    # Fetch the server details like hostname, port, roles etc
    server = Server.query.filter_by(
        id=sid, user_id=current_user.id
    ).first()

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

    args = [
        '--file',
        backup_file,
        '--host',
        manager.local_bind_host if manager.use_ssh_tunnel else server.host,
        '--port',
        str(manager.local_bind_port) if manager.use_ssh_tunnel
        else str(server.port),
        '--username',
        server.username,
        '--no-password'
    ]

    if backup_obj_type != 'objects':
        args.append('--database')
        args.append(server.maintenance_db)

    if backup_obj_type == 'globals':
        args.append('--globals-only')

    def set_param(key, param):
        if key in data and data[key]:
            args.append(param)

    def set_value(key, param, default_value=None):
        if key in data and data[key] is not None and data[key] != '':
            args.append(param)
            args.append(data[key])
        elif default_value is not None:
            args.append(param)
            args.append(default_value)

    set_param('verbose', '--verbose')
    set_param('dqoute', '--quote-all-identifiers')
    set_value('role', '--role')

    if backup_obj_type == 'objects' and \
            'format' in data and data['format'] is not None:
        if data['format'] == 'custom':
            args.extend(['--format=c'])
            set_param('blobs', '--blobs')
            set_value('ratio', '--compress')
        elif data['format'] == 'tar':
            args.extend(['--format=t'])
            set_param('blobs', '--blobs')
        elif data['format'] == 'plain':
            args.extend(['--format=p'])
            set_value('ratio', '--compress')
        elif data['format'] == 'directory':
            args.extend(['--format=d'])
            set_value('ratio', '--compress')

    if 'only_data' in data and data['only_data']:
        set_param('only_data', '--data-only')
        if 'format' in data and data['format'] == 'plain':
            set_param('disable_trigger', '--disable-triggers')
    elif 'only_schema' in data and data['only_schema']:
        set_param('only_schema', '--schema-only')

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

    if manager.version >= 110000:
        set_param('no_comments', '--no-comments')
        set_param('load_via_partition_root', '--load-via-partition-root')

    set_value('encoding', '--encoding')
    set_value('no_of_jobs', '--jobs')

    if 'schemas' in data:
        for s in data['schemas']:
            args.extend(['--schema', r'{0}'.format(
                driver.qtIdent(conn, s).replace('"', '\"'))])

    if 'tables' in data:
        for s, t in data['tables']:
            args.extend([
                '--table', r'{0}'.format(
                    driver.qtIdent(conn, s, t).replace('"', '\"'))
            ])

    escaped_args = [
        escape_dquotes_process_arg(arg) for arg in args
    ]
    try:
        if backup_obj_type == 'objects':
            args.append(data['database'])
            escaped_args.append(data['database'])
            p = BatchProcess(
                desc=BackupMessage(
                    BACKUP.OBJECT, sid,
                    data['file'].encode('utf-8') if hasattr(
                        data['file'], 'encode'
                    ) else data['file'],
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
                    sid,
                    data['file'].encode('utf-8') if hasattr(
                        data['file'], 'encode'
                    ) else data['file'],
                    *args
                ),
                cmd=utility, args=escaped_args
            )

        manager.export_password_env(p.id)
        # Check for connection timeout and if it is greater than 0 then
        # set the environment variable PGCONNECT_TIMEOUT.
        if manager.connect_timeout > 0:
            env = dict()
            env['PGCONNECT_TIMEOUT'] = str(manager.connect_timeout)
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
        data={'job_id': jid, 'Success': 1}
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
    server = Server.query.filter_by(
        id=sid, user_id=current_user.id
    ).first()

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
