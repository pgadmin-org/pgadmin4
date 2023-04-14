##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import pgadmin.browser.server_groups as sg
from flask import render_template, request, make_response, jsonify, \
    current_app, url_for, session
from flask_babel import gettext
from flask_security import current_user, login_required
from pgadmin.browser.server_groups.servers.types import ServerType
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, bad_request, forbidden, \
    make_response as ajax_response, internal_server_error, unauthorized, gone
from pgadmin.utils.crypto import encrypt, decrypt, pqencryptpassword
from pgadmin.utils.menu import MenuItem
from pgadmin.tools.sqleditor.utils.query_history import QueryHistory

import config
from config import PG_DEFAULT_DRIVER
from pgadmin.model import db, Server, ServerGroup, User, SharedServer
from pgadmin.utils.driver import get_driver
from pgadmin.utils.master_password import get_crypt_key
from pgadmin.utils.exception import CryptKeyMissing
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.browser.server_groups.servers.utils import is_valid_ipaddress
from pgadmin.utils.constants import UNAUTH_REQ, MIMETYPE_APP_JS, \
    SERVER_CONNECTION_CLOSED
from sqlalchemy import or_
from pgadmin.utils.preferences import Preferences
from .... import socketio as sio


def has_any(data, keys):
    """
    Checks any one of the keys present in the data given
    """
    if data is None and not isinstance(data, dict):
        return False

    if keys is None and not isinstance(keys, list):
        return False

    for key in keys:
        if key in data:
            return True

    return False


def recovery_state(connection, postgres_version):
    recovery_check_sql = render_template(
        "connect/sql/#{0}#/check_recovery.sql".format(postgres_version))

    status, result = connection.execute_dict(recovery_check_sql)
    if status and 'rows' in result and len(result['rows']) > 0:
        in_recovery = result['rows'][0]['inrecovery']
        wal_paused = result['rows'][0]['isreplaypaused']
    else:
        in_recovery = None
        wal_paused = None
    return status, result, in_recovery, wal_paused


def get_preferences():
    """
    Get preferences setting
    :return: whether to hide shared server or not.
    """
    hide_shared_server = None
    if config.SERVER_MODE:
        pref = Preferences.module('browser')
        hide_shared_server = pref.preference('hide_shared_server').get()

    return hide_shared_server


def server_icon_and_background(is_connected, manager, server):
    """

    Args:
        is_connected: Flag to check if server is connected
        manager: Connection manager
        server: Sever object

    Returns:
        Server Icon CSS class
    """
    server_background_color = ''
    if server and server.bgcolor:
        server_background_color = ' {0}'.format(
            server.bgcolor
        )
        # If user has set font color also
        if server.fgcolor:
            server_background_color = '{0} {1}'.format(
                server_background_color,
                server.fgcolor
            )

    if is_connected:
        return 'icon-{0}{1}'.format(
            manager.server_type, server_background_color
        )
    elif server.shared and config.SERVER_MODE:
        return 'icon-shared-server-not-connected{0}'.format(
            server_background_color
        )
    elif server.cloud_status == -1:
        return 'icon-server-cloud-deploy{0}'.format(
            server_background_color
        )
    else:
        return 'icon-server-not-connected{0}'.format(
            server_background_color
        )


