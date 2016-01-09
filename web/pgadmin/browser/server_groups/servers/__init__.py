##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
from abc import ABCMeta, abstractmethod, abstractproperty
from flask import render_template, request, make_response, jsonify, \
        current_app, url_for
from flask.ext.security import login_required, current_user
from pgadmin.settings.settings_model import db, Server, ServerGroup, User
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, success_return, \
    unauthorized, bad_request, precondition_required, forbidden
from pgadmin.browser.utils import PGChildNodeView
import traceback
from flask.ext.babel import gettext
import pgadmin.browser.server_groups as sg
from pgadmin.utils.crypto import encrypt, decrypt
from pgadmin.browser import BrowserPluginModule
from config import PG_DEFAULT_DRIVER
import six
from pgadmin.browser.server_groups.servers.types import ServerType

class ServerModule(sg.ServerGroupPluginModule):
    NODE_TYPE = "server"

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

        from pgadmin.utils.driver import get_driver
        driver = get_driver(PG_DEFAULT_DRIVER)

        for server in servers:
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()

            yield self.generate_browser_node(
                    "%d" % (server.id),
                    server.name,
                    "icon-server-not-connected" if not connected else
                    "icon-{0}".format(manager.server_type),
                    True,
                    self.NODE_TYPE,
                    connected=connected,
                    server_type=manager.server_type if connected else "pg",
                    version=manager.version
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
            'when': self.node_type
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
            from pgadmin.utils.driver import get_driver
            driver = get_driver(PG_DEFAULT_DRIVER, app)
            app.jinja_env.filters['qtLiteral'] = driver.qtLiteral
            app.jinja_env.filters['qtIdent'] = driver.qtIdent
            app.jinja_env.filters['qtTypeIdent'] = driver.qtTypeIdent

        super(ServerModule, self).register(app, options, first_registration)

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
        'connect': [{
            'get': 'connect_status', 'post': 'connect', 'delete': 'disconnect'
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

        from pgadmin.utils.driver import get_driver
        driver = get_driver(PG_DEFAULT_DRIVER)

        for server in servers:
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()

            res.append(
                self.blueprint.generate_browser_node(
                    "%d" % (server.id),
                    server.name,
                    "icon-server-not-connected" if not connected else
                    "icon-{0}".format(manager.server_type),
                    True,
                    self.node_type,
                    connected=connected,
                    server_type=manager.server_type if connected else 'pg',
                    version=manager.version
                    )
                )
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
                            "Couldn't find the server with id# %s!"
                            ).format(sid)
                    )
                )

        from pgadmin.utils.driver import get_driver
        driver = get_driver(PG_DEFAULT_DRIVER).connection_manager(server.id)

        conn = manager.connection()
        connected = conn.connected()

        return make_json_response(
                result=self.blueprint.generate_browser_node(
                    "%d" % (server.id),
                    server.name,
                    "icon-server-not-connected" if not connected else
                    "icon-{0}".format(manager.server_type),
                    True,
                    self.node_type,
                    connected=connected,
                    server_type=manager.server_type if connected else 'pg',
                    version=manager.version
                    )
                )

    def delete(self, gid, sid):
        """Delete a server node in the settings database."""
        servers = Server.query.filter_by(user_id=current_user.id, id=sid)

        # TODO:: A server, which is connected, can not be deleted
        if servers is None:
            return make_json_response(
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
                    db.session.delete(s)
                db.session.commit()
            except Exception as e:
                return make_json_response(
                    success=0,
                    errormsg=e.message)

        try:
            info = traceback.format_exc()
        except Exception as e:
            info = str(e)

        return make_json_response(success=1,
                                  info=info)

    def update(self, gid, sid):
        """Update the server settings"""
        server = Server.query.filter_by(
                    user_id=current_user.id, id=sid).first()

        if server is None:
            return make_json_response(
                success=0,
                errormsg=gettext("Couldn't find the given server.")
            )

        # Not all parameters can be modified, while the server is connected
        config_param_map = {
            'name': 'name',
            'host': 'host',
            'port': 'port',
            'db': 'maintenance_db',
            'username': 'username',
            'sslmode': 'sslmode',
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
        data = request.form if request.form else json.loads(request.data)

        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()
        not_allowed = {}

        if conn.connected():
            for arg in {
                    'host', 'port', 'db', 'username', 'sslmode', 'role'
                    }:
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
            return make_json_response(
                success=0,
                errormsg=e.message
            )

        manager.update(server)

        return make_json_response(
            success=1,
            data={
                'id': server.id,
                'gid': server.servergroup_id,
                'icon': 'icon-server-not-connected'
            }
        )

    def list(self, gid):
        """
        Return list of attributes of all servers.
        """
        servers = Server.query.filter_by(
                user_id=current_user.id,
                servergroup_id=gid)
        sg = ServerGroup.query.filter_by(
                user_id=current_user.id,
                id=gid
                ).first()
        res = []

        from pgadmin.utils.driver import get_driver
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
                success=0,
                errormsg=gettext("Couldn't find the given server")
            )

        sg = ServerGroup.query.filter_by(
            user_id=current_user.id,
            id=server.servergroup_id
        ).first()

        from pgadmin.utils.driver import get_driver
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
                'gid': server.servergroup_id,
                'group-name': sg.name,
                'comment': server.comment,
                'role': server.role,
                'connected': connected,
                'version': manager.ver,
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

        data = request.form if request.form else json.loads(request.data.decode())

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Couldn't find the required parameter (%s)." % arg
                    )
                )

        try:
            server = Server(
                user_id=current_user.id,
                servergroup_id=gid,
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

            return jsonify(
                    node=self.blueprint.generate_browser_node(
                        "%d" % (server.id),
                        server.name,
                        "icon-server-not-connected",
                        True,
                        self.node_type,
                        connected=False,
                        server_type='pg'  # Default server type
                        )
                    )

        except Exception as e:
            return make_json_response(
                status=410,
                success=0,
                errormsg=e.message
            )

    def sql(self, gid, sid):
        return make_json_response(data='')

    def modified_sql(self, gid, sid):
        return make_json_response(data='')

    def statistics(self, gid, sid):
        return make_json_response(data='')

    def dependencies(self, gid, sid):
        return make_json_response(data='')

    def dependents(self, gid, sid):
        return make_json_response(data='')

    def module_js(self, **kwargs):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
                render_template(
                    "servers/servers.js",
                    server_types=ServerType.types(),
                    _=gettext
                    ),
                200, {'Content-Type': 'application/x-javascript'}
                )

    def connect_status(self, gid, sid):
        """Check and return the connection status."""
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()

        return make_json_response(data={'connected': conn.connected()})

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
            return bad_request(gettext("Server Not Found."))

        # Fetch User Details.
        user = User.query.filter_by(id=current_user.id).first()
        if user is None:
            return unauthorized(gettext("Unauthorized Request."))

        data = request.form if request.form else json.loads(request.data) if \
            request.data else {}

        password = None
        save_password = False

        if 'password' not in data:
            if server.password is None:
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
            return internal_server_error(errormsg=e.message)

        # Connect the Server
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        conn = manager.connection()

        try:
            status, errmsg = conn.connect(
                    password=password,
                    server_types=ServerType.types()
                    )
        except Exception as e:
            # TODO::
            # Ask the password again (if existing password couldn't be
            # descrypted)
            if e.message:
                return internal_server_error(errormsg=e.message)
            else:
                return internal_server_error(errormsg=str(e))

        if not status:
            current_app.logger.error(
                "Could not connected to server(#{0}) - '{1}'.\nError: {2}".format(
                  server.id, server.name, errmsg
                  )
                )

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
                    manager.release(database=server.maintenance_db)
                    conn = None

                    return internal_server_error(errormsg=e.message)

            current_app.logger.info('Connection Established for server: \
                %s - %s' % (server.id, server.name))

            return make_json_response(
                        success=1,
                        info=gettext("Server Connected."),
                        data={
                            'icon': 'icon-{0}'.format(
                                manager.server_type
                                ),
                            'connected': True,
                            'type': manager.server_type,
                            'version': manager.version,
                            'db': manager.db
                            }
                        )

    def disconnect(self, gid, sid):
        """Disconnect the Server."""

        server = Server.query.filter_by(id=sid).first()
        if server is None:
            return bad_request(gettext("Server Not Found."))

        # Release Connection
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)

        status = manager.release()

        if not status:
            return unauthorized(gettext("Server Could Not Disconnect."))
        else:
            return make_json_response(
                    success=1,
                    info=gettext("Server Disconnected."),
                    data={
                        'icon': 'icon-server-not-connected',
                        'connected': False
                        }
                    )


ServerNode.register_node_view(blueprint)
