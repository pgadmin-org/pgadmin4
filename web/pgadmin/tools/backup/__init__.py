##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Implements Backup Utility"""

import json
import os
import copy
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
from pgadmin.tools.grant_wizard import _get_rows_for_type, \
    get_node_sql_with_type, properties, get_data

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
                'backup.utility_exists', 'backup.objects',
                'backup.schema_objects']


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

    set_value('role', '--role')

    if backup_obj_type == 'objects' and data.get('format', None):
        args.extend(['--format={0}'.format({
            'custom': 'c',
            'tar': 't',
            'plain': 'p',
            'directory': 'd'
        }[data['format']])])

        # --blobs is deprecated from v16
        if manager.version >= 160000:
            set_param('blobs', '--large-objects',
                      data['format'] in ['custom', 'tar'])
        else:
            set_param('blobs', '--blobs', data['format'] in ['custom', 'tar'])
        set_value('ratio', '--compress')

    set_value('encoding', '--encoding')
    set_value('no_of_jobs', '--jobs')

    # Data options
    set_param('only_data', '--data-only',
              data.get('only_data', None))
    set_param('only_schema', '--schema-only',
              data.get('only_schema', None) and
              not data.get('only_data', None))
    set_param('only_tablespaces', '--tablespaces-only',
              data.get('only_tablespaces', None))
    set_param('only_roles', '--roles-only',
              data.get('only_roles', None))

    # Sections
    set_param('pre_data', '--section=pre-data')
    set_param('data', '--section=data')
    set_param('post_data', '--section=post-data')

    # Do not Save
    set_param('dns_owner', '--no-owner')
    set_param('dns_privilege', '--no-privileges')
    set_param('dns_tablespace', '--no-tablespaces')
    set_param('dns_unlogged_tbl_data', '--no-unlogged-table-data')
    set_param('dns_comments', '--no-comments', manager.version >= 110000)
    set_param('dns_publications', '--no-publications',
              manager.version >= 110000)
    set_param('dns_subscriptions', '--no-subscriptions',
              manager.version >= 110000)
    set_param('dns_security_labels', '--no-security-labels',
              manager.version >= 110000)
    set_param('dns_toast_compression', '--no-toast-compression',
              manager.version >= 140000)
    set_param('dns_table_access_method', '--no-table-access-method',
              manager.version >= 150000)
    set_param('dns_no_role_passwords', '--no-role-passwords')

    # Query Options
    set_param('use_insert_commands', '--inserts')
    set_value('max_rows_per_insert', '--rows-per-insert', None,
              manager.version >= 120000)
    set_param('on_conflict_do_nothing', '--on-conflict-do-nothing',
              manager.version >= 120000)
    set_param('include_create_database', '--create')
    set_param('include_drop_database', '--clean')
    set_param('if_exists', '--if-exists')

    # Table options
    set_param('use_column_inserts', '--column-inserts')
    set_param('load_via_partition_root', '--load-via-partition-root',
              manager.version >= 110000)
    set_param('with_oids', '--oids')
    set_param('enable_row_security', '--enable-row-security')
    set_value('exclude_table_data', '--exclude-table-data')
    set_value('table_and_children', '--table-and-children', None,
              manager.version >= 160000)
    set_value('exclude_table_and_children', '--exclude-table-and-children',
              None, manager.version >= 160000)
    set_value('exclude_table_data_and_children',
              '--exclude-table-data-and-children', None,
              manager.version >= 160000)

    # Disable options
    set_param('disable_trigger', '--disable-triggers',
              data.get('only_data', None) and
              data.get('format', '') == 'plain')
    set_param('disable_quoting', '--disable-dollar-quoting')

    # Misc Options
    set_param('verbose', '--verbose')
    set_param('dqoute', '--quote-all-identifiers')
    set_param('use_set_session_auth', '--use-set-session-authorization')
    set_value('exclude_schema', '--exclude-schema')
    set_value('extra_float_digits', '--extra-float-digits', None,
              manager.version >= 120000)
    set_value('lock_wait_timeout', '--lock-wait-timeout')
    set_value('exclude_database', '--exclude-database', None,
              manager.version >= 160000)

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

    if 'objects' in data:
        selected_objects = data.get('objects', {})
        for _key in selected_objects:
            param = 'schema' if _key == 'schema' else 'table'
            args.extend(
                functools.reduce(operator.iconcat, map(
                    lambda s: [f'--{param}',
                               r'{0}.{1}'.format(
                                   driver.qtIdent(conn, s['schema']).replace(
                                       '"', '\"'),
                                   driver.qtIdent(conn, s['name']).replace(
                                       '"', '\"')) if type(
                                   s) is dict else driver.qtIdent(
                                   conn, s).replace('"', '\"')],
                    selected_objects[_key] or []), [])
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
                cmd=utility, args=escaped_args, manager_obj=manager
            )
        else:
            p = BatchProcess(
                desc=BackupMessage(
                    BACKUP.SERVER if backup_obj_type != 'globals'
                    else BACKUP.GLOBALS,
                    server.id, bfile,
                    *args
                ),
                cmd=utility, args=escaped_args, manager_obj=manager
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


@blueprint.route(
    '/objects/<int:sid>/<int:did>', endpoint='objects'
)
@blueprint.route(
    '/objects/<int:sid>/<int:did>/<int:scid>', endpoint='schema_objects'
)
@login_required
def objects(sid, did, scid=None):
    """
    This function returns backup objects

    Args:
        sid: Server ID
        did: database ID
        scid: schema ID
    Returns:
        list of objects
    """
    from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
    server = get_server(sid)

    if server is None:
        return make_json_response(
            success=0,
            errormsg=_("Could not find the specified server.")
        )

    from pgadmin.utils.driver import get_driver
    from flask_babel import gettext
    from pgadmin.utils.ajax import precondition_required

    server_info = {}
    server_info['manager'] = get_driver(PG_DEFAULT_DRIVER) \
        .connection_manager(sid)
    server_info['conn'] = server_info['manager'].connection(
        did=did)
    # If DB not connected then return error to browser
    if not server_info['conn'].connected():
        return precondition_required(
            gettext("Connection to the server has been lost.")
        )

    # Set template path for sql scripts
    server_info['server_type'] = server_info['manager'].server_type
    server_info['version'] = server_info['manager'].version
    if server_info['server_type'] == 'pg':
        server_info['template_path'] = 'grant_wizard/pg/#{0}#'.format(
            server_info['version'])
    elif server_info['server_type'] == 'ppas':
        server_info['template_path'] = 'grant_wizard/ppas/#{0}#'.format(
            server_info['version'])

    res, msg = get_data(sid, did, scid, 'schema' if scid else 'database',
                        server_info)

    tree_data = {
        'table': [],
        'view': [],
        'materialized view': [],
        'foreign table': [],
        'sequence': []
    }

    schema_group = {}

    for data in res:
        obj_type = data['object_type'].lower()
        if obj_type in ['table', 'view', 'materialized view', 'foreign table',
                        'sequence']:

            if data['nspname'] not in schema_group:
                schema_group[data['nspname']] = {
                    'id': data['nspname'],
                    'name': data['nspname'],
                    'icon': 'icon-schema',
                    'children': copy.deepcopy(tree_data),
                    'is_schema': True,
                }
            icon_data = {
                'materialized view': 'icon-mview',
                'foreign table': 'icon-foreign_table'
            }
            icon = icon_data[obj_type] if obj_type in icon_data \
                else data['icon']
            schema_group[data['nspname']]['children'][obj_type].append({
                'id': f'{data["nspname"]}_{data["name"]}',
                'name': data['name'],
                'icon': icon,
                'schema': data['nspname'],
                'type': obj_type,
                '_name': '{0}.{1}'.format(data['nspname'], data['name'])
            })

    schema_group = [dt for k, dt in schema_group.items()]
    for ch in schema_group:
        children = []
        for obj_type, data in ch['children'].items():
            if data:
                icon_data = {
                    'materialized view': 'icon-coll-mview',
                    'foreign table': 'icon-coll-foreign_table'
                }
                icon = icon_data[obj_type] if obj_type in icon_data \
                    else f'icon-coll-{obj_type.lower()}',
                children.append({
                    'id': f'{ch["id"]}_{obj_type}',
                    'name': f'{obj_type.title()}s',
                    'icon': icon,
                    'children': data,
                    'type': obj_type,
                    'is_collection': True,
                })

        ch['children'] = children

    return make_json_response(
        data=schema_group,
        success=200
    )
