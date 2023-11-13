##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the import and export functionality"""

import json
import copy

from flask import Response, render_template, request, current_app
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, IS_WIN, \
    does_utility_exist, get_server, filename_with_file_manager_path
from pgadmin.utils.ajax import make_json_response, bad_request, unauthorized

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.settings import get_setting, store_setting

MODULE_NAME = 'import_export'


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
            if arg and len(arg) >= 2 and arg[:2] == '--':
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
        return _(
            "Copying table data '{0}.{1}' on database '{2}' "
            "and server '{3}'"
        ).format(
            self.schema, self.table, self.database,
            self.get_server_name()
        )

    @property
    def type_desc(self):
        _type_desc = _("Import - ") if self.is_import else _("Export - ")
        return _type_desc + _("Copying table data")

    def details(self, cmd, args):
        # Fetch the server details like hostname, port, roles etc
        return {
            "message": self.message,
            "cmd": self._cmd,
            "server": self.get_server_name(),
            "object": "{0}/{1}.{2}".format(self.database, self.schema,
                                           self.table),
            "type": _("Import Data") if self.is_import else _("Export Data")
        }


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route("/js/import_export.js")
@login_required
def script():
    """render the import/export javascript file"""
    return Response(
        response=render_template("import_export/js/import_export.js", _=_),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


def _get_ignored_column_list(data, driver, conn):
    """
    Get list of ignored columns for import/export.
    :param data: Data.
    :param driver: PG Driver.
    :param conn: Connection.
    :return: return ignored column list.
    """
    icols = None

    if data['icolumns']:
        ignore_cols = data['icolumns']

        # format the ignore column list required as per copy command
        # requirement
        if ignore_cols and len(ignore_cols) > 0:
            icols = ", ".join([
                driver.qtIdent(conn, col)
                for col in ignore_cols])
    return icols


def _get_required_column_list(data, driver, conn):
    """
    Get list of required columns for import/export.
    :param data: Data.
    :param driver: PG Driver.
    :param conn: Connection.
    :return: return required column list.
    """
    cols = None

    # format the column import/export list required as per copy command
    # requirement
    if data['columns']:
        columns = data['columns']
        if columns and len(columns) > 0:
            for col in columns:
                if cols:
                    cols += ', '
                else:
                    cols = '('
                cols += driver.qtIdent(conn, col)
            cols += ')'

    return cols


def _save_import_export_settings(settings):
    settings = {key: settings[key] for key in settings if key not in
                ['icolumns', 'columns', 'database', 'schema', 'table',
                 'save_btn_icon']}

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


@blueprint.route('/job/<int:sid>', methods=['POST'], endpoint="create_job")
@login_required
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

    # Get required and ignored column list
    icols = _get_ignored_column_list(data, driver, conn)
    cols = _get_required_column_list(data, driver, conn)

    # Save the settings
    _save_import_export_settings(new_settings)

    # Create the COPY FROM/TO  from template
    query = render_template(
        'import_export/sql/cmd.sql',
        conn=conn,
        data=data,
        columns=cols,
        ignore_column_list=icols
    )

    args = ['--command', query]

    try:

        io_params = {
            'sid': sid,
            'schema': data['schema'],
            'table': data['table'],
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
@login_required
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
@login_required
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
            errormsg=_("Could not find the specified server.")
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