class ServerModule(sg.ServerGroupPluginModule):
    _NODE_TYPE = "server"
    LABEL = gettext("Servers")

    @property
    def node_type(self):
        return self._NODE_TYPE

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return sg.ServerGroupModule.node_type

    @staticmethod
    def get_shared_server_properties(server, sharedserver):
        """
        Return shared server properties
        :param server:
        :param sharedserver:
        :return: shared server
        """
        server.bgcolor = sharedserver.bgcolor
        server.fgcolor = sharedserver.fgcolor
        server.name = sharedserver.name
        server.role = sharedserver.role
        server.use_ssh_tunnel = sharedserver.use_ssh_tunnel
        server.tunnel_host = sharedserver.tunnel_host
        server.tunnel_port = sharedserver.tunnel_port
        server.tunnel_authentication = sharedserver.tunnel_authentication
        server.tunnel_username = sharedserver.tunnel_username
        server.tunnel_password = sharedserver.tunnel_password
        server.save_password = sharedserver.save_password
        if hasattr(server, 'connection_params') and \
            hasattr(sharedserver, 'connection_params') and \
            'passfile' in server.connection_params and \
                'passfile' in sharedserver.connection_params:
            server.connection_params['passfile'] = \
                sharedserver.connection_params['passfile']
        server.servergroup_id = sharedserver.servergroup_id
        if hasattr(server, 'connection_params') and \
            hasattr(sharedserver, 'connection_params') and \
            'sslcert' in server.connection_params and \
                'sslcert' in sharedserver.connection_params:
            server.connection_params['sslcert'] = \
                sharedserver.connection_params['sslcert']
        server.username = sharedserver.username
        server.server_owner = sharedserver.server_owner
        server.password = sharedserver.password

        return server

    def get_servers(self, all_servers, hide_shared_server, gid):
        """
        This function creates list of servers which needs to display
        in browser tree
        :param all_servers:
        :param hide_shared_server:
        :param gid:
        :return: list of servers
        """
        servers = []
        for server in all_servers:
            if server.discovery_id and \
                not server.shared and \
                config.SERVER_MODE and \
                len(SharedServer.query.filter_by(
                    user_id=current_user.id,
                    name=server.name).all()) > 0 and not hide_shared_server:
                continue

            if server.shared and server.user_id != current_user.id:

                shared_server = self.get_shared_server(server, gid)

                if hide_shared_server:
                    # Don't include shared server if hide shared server is
                    # set to true.
                    continue

                server = self.get_shared_server_properties(server,
                                                           shared_server)
            servers.append(server)

        return servers

    @login_required
    def get_nodes(self, gid):
        """Return a JSON document listing the server groups for the user"""

        hide_shared_server = get_preferences()
        servers = Server.query.filter(
            or_(Server.user_id == current_user.id, Server.shared),
            Server.servergroup_id == gid)

        driver = get_driver(PG_DEFAULT_DRIVER)
        servers = self.get_servers(servers, hide_shared_server, gid)

        for server in servers:
            connected = False
            manager = None
            errmsg = None
            was_connected = False
            in_recovery = None
            wal_paused = None
            server_type = 'pg'
            user_info = None
            try:
                manager = driver.connection_manager(server.id)
                conn = manager.connection()
                was_connected = conn.wasConnected
                connected = conn.connected()
                if connected:
                    server_type = manager.server_type
                    user_info = manager.user_info
            except CryptKeyMissing:
                # show the nodes at least even if not able to connect.
                pass
            except Exception as e:
                current_app.logger.exception(e)
                errmsg = str(e)

            yield self.generate_browser_node(
                "%d" % (server.id),
                gid,
                server.name,
                server_icon_and_background(connected, manager, server),
                True,
                self.node_type,
                connected=connected,
                server_type=server_type,
                version=manager.version,
                db=manager.db,
                user=user_info,
                in_recovery=in_recovery,
                wal_pause=wal_paused,
                host=server.host,
                port=server.port,
                is_password_saved=bool(server.save_password),
                is_tunnel_password_saved=True
                if server.tunnel_password is not None else False,
                was_connected=was_connected,
                errmsg=errmsg,
                user_id=server.user_id,
                username=server.username,
                shared=server.shared,
                is_kerberos_conn=bool(server.kerberos_conn),
                gss_authenticated=manager.gss_authenticated,
                cloud_status=server.cloud_status,
                description=server.comment
            )

    @property
    def jssnippets(self):
        return []

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [render_template("css/servers.css")]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        for st in ServerType.types():
            snippets.extend(st.csssnippets)

        return snippets

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        driver = get_driver(PG_DEFAULT_DRIVER, app)
        app.jinja_env.filters['qtLiteral'] = driver.qtLiteral
        app.jinja_env.filters['qtIdent'] = driver.qtIdent
        app.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent
        app.jinja_env.filters['hasAny'] = has_any

        from .ppas import PPAS

        from .databases import blueprint as module
        self.submodules.append(module)

        from .pgagent import blueprint as module
        self.submodules.append(module)

        from .resource_groups import blueprint as module
        self.submodules.append(module)

        from .roles import blueprint as module
        self.submodules.append(module)

        from .tablespaces import blueprint as module
        self.submodules.append(module)

        super().register(app, options)

    # We do not have any preferences for server node.
    def register_preferences(self):
        """
        register_preferences
        Override it so that - it does not register the show_node preference for
        server type.
        """
        ServerType.register_preferences()

    def get_exposed_url_endpoints(self):
        return ['NODE-server.connect_id']

    @staticmethod
    def create_shared_server(data, gid):
        """
        Create shared server
        :param data:
        :param gid:
        :return: None
        """

        shared_server = None
        try:
            db.session.rollback()
            user = User.query.filter_by(id=data.user_id).first()
            shared_server = SharedServer(
                osid=data.id,
                user_id=current_user.id,
                server_owner=user.username,
                servergroup_id=gid,
                name=data.name,
                host=data.host,
                port=data.port,
                maintenance_db=data.maintenance_db,
                username=None,
                save_password=0,
                comment=None,
                role=data.role,
                bgcolor=data.bgcolor if data.bgcolor else None,
                fgcolor=data.fgcolor if data.fgcolor else None,
                service=data.service if data.service else None,
                use_ssh_tunnel=data.use_ssh_tunnel,
                tunnel_host=data.tunnel_host,
                tunnel_port=22,
                tunnel_username=None,
                tunnel_authentication=0,
                tunnel_identity_file=None,
                shared=True,
                connection_params=data.connection_params
            )
            db.session.add(shared_server)
            db.session.commit()
        except Exception as e:
            if shared_server:
                db.session.delete(shared_server)
                db.session.commit()

            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def get_shared_server(server, gid):
        """
        return the shared server
        :param server:
        :param gid:
        :return: shared_server
        """
        shared_server = SharedServer.query.filter_by(
            name=server.name, user_id=current_user.id,
            servergroup_id=gid, osid=server.id).first()

        if shared_server is None:
            ServerModule.create_shared_server(server, gid)

            shared_server = SharedServer.query.filter_by(
                name=server.name, user_id=current_user.id,
                servergroup_id=gid, osid=server.id).first()

        return shared_server


class ServerMenuItem(MenuItem):
    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerModule.node_type)
        super().__init__(**kwargs)


blueprint = ServerModule(__name__)


