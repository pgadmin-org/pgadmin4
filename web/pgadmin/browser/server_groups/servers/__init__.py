##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import simplejson as json

import pgadmin.browser.server_groups as sg
from flask import render_template, request, make_response, jsonify, \
    current_app, url_for
from flask_babel import gettext
from flask_security import current_user
from pgadmin.browser.server_groups.servers.types import ServerType
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, bad_request, forbidden, \
    make_response as ajax_response, internal_server_error, unauthorized, gone
from pgadmin.utils.crypto import encrypt, decrypt, pqencryptpassword
from pgadmin.utils.menu import MenuItem

import config
from config import PG_DEFAULT_DRIVER
from pgadmin.model import db, Server, ServerGroup, User
from pgadmin.utils.driver import get_driver


def has_any(data, keys):
    """
    Checks any one of the keys present in the data given
    """
    if data is None and type(data) != dict:
        return False

    if keys is None and type(keys) != list:
        return False

    for key in keys:
        if key in data:
            return True

    return False


class ServerModule(sg.ServerGroupPluginModule):
    NODE_TYPE = "server"
    LABEL = gettext("Servers")

    @property
    def node_type(self):
        return self.NODE_TYPE

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return sg.ServerGroupModule.NODE_TYPE

    def get_nodes(self, gid):
        """Return a JSON document listing the server groups for the user"""
        servers = Server.query.filter_by(user_id=current_user.id,
                                         servergroup_id=gid)

        driver = get_driver(PG_DEFAULT_DRIVER)

        for server in servers:
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()
            in_recovery = None
            wal_paused = None
            if connected:
                status, result = conn.execute_dict("""
                    SELECT CASE WHEN usesuper
                           THEN pg_is_in_recovery()
                           ELSE FALSE
                           END as inrecovery,
                           CASE WHEN usesuper AND pg_is_in_recovery()
                           THEN pg_is_xlog_replay_paused()
                           ELSE FALSE
                           END as isreplaypaused
                    FROM pg_user WHERE usename=current_user""")

                if len(result['rows']):
                    in_recovery = result['rows'][0]['inrecovery']
                    wal_paused = result['rows'][0]['isreplaypaused']

            yield self.generate_browser_node(
                "%d" % (server.id),
                gid,
                server.name,
                "icon-server-not-connected" if not connected else
                "icon-{0}".format(manager.server_type),
                True,
                self.NODE_TYPE,
                connected=connected,
                server_type=manager.server_type if connected else "pg",
                version=manager.version,
                db=manager.db,
                user=manager.user_info if connected else None,
                in_recovery=in_recovery,
                wal_pause=wal_paused
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

    def get_own_javascripts(self):
        scripts = []

        scripts.extend([{
            'name': 'pgadmin.node.server',
            'path': url_for('browser.index') + '%s/module' % self.node_type,
            'when': self.script_load
        },
            {
                'name': 'pgadmin.browser.server.privilege',
                'path': url_for('browser.index') + 'server/static/js/privilege',
                'when': self.node_type,
                'deps': ['pgadmin.browser.node.ui']
            },
            {
                'name': 'pgadmin.browser.server.variable',
                'path': url_for('browser.index') + 'server/static/js/variable',
                'when': self.node_type
            }])

        for module in self.submodules:
            scripts.extend(module.get_own_javascripts())

        return scripts

    def register(self, app, options, first_registration=False):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        if first_registration:
            driver = get_driver(PG_DEFAULT_DRIVER, app)
            app.jinja_env.filters['qtLiteral'] = driver.qtLiteral
            app.jinja_env.filters['qtIdent'] = driver.qtIdent
            app.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent
            app.jinja_env.filters['hasAny'] = has_any

        super(ServerModule, self).register(app, options, first_registration)

    # We do not have any preferences for server node.
    def register_preferences(self):
        """
        register_preferences
        Override it so that - it does not register the show_node preference for
        server type.
        """
        ServerType.register_preferences()


class ServerMenuItem(MenuItem):
    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerModule.NODE_TYPE)
        super(ServerMenuItem, self).__init__(**kwargs)


blueprint = ServerModule(__name__)


