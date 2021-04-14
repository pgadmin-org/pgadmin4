##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the maintenance tool for vacuum"""

import simplejson as json

from flask import url_for, Response, render_template, request, current_app
from flask_babelex import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, html, does_utility_exist
from pgadmin.utils.ajax import bad_request, make_json_response
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.model import Server, SharedServer
from pgadmin.utils.constants import MIMETYPE_APP_JS

MODULE_NAME = 'maintenance'


class MaintenanceModule(PgAdminModule):
    """
    class MaintenanceModule(PgAdminModule)

        A module class for maintenance tools of vacuum which is derived from
        PgAdminModule.

    Methods:
    -------
    * get_own_javascripts()
      - Method is used to load the required javascript files for maintenance
        tool module
    * get_own_stylesheets()
      - Returns the list of CSS file used by Maintenance module
    """
    LABEL = _('Maintenance')

    def get_own_javascripts(self):
        scripts = list()
        for name, script in [
            ['pgadmin.tools.maintenance', 'js/maintenance']
        ]:
            scripts.append({
                'name': name,
                'path': url_for('maintenance.index') + script,
                'when': None
            })

        return scripts

    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module.
        """
        stylesheets = []
        return stylesheets

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for backup module
        """
        return ['maintenance.create_job', 'maintenance.utility_exists']


blueprint = MaintenanceModule(MODULE_NAME, __name__)


class Message(IProcessDesc):
    def __init__(self, _sid, _data, _query):
        self.sid = _sid
        self.data = _data
        self.query = _query

    @property
    def message(self):
        res = _("Maintenance ({0})")

        if self.data['op'] == "VACUUM":
            return res.format(_('Vacuum'))
        if self.data['op'] == "ANALYZE":
            return res.format(_('Analyze'))
        if self.data['op'] == "REINDEX":
            return res.format(_('Reindex'))
        if self.data['op'] == "CLUSTER":
            return res.format(_('Cluster'))

    @property
    def type_desc(self):
        return _("Maintenance")

    def _check_for_vacuum(self):
        """
        Check for VACUUM in data and return format response.
        :return: response.
        """
        res = None
        if self.data['op'] == "VACUUM":
            res = _('VACUUM ({0})')

            opts = []
            if self.data['vacuum_full']:
                opts.append(_('FULL'))
            if self.data['vacuum_freeze']:
                opts.append(_('FREEZE'))
            if self.data['verbose']:
                opts.append(_('VERBOSE'))

            res = res.format(', '.join(str(x) for x in opts))
        return res

    def details(self, cmd, args):
        res = self._check_for_vacuum()

        if self.data['op'] == "ANALYZE":
            res = _('ANALYZE')
            if self.data['verbose']:
                res += '(' + _('VERBOSE') + ')'

        if self.data['op'] == "REINDEX":
            if 'schema' in self.data and self.data['schema']:
                if 'primary_key' in self.data or\
                    'unique_constraint' in self.data or\
                        'index' in self.data:
                    return _('REINDEX INDEX')
                else:
                    return _('REINDEX TABLE')
            res = _('REINDEX')

        if self.data['op'] == "CLUSTER":
            res = _('CLUSTER')

        res = '<div>' + html.safe_str(res)

        res += '</div><div class="py-1">'
        res += _("Running Query:")
        res += '<div class="pg-bg-cmd enable-selection p-1">'
        res += html.safe_str(self.query)
        res += '</div></div>'

        return res


@blueprint.route("/")
@login_required
def index():
    return bad_request(
        errormsg=_("This URL cannot be called directly.")
    )


@blueprint.route("/js/maintenance.js")
@login_required
def script():
    """render the maintenance tool of vacuum javascript file"""
    return Response(
        response=render_template("maintenance/js/maintenance.js", _=_),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


def get_index_name(data):
    """
    Check and get index name from constraints.
    :param data: Data.
    :return: index_name.
    """
    index_name = None
    if 'primary_key' in data and data['primary_key']:
        index_name = data['primary_key']
    elif 'unique_constraint' in data and data['unique_constraint']:
        index_name = data['unique_constraint']
    elif 'index' in data and data['index']:
        index_name = data['index']

    return index_name


@blueprint.route(
    '/job/<int:sid>/<int:did>', methods=['POST'], endpoint='create_job'
)
@login_required
def create_maintenance_job(sid, did):
    """
    Args:
        sid: Server ID
        did: Database ID

        Creates a new job for maintenance vacuum operation

    Returns:
        None
    """
    if request.form:
        data = json.loads(request.form['data'], encoding='utf-8')
    else:
        data = json.loads(request.data, encoding='utf-8')

    index_name = get_index_name(data)

    # Fetch the server details like hostname, port, roles etc
    if Server.query.filter_by(id=sid, user_id=current_user.id).first():
        server = Server.query.filter_by(
            id=sid, user_id=current_user.id
        ).first()
    else:
        server = SharedServer.query.filter_by(
            id=sid, user_id=current_user.id
        ).first()

    if server is None:
        return make_json_response(
            success=0,
            errormsg=_("Could not find the given server")
        )

    # To fetch MetaData for the server
    driver = get_driver(PG_DEFAULT_DRIVER)
    manager = driver.connection_manager(server.id)
    conn = manager.connection()
    connected = conn.connected()

    if not connected:
        return make_json_response(
            success=0,
            errormsg=_("Please connect to the server first.")
        )

    utility = manager.utility('sql')
    ret_val = does_utility_exist(utility)
    if ret_val:
        return make_json_response(
            success=0,
            errormsg=ret_val
        )

    # Create the command for the vacuum operation
    query = render_template(
        'maintenance/sql/command.sql', conn=conn, data=data,
        index_name=index_name
    )

    args = [
        '--host',
        manager.local_bind_host if manager.use_ssh_tunnel else server.host,
        '--port',
        str(manager.local_bind_port) if manager.use_ssh_tunnel
        else str(server.port),
        '--username', server.username, '--dbname',
        data['database'],
        '--command', query
    ]

    try:
        p = BatchProcess(
            desc=Message(sid, data, query),
            cmd=utility, args=args
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
        data={'job_id': jid, 'status': True,
              'info': _('Maintenance job created.')}
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
    # server = Server.query.filter_by(
    #     id=sid, user_id=current_user.id
    # ).first()

    if Server.query.filter_by(id=sid, user_id=current_user.id).first():
        server = Server.query.filter_by(
            id=sid, user_id=current_user.id
        ).first()
    else:
        server = SharedServer.query.filter_by(
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
