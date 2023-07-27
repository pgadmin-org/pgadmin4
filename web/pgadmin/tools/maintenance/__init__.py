##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the maintenance tool for vacuum"""

import json

from flask import url_for, Response, render_template, request, current_app
from flask_babel import gettext as _
from flask_security import login_required, current_user
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc
from pgadmin.utils import PgAdminModule, html, does_utility_exist, get_server
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
    """
    LABEL = _('Maintenance')

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

    def get_object_msg(self):
        msg = _("on database '{0}'").format(self.data['database'])
        if 'primary_key' in self.data or 'unique_constraint' in self.data:
            msg = _("on constraint '{0}/{1}/{2}/{3}'").format(
                self.data['database'], self.data['schema'], self.data['table'],
                self.data['primary_key'] if 'primary_key' in self.data else
                self.data['unique_constraint'])
        elif 'index' in self.data:
            msg = _("on index '{0}/{1}/{2}/{3}'").format(
                self.data['database'], self.data['schema'],
                self.data['table'], self.data['index'])
        elif 'table' in self.data:
            msg = _("on table '{0}/{1}/{2}'").format(
                self.data['database'], self.data['schema'], self.data['table'])
        elif 'schema' in self.data:
            msg = _("on schema '{0}/{1}'").format(self.data['database'],
                                                  self.data['schema'])
        return msg

    @property
    def message(self):
        op = _('VACUUM')
        if self.data['op'] == "ANALYZE":
            op = _('ANALYZE')
        elif self.data['op'] == "REINDEX" and 'schema' not in self.data:
            op = _('REINDEX')
        elif self.data['op'] == "REINDEX" and 'schema' in self.data:
            if 'primary_key' in self.data or 'unique_constraint' in self.data\
                    or 'index' in self.data:
                op = _('REINDEX INDEX')
            elif 'table' in self.data:
                op = _('REINDEX TABLE')
            else:
                op = _('REINDEX SCHEMA')
        elif self.data['op'] == "CLUSTER":
            op = _('CLUSTER')

        res = _("{0} {1} of server {2}")
        return res.format(op, self.get_object_msg(), self.get_server_name())

    @property
    def type_desc(self):
        return _("Maintenance")

    def details(self, cmd, args):
        return {
            "message": self.message,
            "query": self.query,
            "server": self.get_server_name(),
            "object": self.data['database'],
            "type": self.type_desc,
        }


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
        data = json.loads(request.form['data'])
    else:
        data = json.loads(request.data)

    index_name = get_index_name(data)

    # Fetch the server details like hostname, port, roles etc

    server = get_server(sid)

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
            desc=Message(server.id, data, query),
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
        data={'job_id': jid, 'desc': p.desc.message, 'status': True,
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
