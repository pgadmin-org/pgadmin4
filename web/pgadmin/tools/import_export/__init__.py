##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the import and export functionality"""

import json
import copy

from flask import Response, render_template, request, current_app
from flask_babel import gettext as _
from flask_security import current_user, permissions_required
from pgadmin.user_login_check import pga_login_required
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, IS_WIN, \
    does_utility_exist, get_server, filename_with_file_manager_path
from pgadmin.utils.ajax import make_json_response, bad_request, unauthorized

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server
from pgadmin.utils.constants import SERVER_NOT_FOUND
from pgadmin.settings import get_setting, store_setting
from pgadmin.tools.user_management.PgAdminPermissions import AllPermissionTypes

MODULE_NAME = 'import_export'
NOT_NULL_COLUMNS = 'not_null_columns'
NULL_COLUMNS = 'null_columns'


class ImportExportModule(PgAdminModule):
    """
    class ImportExportModule(PgAdminModule)

        A module class for import which is derived from PgAdminModule.
    """

    LABEL = _('Import/Export')

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for backup module
        """
        return ['import_export.create_job', 'import_export.utility_exists',
                'import_export.get_settings']


blueprint = ImportExportModule(MODULE_NAME, __name__)


class IEMessage(IProcessDesc):
    """
    IEMessage(IProcessDesc)

    Defines the message shown for the import/export operation.
    """

    def __init__(self, *_args, **io_params):
        self.sid = io_params['sid']
        self.schema = io_params['schema']
        self.table = io_params['table']
        self.database = io_params['database']
        self._cmd = ''
        self.is_import = io_params['is_import']
        self.bfile = io_params['filename']

        if io_params['storage']:
            io_params['storage'] = io_params['storage'].replace('\\', '/')

        def cmd_arg(x):
            if x:
                x = x.replace('\\', '\\\\')
                x = x.replace('"', '\\"')
                x = x.replace('""', '\\"')

                return ' "' + x + '"'
            return ''

        replace_next = False
        for arg in _args:
            if arg and len(arg) >= 2 and arg.startswith('--'):
                if arg == '--command':
                    replace_next = True
                self._cmd += ' ' + arg
            elif replace_next:
                arg = cmd_arg(arg)
                if io_params['storage'] is not None:
                    arg = arg.replace(io_params['storage'], '<STORAGE_DIR>')
                self._cmd += ' "' + arg + '"'
            else:
                self._cmd += cmd_arg(arg)

    def get_server_name(self):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        if s is None:
            return _("Not available")
        host_port_str = ''
        if s.host:
            host_port_str = '({0}:{1})'.format(
                s.host, s.port) if s.port else '{0}'.format(s.host)

        return "{0} {1}".format(s.name, host_port_str)

    @property
    def message(self):
        # Fetch the server details like hostname, port, roles etc
        if self.schema is None and self.table is None:
            return _(
                "Copying table data using query on database '{0}' "
                "and server '{1}'"
            ).format(self.database, self.get_server_name())
        else:
            return _(
                "Copying table data '{0}.{1}' on database '{2}' "
                "and server '{3}'"
            ).format(
                self.schema, self.table, self.database,
                self.get_server_name()
            )

    @property
    def type_desc(self):
        if self.schema is None and self.table is None:
            return _("Export - Copying table data using query")
        else:
            _type_desc = _("Import - ") if self.is_import else _("Export - ")
            return _type_desc + _("Copying table data")

    def details(self, cmd, args):
        # Fetch the server details like hostname, port, roles etc
        if self.schema is None and self.table is None:
            object_str = "{0}".format(self.database)
        else:
            object_str = "{0}/{1}.{2}".format(self.database, self.schema,
                                              self.table)
        return {
            "message": self.message,
            "cmd": self._cmd,
            "server": self.get_server_name(),
            "object": object_str,
            "type": _("Import Data") if self.is_import else _("Export Data")
        }


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


def columns_to_string(columns, driver, conn):
    """
    This function create the columns list as a string
    """
    cols = None
    for col in columns:
        if cols:
            cols += ', '
        else:
            cols = '('
        cols += driver.qtIdent(conn, col)
    cols += ')'

    return cols


def _get_force_quote_column_list(data, driver, conn):
    """
    Get list of required columns for import/export.
    :param data: Data.
    :param key: Key.
    :param driver: PG Driver.
    :param conn: Connection.
    :return: return required column list.
    """
    cols = None

    if 'force_quote_columns' not in data:
        return cols

    # if export is using query then we need to check * is available in the
    # force_quote_columns then return *.
    if ('is_query_export' in data and data['is_query_export'] and
            '*' in data['force_quote_columns']):
        cols = '*'
    # If total columns is equal to selected columns for force quote then
    # return '*'
    elif ('total_columns' in data and
          len(data['force_quote_columns']) == data['total_columns']):
        cols = '*'
    else:
        if len(data['force_quote_columns']) > 0:
            cols = columns_to_string(data['force_quote_columns'], driver, conn)

    return cols


def _get_formatted_column_list(data, key, driver, conn):
    """
    Get list of required columns for import/export.
    :param data: Data.
    :param key: Key.
    :param driver: PG Driver.
    :param conn: Connection.
    :return: return required column list.
    """
    cols = None
    if key not in data:
        return cols

    # if server version is >= 17 and key is either NULL_COLUMNS or
    # NOT_NULL_COLUMNS and total columns is equal to selected columns then
    # return '*'
    if ('total_columns' in data and conn.manager.version >= 170000 and
        key in [NULL_COLUMNS, NOT_NULL_COLUMNS] and
            len(data[key]) == data['total_columns']):
        cols = '*'
    else:
        columns = data[key]
        if len(columns) > 0:
            cols = columns_to_string(columns, driver, conn)

    return cols


def _save_import_export_settings(settings):
    settings = {key: settings[key] for key in settings if key not in
                ['columns', 'database', 'schema', 'table', 'save_btn_icon',
                 'not_null_columns', 'null_columns', 'force_quote_columns',
                 'total_columns', 'is_query_export']}

    if settings['is_import']:
        settings['import_file_name'] = settings['filename']
    else:
        settings['export_file_name'] = settings['filename']

    # Get existing setting -
    old_settings = get_setting('import_export_setting')
    if old_settings and old_settings != 'null':
        old_settings = json.loads(old_settings)
        old_settings.update(settings)
        settings = json.dumps(settings)
    else:
        if 'import_file_name' not in settings:
            settings['import_file_name'] = ''
        elif 'export_file_name' not in settings:
            settings['export_file_name'] = ''
        settings = json.dumps(settings)

    store_setting('import_export_setting', settings)


def update_data_for_import_export(data):
    """
    This function will update the data. Remove unwanted keys based on
    import/export type
    """
    keys_not_required_with_query = ['on_error', 'log_verbosity', 'freeze',
                                    'default_string']
    if 'is_query_export' in data and data['is_query_export']:
        for k in keys_not_required_with_query:
            data.pop(k, None)
        data['is_import'] = False
    else:
        data.pop('query', None)


@blueprint.route('/job/<int:sid>', methods=['POST'], endpoint="create_job")
@permissions_required(AllPermissionTypes.tools_import_export_data)
@pga_login_required
def create_import_export_job(sid):
    """
    Args:
        sid: Server ID

        Creates a new job for import and export table data functionality

    Returns:
        None
    """
    if request.form:
        data = json.loads(request.form['data'])
    else:
        data = json.loads(request.data)

    # Fetch the server details like hostname, port, roles etc
    server = Server.query.filter_by(
        id=sid).first()

    if server is None:
        return bad_request(errormsg=_("Could not find the given server"))

    # To fetch MetaData for the server
    from pgadmin.utils.driver import get_driver
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)
    conn = manager.connection()
    connected = conn.connected()

    if not connected:
        return bad_request(errormsg=_("Please connect to the server first..."))

    # Get the utility path from the connection manager
    utility = manager.utility('sql')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )
    # Copy request data to store
    new_settings = copy.deepcopy(data)

    # Get the storage path from preference
    storage_dir = get_storage_directory()

    if 'filename' in data:
        try:
            _file = filename_with_file_manager_path(
                data['filename'], not data['is_import'])
        except PermissionError as e:
            return unauthorized(errormsg=str(e))
        except Exception as e:
            return bad_request(errormsg=str(e))

        if not _file:
            return bad_request(errormsg=_('Please specify a valid file'))
        elif IS_WIN:
            _file = _file.replace('\\', '/')

        data['filename'] = _file
    else:
        return bad_request(errormsg=_('Please specify a valid file'))

    # Get required and other columns list
    cols = _get_formatted_column_list(data, 'columns', driver, conn)
    not_null_cols = _get_formatted_column_list(data, NOT_NULL_COLUMNS,
                                               driver, conn)
    null_cols = _get_formatted_column_list(data, NULL_COLUMNS, driver,
                                           conn)
    quote_cols = _get_force_quote_column_list(data, driver, conn)

    # Save the settings
    _save_import_export_settings(new_settings)

    # Remove unwanted keys from data
    update_data_for_import_export(data)

    # Replace "\n" with " " as it is not working on Windows.
    if 'query' in data:
        data['query'] = data['query'].replace("\n", " ")

    # Create the COPY FROM/TO  from template
    temp_path = 'import_export/sql/#{0}#/cmd.sql'.format(manager.version)
    query = render_template(temp_path, conn=conn, data=data, columns=cols,
                            not_null_columns=not_null_cols,
                            null_columns=null_cols,
                            force_quote_columns=quote_cols)

    args = ['--command', query]

    try:
        io_params = {
            'sid': sid,
            'schema': data['schema'] if 'schema' in data else None,
            'table': data['table'] if 'table' in data else None,
            'database': data['database'],
            'is_import': data['is_import'],
            'filename': data['filename'],
            'storage': storage_dir,
            'utility': utility
        }

        p = BatchProcess(
            desc=IEMessage(
                *args,
                **io_params
            ),
            cmd=utility, args=args, manager_obj=manager
        )

        env = dict()
        env['PGHOST'] = \
            manager.local_bind_host if manager.use_ssh_tunnel else server.host
        env['PGPORT'] = \
            str(manager.local_bind_port) if manager.use_ssh_tunnel else str(
                server.port)
        env['PGUSER'] = server.username
        env['PGDATABASE'] = data['database']

        # Delete the empty keys
        for key, value in dict(env).items():
            if value is None:
                del env[key]

        p.set_env_variables(server, env=env)
        p.start()
        jid = p.id
    except Exception as e:
        current_app.logger.exception(e)
        return bad_request(errormsg=str(e))

    # Return response
    return make_json_response(
        data={'job_id': jid, 'desc': p.desc.message, 'success': 1}
    )


@blueprint.route('/get_settings/', methods=['GET'], endpoint='get_settings')
@pga_login_required
def get_import_export_settings():
    settings = get_setting('import_export_setting', None)
    if settings is None:
        return make_json_response(success=True, data={})
    else:
        data = json.loads(settings)
        return make_json_response(success=True, data=data)


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

    server = get_server(sid)

    if server is None:
        return make_json_response(
            success=0,
            errormsg=SERVER_NOT_FOUND
        )

    from pgadmin.utils.driver import get_driver
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)

    utility = manager.utility('sql')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )

    return make_json_response(success=1)
