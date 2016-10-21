##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Backup Utility"""

import simplejson as json
import os

from flask import render_template, request, current_app, \
    url_for, Response
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, html
from pgadmin.utils.ajax import make_json_response, bad_request

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server

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

    def __init__(self, _type, _sid, _bfile, **kwargs):
        self.backup_type = _type
        self.sid = _sid
        self.bfile = _bfile
        self.database = None

        if 'database' in kwargs:
            self.database = kwargs['database']

    @property
    def message(self):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        if self.backup_type == BACKUP.OBJECT:
            return _(
                "Backing up an object on the server '{0}' from database '{1}'..."
            ).format(
                "{0} ({1}:{2})".format(s.name, s.host, s.port),
                self.database
            )
        if self.backup_type == BACKUP.GLOBALS:
            return _("Backing up the global objects on the server - '{0}'...").format(
                "{0} ({1}:{2})".format(s.name, s.host, s.port)
            )
        elif self.backup_type == BACKUP.SERVER:
            return _("Backing up the server '{0}'...").format(
                "{0} ({1}:{2})".format(s.name, s.host, s.port)
            )
        else:
            # It should never reach here.
            return "Unknown Backup"

    def details(self, cmd, args):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        res = '<div class="h5">'

        if self.backup_type == BACKUP.OBJECT:
            res += html.safe_str(
                _(
                    "Backing up an object on the server '{0}' from database '{1}'..."
                ).format(
                    "{0} ({1}:{2})".format(s.name, s.host, s.port),
                    self.database
                )
            )
        elif self.backup_type == BACKUP.GLOBALS:
            res += html.safe_str(
                _("Backing up the global objects on the server '{0}'").format(
                    "{0} ({1}:{2})".format(s.name, s.host, s.port)
                )
            )
        elif self.backup_type == BACKUP.SERVER:
            res += html.safe_str(
                _("Backing up the server '{0}'").format(
                    "{0} ({1}:{2})".format(s.name, s.host, s.port)
                )
            )
        else:
            # It should never reach here.
            res += "Backup"

        res += '</div><div class="h5">'
        res += html.safe_str(
            _("Running command:")
        )
        res += '</b><br><i>'
        res += html.safe_str(cmd)

        replace_next = False

        def cmdArg(x):
            if x:
                x = x.replace('\\', '\\\\')
                x = x.replace('"', '\\"')
                x = x.replace('""', '\\"')

                return ' "' + html.safe_str(x) + '"'

            return ''

        for arg in args:
            if arg and len(arg) >= 2 and arg[:2] == '--':
                res += ' ' + arg
            elif replace_next:
                res += ' "' + html.safe_str(
                    self.bfile
                ) + '"'
            else:
                if arg == '--file':
                    replace_next = True
                res += cmdArg(arg)
        res += '</i></div>'

        return res


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL can not be called directly."))


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


def filename_with_file_manager_path(file):
    """
    Args:
        file: File name returned from client file manager

    Returns:
        Filename to use for backup with full path taken from preference
    """
    # Set file manager directory from preference
    storage_dir = get_storage_directory()

    if storage_dir:
        return os.path.join(storage_dir, file.lstrip('/'))

    return file


@blueprint.route('/create_job/<int:sid>', methods=['POST'])
@login_required
def create_backup_job(sid):
    """
    Args:
        sid: Server ID

        Creates a new job for backup task (Backup Server/Globals)

    Returns:
        None
    """
    if request.form:
        # Convert ImmutableDict to dict
        data = dict(request.form)
        data = json.loads(data['data'][0], encoding='utf-8')
    else:
        data = json.loads(request.data, encoding='utf-8')

    backup_file = filename_with_file_manager_path(data['file'])

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

    utility = manager.utility('backup_server')

    args = [
        '--file',
        backup_file,
        '--host',
        server.host,
        '--port',
        str(server.port),
        '--username',
        server.username,
        '--no-password',
        '--database',
        server.maintenance_db
    ]
    if 'role' in data and data['role']:
        args.append('--role')
        args.append(data['role'])
    if 'verbose' in data and data['verbose']:
        args.append('--verbose')
    if 'dqoute' in data and data['dqoute']:
        args.append('--quote-all-identifiers')
    if data['type'] == 'global':
        args.append('--globals-only')

    try:
        p = BatchProcess(
            desc=BackupMessage(
                BACKUP.SERVER if data['type'] != 'global' else BACKUP.GLOBALS,
                sid, data['file']
            ),
            cmd=utility, args=args
        )
        manager.export_password_env(p.id)
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
        data={'job_id': jid, 'success': 1}
    )


@blueprint.route('/create_job/backup_object/<int:sid>', methods=['POST'])
@login_required
def create_backup_objects_job(sid):
    """
    Args:
        sid: Server ID

        Creates a new job for backup task (Backup Database(s)/Schema(s)/Table(s))

    Returns:
        None
    """
    if request.form:
        # Convert ImmutableDict to dict
        data = dict(request.form)
        data = json.loads(data['data'][0], encoding='utf-8')
    else:
        data = json.loads(request.data, encoding='utf-8')

    backup_file = filename_with_file_manager_path(data['file'])

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

    utility = manager.utility('backup')
    args = [
        '--file',
        backup_file,
        '--host',
        server.host,
        '--port',
        str(server.port),
        '--username',
        server.username,
        '--no-password'
    ]

    def set_param(key, param):
        if key in data and data[key]:
            args.append(param)

    def set_value(key, param, value):
        if key in data:
            if value:
                if value is True and data[key]:
                    args.append(param)
                    args.append(data[key])
                else:
                    args.append(param)
                    args.append(value)

    set_param('verbose', '--verbose')
    set_param('dqoute', '--quote-all-identifiers')
    set_value('role', '--role', True)
    if data['format'] is not None:
        if data['format'] == 'custom':
            args.extend(['--format=c'])

            set_param('blobs', '--blobs')
            set_value('ratio', '--compress', True)

        elif data['format'] == 'tar':
            args.extend(['--format=t'])

            set_param('blobs', '--blobs')

        elif data['format'] == 'plain':
            args.extend(['--format=p'])
            if 'only_data' in data and data['only_data']:
                args.append('--data-only')
                set_param('disable_trigger', '--disable-triggers')
            else:
                set_param('only_schema', '--schema-only')
                set_param('dns_owner', '--no-owner')
                set_param('include_create_database', '--create')
                set_param('include_drop_database', '--clean')
        elif data['format'] == 'directory':
            args.extend(['--format=d'])

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

    set_value('encoding', '--encoding', True)
    set_value('no_of_jobs', '--jobs', True)

    for s in data['schemas']:
        args.extend(['--schema', s])

    for s, t in data['tables']:
        args.extend([
            '--table', driver.qtIdent(conn, s, t)
        ])

    args.append(data['database'])

    try:
        p = BatchProcess(
            desc=BackupMessage(
                BACKUP.OBJECT, sid, data['file'], database=data['database']
            ),
            cmd=utility, args=args)
        manager.export_password_env(p.id)
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
