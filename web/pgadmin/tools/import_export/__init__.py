##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the import and export functionality"""

import simplejson as json
import os

from flask import url_for, Response, render_template, request, current_app
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, get_storage_directory, html
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


blueprint = ImportExportModule(MODULE_NAME, __name__)


class Message(IProcessDesc):
    """
    Message(IProcessDesc)

    Defines the message shown for the Message operation.
    """

    def __init__(self, _sid, _schema, _tbl, _database, _storage):
        self.sid = _sid
        self.schema = _schema
        self.table = _tbl
        self.database = _database
        self.storage = _storage

    @property
    def message(self):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        return _(
            "Copying table data - '{0}.{1}' on database '{2}' and server ({3}{4})..."
        ).format(
            self.schema, self.table, self.database, s.host, s.port
        )

    def details(self, cmd, args):
        # Fetch the server details like hostname, port, roles etc
        s = Server.query.filter_by(
            id=self.sid, user_id=current_user.id
        ).first()

        res = '<div class="h5">'
        res += html.safe_str(
            _(
                "Copying table data '{0}.{1}' on database '{2}' for the server - '{3}'"
            ).format(
                self.schema, self.table, self.database,
                "{0} ({1}:{2})".format(s.name, s.host, s.port)
            )
        )

        res += '</div><div class="h5">'
        res += html.safe_str(
            _("Running command:")
        )
        res += '</b><br><span class="pg-bg-cmd">'
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
                if arg == '--command':
                    replace_next = True
                res += ' ' + arg
            elif replace_next:
                if self.storage:
                    arg = arg.replace(self.storage, '<STORAGE_DIR>')
                res += ' "' + html.safe_str(arg) + '"'
            else:
                res += cmdArg(arg)
        res += '</span></div>'

        return res


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL can not be called directly!"))


@blueprint.route("/js/import_export.js")
@login_required
def script():
    """render the import/export javascript file"""
    return Response(
        response=render_template("import_export/js/import_export.js", _=_),
        status=200,
        mimetype="application/javascript"
    )


@blueprint.route('/create_job/<int:sid>', methods=['POST'])
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
        # Convert ImmutableDict to dict
        data = dict(request.form)
        data = json.loads(data['data'][0], encoding='utf-8')
    else:
        data = json.loads(request.data, encoding='utf-8')

    # Fetch the server details like hostname, port, roles etc
    server = Server.query.filter_by(
        id=sid).first()

    if server is None:
        return make_json_response(
            success=0,
            errormsg=_("Couldn't find the given server")
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
            errormsg=_("Please connect to the server first...")
        )

    # Get the utility path from the connection manager
    utility = manager.utility('sql')

    # Get the storage path from preference
    storage_dir = get_storage_directory()

    if 'filename' in data:
        if os.name == 'nt':
            data['filename'] = data['filename'].replace('/', '\\')
            if storage_dir:
                storage_dir = storage_dir.replace('/', '\\')
            data['filename'] = data['filename'].replace('\\', '\\\\')
            data['filename'] = os.path.join(storage_dir, data['filename'].lstrip('/'))
        elif storage_dir:
            data['filename'] = os.path.join(storage_dir, data['filename'].lstrip('/'))
        else:
            data['filename'] = data['filename']

    else:
        return make_json_response(
            data={'status': False, 'info': 'Please specify a valid file'}
        )

    cols = None
    icols = None

    if data['icolumns']:
        ignore_cols = data['icolumns']

        # format the ignore column list required as per copy command
        # requirement
        if ignore_cols and len(ignore_cols) > 0:
            for col in ignore_cols:
                if icols:
                    icols += ', '
                else:
                    icols = '('
                icols += driver.qtIdent(conn, col)
            icols += ')'

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

    args = [
        '--host', server.host, '--port', str(server.port),
        '--username', server.username, '--dbname', data['database'],
        '--command', query
    ]

    try:
        p = BatchProcess(
            desc=Message(
                sid,
                data['schema'],
                data['table'],
                data['database'],
                storage_dir
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
