##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the import and export functionality"""

import simplejson as json
import os

from flask import url_for, Response, render_template, request, current_app
from flask_babelex import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, html, \
    fs_short_path, document_dir, IS_WIN, does_utility_exist
from pgadmin.utils.ajax import make_json_response, bad_request

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server

MODULE_NAME = 'import_export'


class ImportExportModule(PgAdminModule):
    """
    class ImportExportModule(PgAdminModule)

        A module class for import which is derived from PgAdminModule.

    Methods:
    -------
    * get_own_javascripts(self)
      - Method is used to load the required javascript files for import module
    """

    LABEL = _('Import/Export')

    def get_own_javascripts(self):
        scripts = list()
        for name, script in [
            ['pgadmin.tools.import_export', 'js/import_export']
        ]:
            scripts.append({
                'name': name,
                'path': url_for('import_export.index') + script,
                'when': None
            })

        return scripts

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for backup module
        """
        return ['import_export.create_job', 'import_export.utility_exists']


blueprint = ImportExportModule(MODULE_NAME, __name__)


class IEMessage(IProcessDesc):
    """
    IEMessage(IProcessDesc)

    Defines the message shown for the import/export operation.
    """

    def __init__(self, _sid, _schema, _tbl, _database, _storage, *_args):
        self.sid = _sid
        self.schema = _schema
        self.table = _tbl
        self.database = _database
        self._cmd = ''

        if _storage:
            _storage = _storage.replace('\\', '/')

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
                if _storage is not None:
                    arg = arg.replace(_storage, '<STORAGE_DIR>')
                self._cmd += ' "' + arg + '"'
            else:
                self._cmd += cmd_arg(arg)

    @property
    def message(self):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        return _(
            "Copying table data '{0}.{1}' on database '{2}' "
            "and server ({3}:{4})"
        ).format(
            html.safe_str(self.schema),
            html.safe_str(self.table),
            html.safe_str(self.database),
            html.safe_str(s.host),
            html.safe_str(s.port)
        )

    @property
    def type_desc(self):
        return _("Copying table data")

    def details(self, cmd, args):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        res = '<div>'
        res += _(
            "Copying table data '{0}.{1}' on database '{2}' "
            "for the server '{3}'"
        ).format(
            html.safe_str(self.schema),
            html.safe_str(self.table),
            html.safe_str(self.database),
            "{0} ({1}:{2})".format(
                html.safe_str(s.name),
                html.safe_str(s.host),
                html.safe_str(s.port)
            )
        )

        res += '</div><div class="py-1">'
        res += _("Running command:")
        res += '<div class="pg-bg-cmd enable-selection p-1">'
        res += html.safe_str(self._cmd)
        res += '</div></div>'

        return res


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
        mimetype="application/javascript"
    )


def filename_with_file_manager_path(_file, _present=False):
    """
    Args:
        file: File name returned from client file manager

    Returns:
        Filename to use for backup with full path taken from preference
    """
    # Set file manager directory from preference
    storage_dir = get_storage_directory()

    if storage_dir:
        _file = os.path.join(storage_dir, _file.lstrip(u'/').lstrip(u'\\'))
    elif not os.path.isabs(_file):
        _file = os.path.join(document_dir(), _file)

    if not _present:
        # Touch the file to get the short path of the file on windows.
        with open(_file, 'a'):
            return fs_short_path(_file)
    else:
        if not os.path.isfile(_file):
            return None

    return fs_short_path(_file)


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
        data = json.loads(request.form['data'], encoding='utf-8')
    else:
        data = json.loads(request.data, encoding='utf-8')

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

    # Get the storage path from preference
    storage_dir = get_storage_directory()

    if 'filename' in data:
        try:
            _file = filename_with_file_manager_path(
                data['filename'], data['is_import'])
        except Exception as e:
            return bad_request(errormsg=str(e))

        if not _file:
            return bad_request(errormsg=_('Please specify a valid file'))

        if IS_WIN:
            _file = _file.replace('\\', '/')

        data['filename'] = _file
    else:
        return bad_request(errormsg=_('Please specify a valid file'))

    cols = None
    icols = None

    if data['icolumns']:
        ignore_cols = data['icolumns']

        # format the ignore column list required as per copy command
        # requirement
        if ignore_cols and len(ignore_cols) > 0:
            icols = ", ".join([
                driver.qtIdent(conn, col)
                for col in ignore_cols])

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
        p = BatchProcess(
            desc=IEMessage(
                sid,
                data['schema'],
                data['table'],
                data['database'],
                storage_dir,
                utility, *args
            ),
            cmd=utility, args=args
        )
        manager.export_password_env(p.id)

        env = dict()
        env['PGHOST'] = server.host
        env['PGPORT'] = str(server.port)
        env['PGUSER'] = server.username
        env['PGDATABASE'] = data['database']
        p.set_env_variables(server, env=env)
        p.start()
        jid = p.id
    except Exception as e:
        current_app.logger.exception(e)
        return bad_request(errormsg=str(e))

    # Return response
    return make_json_response(
        data={'job_id': jid, 'success': 1}
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

    utility = manager.utility('sql')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )

    return make_json_response(success=1)