class ServerNode(PGChildNodeView):
    node_type = ServerModule._NODE_TYPE
    node_label = "Server"

    parent_ids = [{'type': 'int', 'id': 'gid'}]
    ids = [{'type': 'int', 'id': 'sid'}]
    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'modified_sql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'children': [{'get': 'children'}],
        'supported_servers.js': [{}, {}, {'get': 'supported_servers'}],
        'reload':
            [{'get': 'reload_configuration'}],
        'restore_point':
            [{'post': 'create_restore_point'}],
        'connect': [{
            'get': 'connect_status', 'post': 'connect', 'delete': 'disconnect'
        }],
        'change_password': [{'post': 'change_password'}],
        'wal_replay': [{
            'delete': 'pause_wal_replay', 'put': 'resume_wal_replay'
        }],
        'check_pgpass': [{'get': 'check_pgpass'}],
        'clear_saved_password': [{'put': 'clear_saved_password'}],
        'clear_sshtunnel_password': [{'put': 'clear_sshtunnel_password'}]
    })
    SSL_MODES = ['prefer', 'require', 'verify-ca', 'verify-full']

    def check_ssl_fields(self, data):
        """
        This function will allow us to check and set defaults for
        SSL fields

        Args:
            data: Response data

        Returns:
            Flag and Data
        """
        flag = False

        if 'sslmode' in data and data['sslmode'] in self.SSL_MODES:
            flag = True
            ssl_fields = [
                'sslcert', 'sslkey', 'sslrootcert', 'sslcrl', 'sslcompression'
            ]
            # Required SSL fields for SERVER mode from user
            required_ssl_fields_server_mode = ['sslcert', 'sslkey']

            for field in ssl_fields:
                if field in data:
                    continue
                elif config.SERVER_MODE and \
                        field in required_ssl_fields_server_mode:
                    # In Server mode,
                    # we will set dummy SSL certificate file path which will
                    # prevent using default SSL certificates from web servers

                    # Set file manager directory from preference
                    import os
                    file_extn = '.key' if field.endswith('key') else '.crt'
                    dummy_ssl_file = os.path.join(
                        '<STORAGE_DIR>', '.postgresql',
                        'postgresql' + file_extn
                    )
                    data[field] = dummy_ssl_file
                    # For Desktop mode, we will allow to default

        return flag, data

    def convert_connection_parameter(self, params):
        """
        This function is used to convert the connection parameter based
        on the instance type.
        """
        conn_params = None
        # if params is of type list then it is coming from the frontend,
        # and we have to convert it into the dict and store it into the
        # database
        if isinstance(params, list):
            conn_params = {}
            for item in params:
                conn_params[item['name']] = item['value']
        # if params is of type dict then it is coming from the database,
        # and we have to convert it into the list of params to show on GUI.
        elif isinstance(params, dict):
            conn_params = []
            for key, value in params.items():
                if value is not None:
                    conn_params.append(
                        {'name': key, 'keyword': key, 'value': value})

        return conn_params

    def update_connection_parameter(self, data, server):
        """
        This function is used to update the connection parameters.
        """
        if 'connection_params' in data and \
                hasattr(server, 'connection_params'):
            existing_conn_params = getattr(server, 'connection_params')
            new_conn_params = data['connection_params']
            if 'deleted' in new_conn_params:
                for item in new_conn_params['deleted']:
                    del existing_conn_params[item['name']]
            if 'added' in new_conn_params:
                for item in new_conn_params['added']:
                    existing_conn_params[item['name']] = item['value']
            if 'changed' in new_conn_params:
                for item in new_conn_params['changed']:
                    existing_conn_params[item['name']] = item['value']

            data['connection_params'] = existing_conn_params

    @login_required
    def nodes(self, gid):
        res = []
        """
        Return a JSON document listing the servers under this server group
        for the user.
        """
        servers = Server.query.filter(
            or_(Server.user_id == current_user.id,
                Server.shared),
            Server.servergroup_id == gid)

        driver = get_driver(PG_DEFAULT_DRIVER)

        for server in servers:
            if server.shared and server.user_id != current_user.id:
                shared_server = ServerModule.get_shared_server(server, gid)
                server = \
                    ServerModule.get_shared_server_properties(server,
                                                              shared_server)
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()
            errmsg = None
            in_recovery = None
            wal_paused = None
            server_type = 'pg'
            if connected:
                server_type = manager.server_type
                status, result, in_recovery, wal_paused =\
                    recovery_state(conn, manager.version)
                if not status:
                    connected = False
                    manager.release()
                    errmsg = "{0} : {1}".format(server.name, result)

            res.append(
                self.blueprint.generate_browser_node(
                    "%d" % (server.id),
                    gid,
                    server.name,
                    server_icon_and_background(connected, manager, server),
                    True,
                    self.node_type,
                    connected=connected,
                    server_type=server_type,
                    version=manager.version,
                    db=manager.db,
                    host=server.host,
                    user=manager.user_info if connected else None,
                    in_recovery=in_recovery,
                    wal_pause=wal_paused,
                    is_password_saved=bool(server.save_password),
                    is_tunnel_password_saved=True
                    if server.tunnel_password is not None else False,
                    errmsg=errmsg,
                    username=server.username,
                    shared=server.shared,
                    is_kerberos_conn=bool(server.kerberos_conn),
                    gss_authenticated=manager.gss_authenticated,
                    description=server.comment
                )
            )

        if not len(res):
            return gone(errormsg=gettext(
                'The specified server group with id# {0} could not be found.'
            ))

        return make_json_response(result=res)

    @login_required
    def node(self, gid, sid):
        """Return a JSON document listing the server groups for the user"""
        server = Server.query.filter_by(id=sid).first()

        if server.shared and server.user_id != current_user.id:
            shared_server = ServerModule.get_shared_server(server, gid)
            server = ServerModule.get_shared_server_properties(server,
                                                               shared_server)

        if server is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    gettext(
                        "Could not find the server with id# {0}."
                    ).format(sid)
                )
            )

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(server.id)
        conn = manager.connection()
        connected = conn.connected()
        errmsg = None
        in_recovery = None
        wal_paused = None
        if connected:
            status, result, in_recovery, wal_paused =\
                recovery_state(conn, manager.version)
            if not status:
                connected = False
                manager.release()
                errmsg = "{0} : {1}".format(server.name, result)

        return make_json_response(
            result=self.blueprint.generate_browser_node(
                "%d" % (server.id),
                gid,
                server.name,
                server_icon_and_background(connected, manager, server),
                True,
                self.node_type,
                connected=connected,
                server_type=manager.server_type if connected else 'pg',
                version=manager.version,
                db=manager.db,
                user=manager.user_info if connected else None,
                in_recovery=in_recovery,
                wal_pause=wal_paused,
                host=server.host,
                is_password_saved=bool(server.save_password),
                is_tunnel_password_saved=True
                if server.tunnel_password is not None else False,
                errmsg=errmsg,
                shared=server.shared,
                username=server.username,
                is_kerberos_conn=bool(server.kerberos_conn),
                gss_authenticated=manager.gss_authenticated
            ),
        )

    def delete_shared_server(self, server_name, gid, osid):
        """
        Delete the shared server
        :param server_name:
        :return:
        """
        try:
            shared_server = SharedServer.query.filter_by(name=server_name,
                                                         servergroup_id=gid,
                                                         osid=osid)
            for s in shared_server:
                get_driver(PG_DEFAULT_DRIVER).delete_manager(s.id)
                db.session.delete(s)
            db.session.commit()

        except Exception as e:
            current_app.logger.exception(e)
            return make_json_response(
                success=0,
                errormsg=e.message)

    @login_required
    def delete(self, gid, sid):
        """Delete a server node in the settings database."""
        servers = Server.query.filter_by(user_id=current_user.id, id=sid)
        server_name = None

        # TODO:: A server, which is connected, cannot be deleted
        if servers is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    'The specified server could not be found.\n'
                    'Does the user have permission to access the '
                    'server?'
                )
            )
        else:
            try:
                for s in servers:
                    server_name = s.name
                    get_driver(PG_DEFAULT_DRIVER).delete_manager(s.id)
                    db.session.delete(s)
                db.session.commit()
                self.delete_shared_server(server_name, gid, sid)
                QueryHistory.clear_history(current_user.id, sid)

            except Exception as e:
                current_app.logger.exception(e)
                return make_json_response(
                    success=0,
                    errormsg=e.message)

        return make_json_response(success=1,
                                  info=gettext("Server deleted"))

    @login_required
    def update(self, gid, sid):
        """Update the server settings"""
        server = Server.query.filter_by(id=sid).first()
        sharedserver = None

        if server is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext("Could not find the required server.")
            )

        if config.SERVER_MODE and server.shared and \
                server.user_id != current_user.id:
            sharedserver = ServerModule.get_shared_server(server, gid)

        # Not all parameters can be modified, while the server is connected
        config_param_map = {
            'name': 'name',
            'host': 'host',
            'port': 'port',
            'db': 'maintenance_db',
            'username': 'username',
            'gid': 'servergroup_id',
            'comment': 'comment',
            'role': 'role',
            'db_res': 'db_res',
            'passexec_cmd': 'passexec_cmd',
            'passexec_expiration': 'passexec_expiration',
            'bgcolor': 'bgcolor',
            'fgcolor': 'fgcolor',
            'service': 'service',
            'use_ssh_tunnel': 'use_ssh_tunnel',
            'tunnel_host': 'tunnel_host',
            'tunnel_port': 'tunnel_port',
            'tunnel_username': 'tunnel_username',
            'tunnel_authentication': 'tunnel_authentication',
            'tunnel_identity_file': 'tunnel_identity_file',
            'shared': 'shared',
            'kerberos_conn': 'kerberos_conn',
            'connection_params': 'connection_params'
        }

        disp_lbl = {
            'name': gettext('name'),
            'port': gettext('Port'),
            'db': gettext('Maintenance database'),
            'username': gettext('Username'),
            'comment': gettext('Comments'),
            'role': gettext('Role')
        }

        idx = 0
        data = request.form if request.form else json.loads(
            request.data
        )
        if 'db_res' in data:
            data['db_res'] = ','.join(data['db_res'])

        # Update connection parameter if any.
        self.update_connection_parameter(data, server)

        if 'connection_params' in data and \
            'hostaddr' in data['connection_params'] and \
                not is_valid_ipaddress(data['connection_params']['hostaddr']):
            return make_json_response(
                success=0,
                status=400,
                errormsg=gettext('Not a valid Host address')
            )

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        connected = conn.connected()

        self._server_modify_disallowed_when_connected(
            connected, data, disp_lbl)

        idx = self._set_valid_attr_value(gid, data, config_param_map, server,
                                         sharedserver)

        if idx == 0:
            return make_json_response(
                success=0,
                errormsg=gettext('No parameters were changed.')
            )

        try:
            db.session.commit()
        except Exception as e:
            current_app.logger.exception(e)
            return make_json_response(
                success=0,
                errormsg=e.message
            )

        # When server is connected, we don't require to update the connection
        # manager. Because - we don't allow to change any of the parameters,
        # which will affect the connections.
        if not conn.connected():
            manager.update(server)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                "%d" % (server.id), server.servergroup_id,
                server.name,
                server_icon_and_background(
                    connected, manager, sharedserver)
                if server.shared and server.user_id != current_user.id
                else server_icon_and_background(
                    connected, manager, server),
                True,
                self.node_type,
                connected=connected,
                shared=server.shared,
                user_id=server.user_id,
                user=manager.user_info if connected else None,
                server_type='pg',  # default server type
                username=server.username,
                role=server.role,
                is_password_saved=bool(server.save_password),
                description=server.comment
            )
        )

    @staticmethod
    def _update_server_details(server, sharedserver,
                               config_param_map, arg, value):
        if value == '':
            value = None

        if server.shared and server.user_id != current_user.id:
            setattr(sharedserver, config_param_map[arg], value)
        else:
            setattr(server, config_param_map[arg], value)

    def _set_valid_attr_value(self, gid, data, config_param_map, server,
                              sharedserver):

        idx = 0
        for arg in config_param_map:
            if arg in data:
                value = data[arg]
                # sqlite3 do not have boolean type so we need to convert
                # it manually to integer
                if 'shared' in data and not data['shared']:
                    # Delete the shared server from DB if server
                    # owner uncheck shared property
                    self.delete_shared_server(server.name, gid, server.id)
                if arg in ('sslcompression', 'use_ssh_tunnel',
                           'tunnel_authentication', 'kerberos_conn', 'shared'):
                    value = 1 if value else 0
                self._update_server_details(server, sharedserver,
                                            config_param_map, arg, value)
                idx += 1

        return idx

    def _server_modify_disallowed_when_connected(
            self, connected, data, disp_lbl):

        if connected:
            for arg in (
                    'db', 'role', 'service'
            ):
                if arg in data:
                    return forbidden(
                        errmsg=gettext(
                            "'{0}' is not allowed to modify, "
                            "when server is connected."
                        ).format(disp_lbl[arg])
                    )

    @login_required
    def list(self, gid):
        """
        Return list of attributes of all servers.
        """
        servers = Server.query.filter(
            or_(Server.user_id == current_user.id,
                Server.shared),
            Server.servergroup_id == gid).order_by(Server.name)
        sg = ServerGroup.query.filter_by(
            id=gid
        ).first()
        res = []

        driver = get_driver(PG_DEFAULT_DRIVER)

        for server in servers:
            if server.shared and server.user_id != current_user.id:
                shared_server = ServerModule.get_shared_server(server, gid)
                server = \
                    ServerModule.get_shared_server_properties(server,
                                                              shared_server)
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()

            res.append({
                'id': server.id,
                'name': server.name,
                'host': server.host,
                'port': server.port,
                'db': server.maintenance_db,
                'username': server.username,
                'gid': server.servergroup_id,
                'group-name': sg.name,
                'comment': server.comment,
                'role': server.role,
                'connected': connected,
                'version': manager.ver,
                'server_type': manager.server_type if connected else 'pg',
                'db_res': server.db_res.split(',') if server.db_res else None
            })

        return ajax_response(
            response=res
        )

    @login_required
    def properties(self, gid, sid):
        """Return list of attributes of a server"""

        server = Server.query.filter_by(
            id=sid).first()

        if server is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=self.not_found_error_msg()
            )
        server_owner = None
        sg = ServerGroup.query.filter_by(
            id=server.servergroup_id
        ).first()

        driver = get_driver(PG_DEFAULT_DRIVER)

        manager = driver.connection_manager(sid)
        conn = manager.connection()
        connected = conn.connected()

        if server.shared and server.user_id != current_user.id:
            shared_server = ServerModule.get_shared_server(server, gid)
            server = ServerModule.get_shared_server_properties(server,
                                                               shared_server)
            server_owner = server.server_owner

        use_ssh_tunnel = 0
        tunnel_host = None
        tunnel_port = 22
        tunnel_username = None
        tunnel_authentication = 0
        connection_params = \
            self.convert_connection_parameter(server.connection_params)

        if server.use_ssh_tunnel:
            use_ssh_tunnel = server.use_ssh_tunnel
            tunnel_host = server.tunnel_host
            tunnel_port = server.tunnel_port
            tunnel_username = server.tunnel_username
            tunnel_authentication = server.tunnel_authentication

        response = {
            'id': server.id,
            'name': server.name,
            'server_owner': server_owner,
            'user_id': server.user_id,
            'host': server.host,
            'port': server.port,
            'db': server.maintenance_db,
            'shared': server.shared if config.SERVER_MODE else None,
            'username': server.username,
            'gid': str(server.servergroup_id),
            'group-name': sg.name if (sg and sg.name) else gettext('Servers'),
            'comment': server.comment,
            'role': server.role,
            'connected': connected,
            'version': manager.ver,
            'server_type': manager.server_type if connected else 'pg',
            'bgcolor': server.bgcolor,
            'fgcolor': server.fgcolor,
            'db_res': server.db_res.split(',') if server.db_res else None,
            'passexec_cmd':
                server.passexec_cmd if server.passexec_cmd else None,
            'passexec_expiration':
                server.passexec_expiration if server.passexec_expiration
                else None,
            'service': server.service if server.service else None,
            'use_ssh_tunnel': use_ssh_tunnel,
            'tunnel_host': tunnel_host,
            'tunnel_port': tunnel_port,
            'tunnel_username': tunnel_username,
            'tunnel_identity_file': server.tunnel_identity_file
            if server.tunnel_identity_file else None,
            'tunnel_authentication': tunnel_authentication,
            'kerberos_conn': bool(server.kerberos_conn),
            'gss_authenticated': manager.gss_authenticated,
            'gss_encrypted': manager.gss_encrypted,
            'cloud_status': server.cloud_status,
            'connection_params': connection_params,
            'connection_string': manager.display_connection_string
        }

        return ajax_response(response)

    @login_required
    def create(self, gid):
        """Add a server node to the settings database"""
        required_args = ['name', 'db']

        data = request.form if request.form else json.loads(
            request.data
        )

        # Loop through data and if found any value is blank string then
        # convert it to None as after porting into React, from frontend
        # '' blank string is coming as a value instead of null.
        for item in data:
            if data[item] == '':
                data[item] = None

        # Get enc key
        crypt_key_present, crypt_key = get_crypt_key()
        if not crypt_key_present:
            raise CryptKeyMissing

        # Some fields can be provided with service file so they are optional
        if 'service' in data and not data['service']:
            required_args.extend([
                'host',
                'port',
                'username',
                'role'
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

        connection_params = self.convert_connection_parameter(
            data.get('connection_params', []))

        if 'hostaddr' in connection_params and \
                not is_valid_ipaddress(connection_params['hostaddr']):
            return make_json_response(
                success=0,
                status=400,
                errormsg=gettext('Not a valid Host address')
            )

        # To check ssl configuration
        is_ssl, connection_params = self.check_ssl_fields(connection_params)
        # set the connection params again in the data
        if 'connection_params' in data:
            data['connection_params'] = connection_params

        server = None

        try:
            server = Server(
                user_id=current_user.id,
                servergroup_id=data.get('gid', gid),
                name=data.get('name'),
                host=data.get('host', None),
                port=data.get('port'),
                maintenance_db=data.get('db', None),
                username=data.get('username'),
                save_password=1 if data.get('save_password', False) and
                config.ALLOW_SAVE_PASSWORD else 0,
                comment=data.get('comment', None),
                role=data.get('role', None),
                db_res=','.join(data['db_res'])
                if 'db_res' in data else None,
                bgcolor=data.get('bgcolor', None),
                fgcolor=data.get('fgcolor', None),
                service=data.get('service', None),
                use_ssh_tunnel=1 if data.get('use_ssh_tunnel', False) else 0,
                tunnel_host=data.get('tunnel_host', None),
                tunnel_port=data.get('tunnel_port', 22),
                tunnel_username=data.get('tunnel_username', None),
                tunnel_authentication=1 if data.get('tunnel_authentication',
                                                    False) else 0,
                tunnel_identity_file=data.get('tunnel_identity_file', None),
                shared=data.get('shared', None),
                passexec_cmd=data.get('passexec_cmd', None),
                passexec_expiration=data.get('passexec_expiration', None),
                kerberos_conn=1 if data.get('kerberos_conn', False) else 0,
                connection_params=connection_params
            )
            db.session.add(server)
            db.session.commit()
            connected = False
            user = None
            manager = None

            if 'connect_now' in data and data['connect_now']:
                manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
                    server.id)
                manager.update(server)
                conn = manager.connection()

                have_password = False
                have_tunnel_password = False
                password = None
                passfile = None
                tunnel_password = ''
                if 'password' in data and data["password"] != '' and \
                        data["password"] is not None:
                    # login with password
                    have_password = True
                    password = data['password']
                    password = encrypt(password, crypt_key)
                elif 'passfile' in data['connection_params'] and \
                        data['connection_params']['passfile'] != '':
                    passfile = data['connection_params']['passfile']

                if 'tunnel_password' in data and data["tunnel_password"] != '':
                    have_tunnel_password = True
                    tunnel_password = data['tunnel_password']
                    tunnel_password = \
                        encrypt(tunnel_password, crypt_key)

                status, errmsg = conn.connect(
                    password=password,
                    passfile=passfile,
                    tunnel_password=tunnel_password,
                    server_types=ServerType.types()
                )
                if not status:
                    db.session.delete(server)
                    db.session.commit()
                    return make_json_response(
                        status=401,
                        success=0,
                        errormsg=gettext(
                            "Unable to connect to server:\n\n{}"
                        ).format(errmsg)
                    )
                else:
                    if 'save_password' in data and data['save_password'] and \
                            have_password and config.ALLOW_SAVE_PASSWORD:
                        setattr(server, 'password', password)
                        db.session.commit()

                    if 'save_tunnel_password' in data and \
                        data['save_tunnel_password'] and \
                        have_tunnel_password and \
                            config.ALLOW_SAVE_TUNNEL_PASSWORD:
                        setattr(server, 'tunnel_password', tunnel_password)
                        db.session.commit()

                    user = manager.user_info
                    connected = True

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    "%d" % server.id, server.servergroup_id,
                    server.name,
                    server_icon_and_background(connected, manager, server),
                    True,
                    self.node_type,
                    username=server.username,
                    user=user,
                    connected=connected,
                    shared=server.shared,
                    server_type=manager.server_type
                    if manager and manager.server_type
                    else 'pg',
                    version=manager.version
                    if manager and manager.version
                    else None,
                    is_kerberos_conn=bool(server.kerberos_conn),
                    gss_authenticated=manager.gss_authenticated if
                    manager and manager.gss_authenticated else False
                )
            )

        except Exception as e:
            if server:
                db.session.delete(server)
                db.session.commit()

            current_app.logger.exception(e)
            return make_json_response(
                status=410,
                success=0,
                errormsg=str(e)
            )

    @login_required
    def sql(self, gid, sid):
        return make_json_response(data='')

    @login_required
    def modified_sql(self, gid, sid):
        return make_json_response(data='')

    @login_required
    def statistics(self, gid, sid):
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()

        if conn.connected():
            status, res = conn.execute_dict(
                render_template(
                    "/servers/sql/#{0}#/stats.sql".format(manager.version),
                    conn=conn, _=gettext
                )
            )

            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(data=res)

        return make_json_response(
            info=gettext(
                "Server has no active connection for generating statistics."
            )
        )

    @login_required
    def dependencies(self, gid, sid):
        return make_json_response(data='')

    @login_required
    def dependents(self, gid, sid):
        return make_json_response(data='')

    def supported_servers(self, **kwargs):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """

        return make_response(
            render_template(
                "servers/supported_servers.js",
                server_types=ServerType.types()
            ),
            200, {'Content-Type': MIMETYPE_APP_JS}
        )

    def connect_status(self, gid, sid):
        """Check and return the connection status."""
        server = Server.query.filter_by(id=sid).first()
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        connected = conn.connected()
        in_recovery = None
        wal_paused = None
        errmsg = None
        if connected:
            status, result, in_recovery, wal_paused =\
                recovery_state(conn, manager.version)

            if not status:
                connected = False
                manager.release()
                errmsg = "{0} : {1}".format(server.name, result)

        return make_json_response(
            data={
                'icon': server_icon_and_background(connected, manager, server),
                'connected': connected,
                'in_recovery': in_recovery,
                'wal_pause': wal_paused,
                'server_type': manager.server_type if connected else "pg",
                'user': manager.user_info if connected else None,
                'errmsg': errmsg
            }
        )

    def connect(self, gid, sid):
        """
        Connect the Server and return the connection object.
        Verification Process before Connection:
            Verify requested server.

            Check the server password is already been stored in the
            database or not.
            If Yes, connect the server and return connection.
            If No, Raise HTTP error and ask for the password.

            In case of 'Save Password' request from user, excrypted Pasword
            will be stored in the respected server database and
            establish the connection OR just connect the server and do not
            store the password.
        """
        current_app.logger.info(
            'Connection Request for server#{0}'.format(sid)
        )

        # Fetch Server Details
        server = Server.query.filter_by(id=sid).first()
        shared_server = None
        if server.shared and server.user_id != current_user.id:
            shared_server = ServerModule.get_shared_server(server, gid)
            server = ServerModule.get_shared_server_properties(server,
                                                               shared_server)
        if server is None:
            return bad_request(self.not_found_error_msg())

        # Return if username is blank and the server is shared
        if server.username is None and not server.service and \
                server.shared:
            return make_json_response(
                status=200,
                success=0,
                errormsg=gettext(
                    "Please enter the server details to connect")
            )
        if current_user and hasattr(current_user, 'id'):
            # Fetch User Details.
            user = User.query.filter_by(id=current_user.id).first()
            if user is None:
                return unauthorized(gettext(UNAUTH_REQ))
        else:
            return unauthorized(gettext(UNAUTH_REQ))

        data = None
        if request.form:
            data = request.form
        elif request.data:
            data = json.loads(request.data)

        if data is None:
            data = {}

        password = None
        passfile = None
        tunnel_password = None
        save_password = False
        save_tunnel_password = False
        prompt_password = False
        prompt_tunnel_password = False

        # Connect the Server
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        if not manager.connection().connected():
            manager.update(server)
        conn = manager.connection()

        # Get enc key
        crypt_key_present, crypt_key = get_crypt_key()
        if not crypt_key_present:
            raise CryptKeyMissing

        # If server using SSH Tunnel
        if server.use_ssh_tunnel:
            if 'tunnel_password' not in data:
                if server.tunnel_password is None:
                    prompt_tunnel_password = True
                else:
                    tunnel_password = server.tunnel_password
            else:
                tunnel_password = data['tunnel_password'] \
                    if 'tunnel_password' in data else ''
                save_tunnel_password = data['save_tunnel_password'] \
                    if tunnel_password and 'save_tunnel_password' in data \
                    else False
                # Encrypt the password before saving with user's login
                # password key.
                try:
                    tunnel_password = encrypt(tunnel_password, crypt_key) \
                        if tunnel_password is not None else \
                        server.tunnel_password
                except Exception as e:
                    current_app.logger.exception(e)
                    return internal_server_error(errormsg=str(e))
        if 'password' not in data and (server.kerberos_conn is False or
                                       server.kerberos_conn is None):

            passfile_param = None
            if hasattr(server, 'connection_params') and \
                    'passfile' in server.connection_params:
                passfile_param = server.connection_params['passfile']

            conn_passwd = getattr(conn, 'password', None)
            if conn_passwd is None and not server.save_password and \
                    passfile_param is None and \
                    server.passexec_cmd is None and \
                    server.service is None:
                prompt_password = True
            elif passfile_param and passfile_param != '':
                passfile = passfile_param
            else:
                password = conn_passwd or server.password
        else:
            password = data['password'] if 'password' in data else None
            save_password = data['save_password']\
                if 'save_password' in data else False

            # Encrypt the password before saving with user's login
            # password key.
            try:
                password = encrypt(password, crypt_key) \
                    if password is not None else server.password
            except Exception as e:
                current_app.logger.exception(e)
                return internal_server_error(errormsg=str(e))

        # Check do we need to prompt for the database server or ssh tunnel
        # password or both. Return the password template in case password is
        # not provided, or password has not been saved earlier.
        if prompt_password or prompt_tunnel_password:
            return self.get_response_for_password(
                server, 428, prompt_password, prompt_tunnel_password
            )

        status = True
        try:
            status, errmsg = conn.connect(
                password=password,
                passfile=passfile,
                tunnel_password=tunnel_password,
                server_types=ServerType.types()
            )
        except Exception as e:
            current_app.logger.exception(e)
            return self.get_response_for_password(
                server, 401, True, True, getattr(e, 'message', str(e)))

        if not status:

            current_app.logger.error(
                "Could not connect to server(#{0}) - '{1}'.\nError: {2}"
                .format(server.id, server.name, errmsg)
            )
            if errmsg.find('Ticket expired') != -1:
                return internal_server_error(errmsg)

            return self.get_response_for_password(
                server, 401, True, True, errmsg
            )
        else:
            if save_password and config.ALLOW_SAVE_PASSWORD:
                try:
                    # If DB server is running in trust mode then password may
                    # not be available but we don't need to ask password
                    # every time user try to connect
                    # 1 is True in SQLite as no boolean type
                    setattr(server, 'save_password', 1)
                    if server.shared and server.user_id != current_user.id:
                        setattr(shared_server, 'save_password', 1)
                    else:
                        setattr(server, 'save_password', 1)

                    # Save the encrypted password using the user's login
                    # password key, if there is any password to save
                    if password:
                        if server.shared and server.user_id != current_user.id:
                            setattr(shared_server, 'password', password)
                        else:
                            setattr(server, 'password', password)
                    db.session.commit()
                except Exception as e:
                    # Release Connection
                    current_app.logger.exception(e)
                    manager.release(database=server.maintenance_db)
                    conn = None

                    return internal_server_error(errormsg=e.message)

            if save_tunnel_password and config.ALLOW_SAVE_TUNNEL_PASSWORD:
                try:
                    # Save the encrypted tunnel password.
                    setattr(server, 'tunnel_password', tunnel_password)
                    db.session.commit()
                except Exception as e:
                    # Release Connection
                    current_app.logger.exception(e)
                    manager.release(database=server.maintenance_db)
                    conn = None

                    return internal_server_error(errormsg=e.message)

            current_app.logger.info('Connection Established for server: \
                %s - %s' % (server.id, server.name))
            # Update the recovery and wal pause option for the server
            # if connected successfully
            _, _, in_recovery, wal_paused =\
                recovery_state(conn, manager.version)

            return make_json_response(
                success=1,
                info=gettext("Server connected."),
                data={
                    'icon': server_icon_and_background(True, manager, server),
                    'connected': True,
                    'server_type': manager.server_type,
                    'type': manager.server_type,
                    'version': manager.version,
                    'db': manager.db,
                    'user': manager.user_info,
                    'in_recovery': in_recovery,
                    'wal_pause': wal_paused,
                    'is_password_saved': bool(server.save_password),
                    'is_tunnel_password_saved': True
                    if server.tunnel_password is not None else False,
                    'is_kerberos_conn': bool(server.kerberos_conn),
                    'gss_authenticated': manager.gss_authenticated
                }
            )

    def disconnect(self, gid, sid):
        """Disconnect the Server."""

        server = Server.query.filter_by(id=sid).first()
        if server is None:
            return bad_request(self.not_found_error_msg())

        # Release Connection
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        # Check if any psql terminal is running for the current disconnecting
        # server. If any terminate the psql tool connection.
        if 'sid_soid_mapping' in current_app.config and str(sid) in \
                current_app.config['sid_soid_mapping'] and \
                str(sid) in current_app.config['sid_soid_mapping']:
            for i in current_app.config['sid_soid_mapping'][str(sid)]:
                sio.emit('disconnect-psql', namespace='/pty', to=i)

        status = manager.release()

        if not status:
            return unauthorized(gettext("Server could not be disconnected."))
        else:
            return make_json_response(
                success=1,
                info=gettext("Server disconnected."),
                data={
                    'icon': server_icon_and_background(False, manager, server),
                    'connected': False
                }
            )

    def reload_configuration(self, gid, sid):
        """Reload the server configuration"""

        # Reload the server configurations
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()

        if conn.connected():
            # Execute the command for reload configuration for the server
            status, rid = conn.execute_scalar("SELECT pg_reload_conf();")

            if not status:
                return internal_server_error(
                    gettext("Could not reload the server configuration.")
                )
            else:
                return make_json_response(data={
                    'status': True,
                    'result': gettext('Server configuration reloaded.')
                })

        else:
            return make_json_response(data={
                'status': False,
                'result': SERVER_CONNECTION_CLOSED})

    def create_restore_point(self, gid, sid):
        """
        This method will creates named restore point

        Args:
            gid: Server group ID
            sid: Server ID

        Returns:
            None
        """
        try:
            data = request.form
            restore_point_name = data['value'] if data else None
            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
            conn = manager.connection()

            # Execute SQL to create named restore point
            if conn.connected():
                if restore_point_name:
                    status, res = conn.execute_scalar(
                        "SELECT pg_create_restore_point('{0}');".format(
                            restore_point_name
                        )
                    )
                if not status:
                    return internal_server_error(
                        errormsg=str(res)
                    )

                return make_json_response(
                    data={
                        'status': 1,
                        'result': gettext(
                            'Named restore point created: {0}').format(
                                restore_point_name)
                    })

        except Exception as e:
            current_app.logger.error(gettext(
                'Named restore point creation failed ({0})').format(
                    str(e))
            )
            return internal_server_error(errormsg=str(e))

    def change_password(self, gid, sid):
        """
        This function is used to change the password of the
        Database Server.

        Args:
            gid: Group id
            sid: Server id
        """
        try:
            data = None
            if request.form:
                data = request.form
            elif request.data:
                data = json.loads(request.data)

            crypt_key = get_crypt_key()[1]

            # Fetch Server Details
            server = Server.query.filter_by(id=sid).first()
            if server is None:
                return bad_request(self.not_found_error_msg())

            # Fetch User Details.
            user = User.query.filter_by(id=current_user.id).first()
            if user is None:
                return unauthorized(gettext(UNAUTH_REQ))

            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
            conn = manager.connection()
            is_passfile = False

            # If there is no password found for the server
            # then check for pgpass file
            if not server.password and not manager.password and \
                hasattr(server, 'connection_params') and \
                'passfile' in server.connection_params and \
                manager.get_connection_param_value('passfile') and \
                server.connection_params['passfile'] == \
                    manager.get_connection_param_value('passfile'):
                is_passfile = True

            # Check for password only if there is no pgpass file used
            if not is_passfile and data and \
                    ('password' not in data or data['password'] == ''):
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter(s)."
                    )
                )

            if data and ('newPassword' not in data or
                         data['newPassword'] == '' or
                         'confirmPassword' not in data or
                         data['confirmPassword'] == ''):
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter(s)."
                    )
                )

            if data['newPassword'] != data['confirmPassword']:
                return make_json_response(
                    status=200,
                    success=0,
                    errormsg=gettext(
                        "Passwords do not match."
                    )
                )

            # Check against old password only if no pgpass file
            if not is_passfile:
                decrypted_password = decrypt(manager.password, crypt_key)

                if isinstance(decrypted_password, bytes):
                    decrypted_password = decrypted_password.decode()

                password = data['password']

                # Validate old password before setting new.
                if password != decrypted_password:
                    return unauthorized(gettext("Incorrect password."))

            # Hash new password before saving it.
            if manager.sversion >= 100000:
                password = conn.pq_encrypt_password_conn(data['newPassword'],
                                                         manager.user)
                if password is None:
                    # Unable to encrypt the password so used the
                    # old method of encryption
                    password = pqencryptpassword(data['newPassword'],
                                                 manager.user)
            else:
                password = pqencryptpassword(data['newPassword'], manager.user)

            SQL = render_template(
                "/servers/sql/#{0}#/change_password.sql".format(
                    manager.version),
                conn=conn, _=gettext,
                user=manager.user, encrypted_password=password)

            status, res = conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            # Store password in sqlite only if no pgpass file
            if not is_passfile:
                password = encrypt(data['newPassword'], crypt_key)
                # Check if old password was stored in pgadmin4 sqlite database.
                # If yes then update that password.
                if server.password is not None and config.ALLOW_SAVE_PASSWORD:
                    setattr(server, 'password', password)
                    db.session.commit()
                # Also update password in connection manager.
                manager.password = password
                manager.update_session()

            return make_json_response(
                status=200,
                success=1,
                info=gettext(
                    "Password changed successfully."
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def wal_replay(self, sid, pause=True):
        """
        Utility function for wal_replay for resume/pause.
        """
        server = Server.query.filter_by(
            user_id=current_user.id, id=sid
        ).first()

        if server is None:
            return make_json_response(
                success=0,
                errormsg=self.not_found_error_msg()
            )

        try:
            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
            conn = manager.connection()

            # Execute SQL to pause or resume WAL replay
            if conn.connected():
                if pause:
                    sql = "SELECT pg_xlog_replay_pause();"
                    if manager.version >= 100000:
                        sql = "SELECT pg_wal_replay_pause();"

                    status, res = conn.execute_scalar(sql)
                    if not status:
                        return internal_server_error(
                            errormsg=str(res)
                        )
                else:
                    sql = "SELECT pg_xlog_replay_resume();"
                    if manager.version >= 100000:
                        sql = "SELECT pg_wal_replay_resume();"

                    status, res = conn.execute_scalar(sql)
                    if not status:
                        return internal_server_error(
                            errormsg=str(res)
                        )
                return make_json_response(
                    success=1,
                    info=gettext('WAL replay paused'),
                    data={'in_recovery': True, 'wal_pause': pause}
                )
            return gone(errormsg=gettext('Please connect the server.'))
        except Exception as e:
            current_app.logger.error(
                'WAL replay pause/resume failed'
            )
            return internal_server_error(errormsg=str(e))

    def resume_wal_replay(self, gid, sid):
        """
        This method will resume WAL replay

        Args:
            gid: Server group ID
            sid: Server ID

        Returns:
            None
        """
        return self.wal_replay(sid, False)

    def pause_wal_replay(self, gid, sid):
        """
        This method will pause WAL replay

        Args:
            gid: Server group ID
            sid: Server ID

        Returns:
            None
        """
        return self.wal_replay(sid, True)

    def check_pgpass(self, gid, sid):
        """
        This function is used to check whether server is connected
        using pgpass file or not

        Args:
            gid: Group id
            sid: Server id
        """
        is_pgpass = False
        server = Server.query.filter_by(
            user_id=current_user.id, id=sid
        ).first()

        if server is None:
            return make_json_response(
                success=0,
                errormsg=self.not_found_error_msg()
            )

        try:
            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
            conn = manager.connection()
            if not conn.connected():
                return gone(
                    errormsg=gettext('Please connect the server.')
                )

            if (not server.password or not manager.password) and \
                hasattr(server, 'connection_params') and \
                'passfile' in server.connection_params and \
                manager.get_connection_param_value('passfile') and \
                server.connection_params['passfile'] == \
                    manager.get_connection_param_value('passfile'):
                is_pgpass = True
            return make_json_response(
                success=1,
                data=dict({'is_pgpass': is_pgpass}),
            )
        except Exception as e:
            current_app.logger.error(
                'Cannot able to fetch pgpass status'
            )
            return internal_server_error(errormsg=str(e))

    def get_response_for_password(self, server, status, prompt_password=False,
                                  prompt_tunnel_password=False, errmsg=None):

        if server.use_ssh_tunnel:
            data = {
                "server_label": server.name,
                "username": server.username,
                "tunnel_username": server.tunnel_username,
                "tunnel_host": server.tunnel_host,
                "tunnel_identity_file": server.tunnel_identity_file,
                "errmsg": errmsg,
                "service": server.service,
                "prompt_tunnel_password": prompt_tunnel_password,
                "prompt_password": prompt_password,
                "allow_save_password":
                    True if config.ALLOW_SAVE_PASSWORD and
                    session['allow_save_password'] else False,
                "allow_save_tunnel_password":
                    True if config.ALLOW_SAVE_TUNNEL_PASSWORD and
                    session['allow_save_password'] else False
            }
            return make_json_response(
                success=0,
                status=status,
                result=data
            )
        else:
            data = {
                "server_label": server.name,
                "username": server.username,
                "errmsg": errmsg,
                "service": server.service,
                "prompt_password": True,
                "allow_save_password":
                    True if config.ALLOW_SAVE_PASSWORD and
                    session['allow_save_password'] else False,
            }
            return make_json_response(
                success=0,
                status=status,
                result=data
            )

    def clear_saved_password(self, gid, sid):
        """
        This function is used to remove database server password stored into
        the pgAdmin's db file.

        :param gid:
        :param sid:
        :return:
        """
        try:
            server = Server.query.filter_by(id=sid).first()
            shared_server = None
            if server is None:
                return make_json_response(
                    success=0,
                    info=self.not_found_error_msg()
                )

            if server.shared and server.user_id != current_user.id:
                shared_server = SharedServer.query.filter_by(
                    name=server.name, user_id=current_user.id,
                    servergroup_id=gid, osid=server.id).first()

                if shared_server is None:
                    return make_json_response(
                        success=0,
                        info=gettext("Could not find the required server.")
                    )
                server = ServerModule. \
                    get_shared_server_properties(server, shared_server)

            if server.shared and server.user_id != current_user.id:
                setattr(shared_server, 'save_password', None)
            else:
                setattr(server, 'save_password', None)

            # If password was saved then clear the flag also
            # 0 is False in SQLite db
            if server.save_password:
                if server.shared and server.user_id != current_user.id:
                    setattr(shared_server, 'save_password', 0)
                else:
                    setattr(server, 'save_password', 0)
            db.session.commit()
        except Exception as e:
            current_app.logger.error(
                "Unable to clear saved password.\nError: {0}".format(str(e))
            )

            return internal_server_error(errormsg=str(e))

        return make_json_response(
            success=1,
            info=gettext("The saved password cleared successfully."),
            data={'is_password_saved': False}
        )

    def clear_sshtunnel_password(self, gid, sid):
        """
        This function is used to remove sshtunnel password stored into
        the pgAdmin's db file.

        :param gid:
        :param sid:
        :return:
        """
        try:
            server = Server.query.filter_by(id=sid).first()
            if server is None:
                return make_json_response(
                    success=0,
                    info=self.not_found_error_msg()
                )

            setattr(server, 'tunnel_password', None)
            db.session.commit()
        except Exception as e:
            current_app.logger.error(
                "Unable to clear ssh tunnel password."
                "\nError: {0}".format(str(e))
            )

            return internal_server_error(errormsg=str(e))

        return make_json_response(
            success=1,
            info=gettext("The saved password cleared successfully."),
            data={'is_tunnel_password_saved': False}
        )


SchemaDiffRegistry(blueprint.node_type, ServerNode)
ServerNode.register_node_view(blueprint)