class ServerNode(PGChildNodeView):
    node_type = ServerModule.NODE_TYPE

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
        'module.js': [{}, {}, {'get': 'module_js'}],
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
        }]
    })

    def nodes(self, gid):
        res = []
        """
        Return a JSON document listing the servers under this server group
        for the user.
        """
        servers = Server.query.filter_by(user_id=current_user.id,
                                         servergroup_id=gid)

        driver = get_driver(PG_DEFAULT_DRIVER)

        for server in servers:
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()

            if connected:
                status, result = conn.execute_dict("""
                    SELECT CASE WHEN usesuper
                           THEN pg_is_in_recovery()
                           ELSE FALSE
                           END as inrecovery,
                           CASE WHEN usesuper AND pg_is_in_recovery()
                           THEN pg_is_xlog_replay_paused()
                           ELSE FALSE
                           END as isreplaypaused
                    FROM pg_user WHERE usename=current_user""")

                in_recovery = result['rows'][0]['inrecovery'];
                wal_paused = result['rows'][0]['isreplaypaused']
            else:
                in_recovery = None
                wal_paused = None

            res.append(
                self.blueprint.generate_browser_node(
                    "%d" % (server.id),
                    gid,
                    server.name,
                    "icon-server-not-connected" if not connected else
                    "icon-{0}".format(manager.server_type),
                    True,
                    self.node_type,
                    connected=connected,
                    server_type=manager.server_type if connected else 'pg',
                    version=manager.version,
                    db=manager.db,
                    user=manager.user_info if connected else None,
                    in_recovery=in_recovery,
                    wal_pause=wal_paused
                )
            )

        if not len(res):
            return gone(errormsg=gettext(
                'The specified server group with id# {0} could not be found.'
                ))

        return make_json_response(result=res)

    def node(self, gid, sid):
        """Return a JSON document listing the server groups for the user"""
        server = Server.query.filter_by(user_id=current_user.id,
                                        servergroup_id=gid,
                                        id=sid).first()

        if server is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    gettext(
                        "Couldn't find the server with id# {0}!"
                    ).format(sid)
                )
            )

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(server.id)
        conn = manager.connection()
        connected = conn.connected()

        if connected:
            status, result = conn.execute_dict("""
                SELECT CASE WHEN usesuper
                    THEN pg_is_in_recovery()
                    ELSE FALSE
                    END as inrecovery,
                    CASE WHEN usesuper AND pg_is_in_recovery()
                    THEN pg_is_xlog_replay_paused()
                    ELSE FALSE
                    END as isreplaypaused
                FROM pg_user WHERE usename=current_user""")

            in_recovery = result['rows'][0]['inrecovery'];
            wal_paused = result['rows'][0]['isreplaypaused']
        else:
            in_recovery = None
            wal_paused = None

        return make_json_response(
            result=self.blueprint.generate_browser_node(
                "%d" % (server.id),
                gid,
                server.name,
                "icon-server-not-connected" if not connected else
                "icon-{0}".format(manager.server_type),
                True,
                self.node_type,
                connected=connected,
                server_type=manager.server_type if connected else 'pg',
                version=manager.version,
                db=manager.db,
                user=manager.user_info if connected else None,
                in_recovery=in_recovery,
                wal_pause=wal_paused
            )
        )

    def delete(self, gid, sid):
        """Delete a server node in the settings database."""
        servers = Server.query.filter_by(user_id=current_user.id, id=sid)

        # TODO:: A server, which is connected, can not be deleted
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
                    get_driver(PG_DEFAULT_DRIVER).delete_manager(s.id)
                    db.session.delete(s)
                db.session.commit()
            except Exception as e:
                current_app.logger.exception(e)
                return make_json_response(
                    success=0,
                    errormsg=e.message)

        return make_json_response(success=1,
                                  info=gettext("Server deleted"))

    def update(self, gid, sid):
        """Update the server settings"""
        server = Server.query.filter_by(
            user_id=current_user.id, id=sid).first()

        if server is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext("Could not find the required server.")
            )

        # Not all parameters can be modified, while the server is connected
        config_param_map = {
            'name': 'name',
            'host': 'host',
            'port': 'port',
            'db': 'maintenance_db',
            'username': 'username',
            'sslmode': 'ssl_mode',
            'gid': 'servergroup_id',
            'comment': 'comment',
            'role': 'role'
        }

        disp_lbl = {
            'name': gettext('name'),
            'host': gettext('Host name/address'),
            'port': gettext('Port'),
            'db': gettext('Maintenance database'),
            'username': gettext('Username'),
            'sslmode': gettext('SSL Mode'),
            'comment': gettext('Comments'),
            'role': gettext('Role')
        }

        idx = 0
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        connected = conn.connected()

        if connected:
            for arg in (
                    'host', 'port', 'db', 'username', 'sslmode', 'role'
            ):
                if arg in data:
                    return forbidden(
                        errormsg=gettext(
                            "'{0}' is not allowed to modify, when server is connected."
                        ).format(disp_lbl[arg])
                    )

        for arg in config_param_map:
            if arg in data:
                setattr(server, config_param_map[arg], data[arg])
                idx += 1

        if idx == 0:
            return make_json_response(
                success=0,
                errormsg=gettext('No parameters were changed!')
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
                "icon-server-not-connected" if not connected else
                "icon-{0}".format(manager.server_type),
                True,
                self.node_type,
                connected=False,
                server_type='pg'  # default server type
            )
        )

    def list(self, gid):
        """
        Return list of attributes of all servers.
        """
        servers = Server.query.filter_by(
            user_id=current_user.id,
            servergroup_id=gid).order_by(Server.name)
        sg = ServerGroup.query.filter_by(
            user_id=current_user.id,
            id=gid
        ).first()
        res = []

        driver = get_driver(PG_DEFAULT_DRIVER)

        for server in servers:
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
                'server_type': manager.server_type if connected else 'pg'
            })

        return ajax_response(
            response=res
        )

    def properties(self, gid, sid):
        """Return list of attributes of a server"""
        server = Server.query.filter_by(
            user_id=current_user.id,
            id=sid).first()

        if server is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext("Could not find the required server.")
            )

        sg = ServerGroup.query.filter_by(
            user_id=current_user.id,
            id=server.servergroup_id
        ).first()

        driver = get_driver(PG_DEFAULT_DRIVER)

        manager = driver.connection_manager(sid)
        conn = manager.connection()
        connected = conn.connected()

        return ajax_response(
            response={
                'id': server.id,
                'name': server.name,
                'host': server.host,
                'port': server.port,
                'db': server.maintenance_db,
                'username': server.username,
                'gid': str(server.servergroup_id),
                'group-name': sg.name,
                'comment': server.comment,
                'role': server.role,
                'connected': connected,
                'version': manager.ver,
                'sslmode': server.ssl_mode,
                'server_type': manager.server_type if connected else 'pg'
            }
        )

    def create(self, gid):
        """Add a server node to the settings database"""
        required_args = [
            u'name',
            u'host',
            u'port',
            u'db',
            u'username',
            u'sslmode',
            u'role'
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." % arg
                    )
                )

        server = None

        try:
            server = Server(
                user_id=current_user.id,
                servergroup_id=data[u'gid'] if u'gid' in data else gid,
                name=data[u'name'],
                host=data[u'host'],
                port=data[u'port'],
                maintenance_db=data[u'db'],
                username=data[u'username'],
                ssl_mode=data[u'sslmode'],
                comment=data[u'comment'] if u'comment' in data else None,
                role=data[u'role'] if u'role' in data else None
            )
            db.session.add(server)
            db.session.commit()

            connected = False
            icon = "icon-server-not-connected"
            user = None
            manager = None

            if 'connect_now' in data and data['connect_now']:
                manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(server.id)
                manager.update(server)
                conn = manager.connection()

                have_password =  False
                if 'password' in data and data["password"] != '':
                    # login with password
                    have_password = True
                    password = data['password']
                    password = encrypt(password, current_user.password)
                else:
                    # Attempt password less login
                    password = None

                status, errmsg = conn.connect(
                    password=password,
                    server_types=ServerType.types()
                )

                if not status:
                    db.session.delete(server)
                    db.session.commit()
                    return make_json_response(
                        status=401,
                        success=0,
                        errormsg=gettext("Unable to connect to server:\n\n%s" % errmsg)
                    )
                else:
                    if 'save_password' in data and data['save_password'] and have_password:
                        setattr(server, 'password', password)
                        db.session.commit()

                    user = manager.user_info
                    connected = True

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    "%d" % server.id, server.servergroup_id,
                    server.name,
                    'icon-{0}'.format(manager.server_type) if manager and manager.server_type else "icon-pg",
                    True,
                    self.node_type,
                    user=user,
                    connected=connected,
                    server_type=manager.server_type if manager and manager.server_type else 'pg'
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

    def sql(self, gid, sid):
        return make_json_response(data='')

    def modified_sql(self, gid, sid):
        return make_json_response(data='')

    def get_template_directory(self, version):
        """ This function will check and return template directory
        based on postgres verion"""
        if version >= 90600:
            return '9.6_plus'
        elif version >= 90200:
            return '9.2_plus'
        else:
            return '9.1_plus'

    def statistics(self, gid, sid):
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()

        if conn.connected():
            status, res = conn.execute_dict(
                render_template(
                    "/".join([
                        'servers/sql',
                        self.get_template_directory(manager.version),
                        'stats.sql'
                    ]),
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

    def dependencies(self, gid, sid):
        return make_json_response(data='')

    def dependents(self, gid, sid):
        return make_json_response(data='')

    def module_js(self, **kwargs):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        username = 'postgres'
        if config.SERVER_MODE is True:
            username = current_user.email.split('@')[0]

        return make_response(
            render_template(
                "servers/servers.js",
                server_types=ServerType.types(),
                _=gettext,
                username=username,
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    def connect_status(self, gid, sid):
        """Check and return the connection status."""
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        res = conn.connected()

        if res:
            from pgadmin.utils.exception import ConnectionLost
            try:
                conn.execute_scalar('SELECT 1')
            except ConnectionLost:
                res = False

        return make_json_response(data={'connected': res})

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
        if server is None:
            return bad_request(gettext("Server not found."))

        # Fetch User Details.
        user = User.query.filter_by(id=current_user.id).first()
        if user is None:
            return unauthorized(gettext("Unauthorized request."))

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        ) if request.data else {}

        password = None
        save_password = False

        # Connect the Server
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()

        if 'password' not in data:
            conn_passwd = getattr(conn, 'password', None)
            if conn_passwd is None and server.password is None:
                # Return the password template in case password is not
                # provided, or password has not been saved earlier.
                return make_json_response(
                    success=0,
                    status=428,
                    result=render_template(
                        'servers/password.html',
                        server_label=server.name,
                        username=server.username,
                        _=gettext
                    )
                )
        else:
            password = data['password'] if 'password' in data else None
            save_password = \
                data['save_password'] if password and \
                                         'save_password' in data else False

            # Encrypt the password before saving with user's login password key.
            try:
                password = encrypt(password, user.password) \
                    if password is not None else server.password
            except Exception as e:
                current_app.logger.exception(e)
                return internal_server_error(errormsg=e.message)

        status = True
        try:
            status, errmsg = conn.connect(
                password=password,
                server_types=ServerType.types()
            )
        except Exception as e:
            current_app.logger.exception(e)

            return make_json_response(
                success=0,
                status=401,
                result=render_template(
                    'servers/password.html',
                    server_label=server.name,
                    username=server.username,
                    errmsg=getattr(e, 'message', str(e)),
                    _=gettext
                )
            )

        if not status:
            current_app.logger.error(
                "Could not connected to server(#{0}) - '{1}'.\nError: {2}".format(
                    server.id, server.name, errmsg
                )
            )

            if hasattr(str, 'decode'):
                errmsg = errmsg.decode('utf-8')

            return make_json_response(
                success=0,
                status=401,
                result=render_template(
                    'servers/password.html',
                    server_label=server.name,
                    username=server.username,
                    errmsg=errmsg,
                    _=gettext
                )
            )
        else:
            if save_password:
                try:
                    # Save the encrypted password using the user's login
                    # password key.
                    setattr(server, 'password', password)
                    db.session.commit()
                except Exception as e:
                    # Release Connection
                    current_app.logger.exception(e)
                    manager.release(database=server.maintenance_db)
                    conn = None

                    return internal_server_error(errormsg=e.message)

            current_app.logger.info('Connection Established for server: \
                %s - %s' % (server.id, server.name))
            # Update the recovery and wal pause option for the server if connected successfully
            status, result = conn.execute_dict("""
                    SELECT CASE WHEN usesuper
                           THEN pg_is_in_recovery()
                           ELSE FALSE
                           END as inrecovery,
                           CASE WHEN usesuper AND pg_is_in_recovery()
                           THEN pg_is_xlog_replay_paused()
                           ELSE FALSE
                           END as isreplaypaused
                    FROM pg_user WHERE usename=current_user""")
            if status:
                in_recovery = result['rows'][0]['inrecovery'];
                wal_paused = result['rows'][0]['isreplaypaused']
            else:
                in_recovery = None
                wal_paused = None

            return make_json_response(
                success=1,
                info=gettext("Server connected."),
                data={
                    'icon': 'icon-{0}'.format(
                        manager.server_type
                    ),
                    'connected': True,
                    'server_type': manager.server_type,
                    'type': manager.server_type,
                    'version': manager.version,
                    'db': manager.db,
                    'user': manager.user_info,
                    'in_recovery': in_recovery,
                    'wal_pause': wal_paused
                }
            )

    def disconnect(self, gid, sid):
        """Disconnect the Server."""

        server = Server.query.filter_by(id=sid).first()
        if server is None:
            return bad_request(gettext("Server not found."))

        # Release Connection
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)

        status = manager.release()

        if not status:
            return unauthorized(gettext("Server could not be disconnected."))
        else:
            return make_json_response(
                success=1,
                info=gettext("Server disconnected."),
                data={
                    'icon': 'icon-server-not-connected',
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
                return make_json_response(data={'status': True,
                                                'result': gettext('Server configuration reloaded.')})

        else:
            return make_json_response(data={'status': False,
                                            'result': gettext(
                                                'Not connected to the server or the connection to the server has been closed.')})

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
                            'Named restore point created: {0}'.format(
                                restore_point_name))
                    })

        except Exception as e:
            current_app.logger.error(
                'Named restore point creation failed ({0})'.format(str(e))
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
            data = json.loads(request.form['data'], encoding='utf-8')
            if data and ('password' not in data or
                                 data['password'] == '' or
                                 'newPassword' not in data or
                                 data['newPassword'] == '' or
                                 'confirmPassword' not in data or
                                 data['confirmPassword'] == ''):
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=gettext(
                        "Couldn't find the required parameter(s)."
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

            # Fetch Server Details
            server = Server.query.filter_by(id=sid).first()
            if server is None:
                return bad_request(gettext("Server not found."))

            # Fetch User Details.
            user = User.query.filter_by(id=current_user.id).first()
            if user is None:
                return unauthorized(gettext("Unauthorized request."))

            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
            conn = manager.connection()

            decrypted_password = decrypt(manager.password, user.password)

            if isinstance(decrypted_password, bytes):
                decrypted_password = decrypted_password.decode()

            password = data['password']

            # Validate old password before setting new.
            if password != decrypted_password:
                return unauthorized(gettext("Incorrect password."))

            # Hash new password before saving it.
            password = pqencryptpassword(data['newPassword'], manager.user)

            SQL = render_template("/".join([
                'servers/sql',
                self.get_template_directory(manager.version),
                'change_password.sql'
            ]),
                conn=conn, _=gettext,
                user=manager.user, encrypted_password=password)

            status, res = conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            password = encrypt(data['newPassword'], user.password)
            # Check if old password was stored in pgadmin4 sqlite database.
            # If yes then update that password.
            if server.password is not None:
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
                errormsg=gettext("Could not find the required server.")
            )

        try:
            manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
            conn = manager.connection()

            # Execute SQL to pause or resume WAL replay
            if conn.connected():
                if pause:
                    status, res = conn.execute_scalar(
                        "SELECT pg_xlog_replay_pause();"
                    )
                    if not status:
                        return internal_server_error(
                            errormsg=str(res)
                        )
                else:
                    status, res = conn.execute_scalar(
                        "SELECT pg_xlog_replay_resume();"
                    )
                    if not status:
                        return internal_server_error(
                            errormsg=str(res)
                        )
                return make_json_response(
                    success=1,
                    info=gettext('WAL replay paused'),
                    data={'in_recovery': True, 'wal_pause': pause}
                )
            return gone(errormsg=_('Please connect the server!'))
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


ServerNode.register_node_view(blueprint)
