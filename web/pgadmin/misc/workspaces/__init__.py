##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the workspace."""
import json
import config
from config import PG_DEFAULT_DRIVER
from flask import request, current_app
from pgadmin.user_login_check import pga_login_required
from flask_babel import gettext
from flask_security import current_user
from pgadmin.utils import PgAdminModule
from pgadmin.model import db, Server
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import bad_request, make_json_response
from pgadmin.browser.server_groups.servers.utils import (
    is_valid_ipaddress, convert_connection_parameter, check_ssl_fields)
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.browser.server_groups.servers.utils import (
    disconnect_from_all_servers, delete_adhoc_servers)
from pgadmin.tools.psql import get_open_psql_connections

MODULE_NAME = 'workspace'


class WorkspaceModule(PgAdminModule):

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for Workspace module
        """
        return [
            'workspace.adhoc_connect_server',
            'workspace.layout_changed'
        ]


blueprint = WorkspaceModule(MODULE_NAME, __name__,
                            url_prefix='/misc/workspace')


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(
        errormsg=gettext('This URL cannot be requested directly.')
    )


@blueprint.route(
    '/adhoc_connect_server',
    methods=["POST"],
    endpoint="adhoc_connect_server"
)
@pga_login_required
def adhoc_connect_server():
    required_args = ['server_name', 'did']

    data = request.form if request.form else json.loads(
        request.data
    )

    # Loop through data and if found any value is blank string then
    # convert it to None as after porting into React, from frontend
    # '' blank string is coming as a value instead of null.
    for item in data:
        if data[item] == '':
            data[item] = None

    # Some fields can be provided with service file so they are optional
    if 'service' in data and not data['service']:
        required_args.extend([
            'host',
            'port',
            'user'
        ])

    for arg in required_args:
        if arg not in data:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    "Could not find the required parameter ({})."
                ).format(arg)
            )

    connection_params = convert_connection_parameter(
        data.get('connection_params', []))

    if connection_params is not None:
        if 'hostaddr' in connection_params and \
                not is_valid_ipaddress(connection_params['hostaddr']):
            return make_json_response(
                success=0,
                status=400,
                errormsg=gettext('Not a valid Host address')
            )

        # To check ssl configuration
        _, connection_params = check_ssl_fields(connection_params)
        # set the connection params again in the data
        if 'connection_params' in data:
            data['connection_params'] = connection_params

    # Fetch all the new data in case of non-existing servers
    new_host = data.get('host', None)
    new_port = int(data.get('port', 0))
    new_db = data.get('database_name', None)
    if new_db is None:
        new_db = data.get('did')
    new_username = data.get('user')
    new_role = data.get('role', None)
    new_server_name = data.get('server_name', None)
    new_service = data.get('service', None)

    try:
        server = None
        if config.CONFIG_DATABASE_URI is not None and \
                len(config.CONFIG_DATABASE_URI) > 0:
            # Filter out all the servers with the below combination.
            servers = Server.query.filter_by(host=new_host,
                                             port=new_port,
                                             maintenance_db=new_db,
                                             username=new_username,
                                             name=new_server_name,
                                             role=new_role,
                                             service=new_service
                                             ).all()

            # If found matching servers then compare the connection_params as
            # with external database (PostgreSQL) comparing two json objects
            # are not supported.
            for existing_server in servers:
                if existing_server.connection_params == connection_params:
                    server = existing_server
                    break
        else:
            server = Server.query.filter_by(host=new_host,
                                            port=new_port,
                                            maintenance_db=new_db,
                                            username=new_username,
                                            name=new_server_name,
                                            role=new_role,
                                            service=new_service,
                                            connection_params=connection_params
                                            ).first()

        # If server is none then no server with the above combination is found.
        if server is None:
            # Check if sid is present in data if it is then used that sid.
            if ('sid' in data and data['sid'] is not None and
                    int(data['sid']) > 0):
                server = Server.query.filter_by(id=data['sid']).first()

                # Clone the server object
                server = server.clone()

                # Replace the following with the new/changed value.
                server.maintenance_db = new_db
                server.username = new_username
                server.role = new_role
                server.connection_params = connection_params
                server.is_adhoc = 1

                db.session.add(server)
                db.session.commit()
            else:
                server = Server(
                    user_id=current_user.id,
                    servergroup_id=data.get('gid', 1),
                    name=new_server_name,
                    host=new_host,
                    port=new_port,
                    maintenance_db=new_db,
                    username=new_username,
                    role=new_role,
                    service=new_service,
                    connection_params=connection_params,
                    is_adhoc=1
                )
                db.session.add(server)
                db.session.commit()

        view = SchemaDiffRegistry.get_node_view('server')
        return view.connect(1, server.id, is_qt=False, server=server)
    except Exception as e:
        current_app.logger.exception(e)
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(e)
        )


@blueprint.route(
    '/layout_changed',
    methods=["DELETE"],
    endpoint="layout_changed"
)
@pga_login_required
def layout_changed():
    # if layout is changed from 'Workspace' to 'Classic', disconnect all
    # servers.
    disconnect_from_all_servers()
    delete_adhoc_servers()

    return make_json_response(status=200)


def check_and_delete_adhoc_server(sid):
    """
    This function is used to check for adhoc server and if all Query Tool
    and PSQL connections are closed then delete that server.
    """
    server = Server.query.filter_by(id=sid).first()
    if server.is_adhoc:
        # Check PSQL connections. If more connections are open for
        # the given sid return from the function.
        psql_connections = get_open_psql_connections()
        if sid in psql_connections.values():
            return

        # Check Query Tool connections for the given sid
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        for key, value in manager.connections.items():
            if key.startswith('CONN') and value.connected():
                return

        # Assumption at this point all the Query Tool and PSQL connections
        # is closed, so now we can release the manager
        manager.release()

        # Delete the adhoc server from the pgadmin database
        delete_adhoc_servers(sid)
