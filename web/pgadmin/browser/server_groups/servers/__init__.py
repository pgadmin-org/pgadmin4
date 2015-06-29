##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from flask import render_template, request
from pgadmin.browser.server_groups import ServerGroupPluginModule
from flask.ext.security import login_required, current_user
from pgadmin.settings.settings_model import db, Server, ServerGroup
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.ajax import make_json_response
from pgadmin.browser.utils import generate_browser_node, NodeView
import traceback
from flask.ext.babel import gettext


class ServerModule(ServerGroupPluginModule):

    NODE_TYPE = "server"

    @property
    def node_type(self):
        return self.NODE_TYPE

    def get_nodes(self, server_group):
        """Return a JSON document listing the server groups for the user"""
        servers = Server.query.filter_by(user_id=current_user.id, servergroup_id=server_group)

        # TODO: Move this JSON generation to a Server method
        for server in servers:
            yield generate_browser_node(
                    "%d" % server.id,
                    server.name,
                    "icon-%s" % self.NODE_TYPE,
                    True,
                    self.NODE_TYPE
                    )

    def get_own_menuitems(self):
        return {
            'standard_items': [
                ServerMenuItem(action="drop", priority=50, function='drop_server'),
                ServerMenuItem(action="rename", priority=50, function='rename_server')
            ],
            'create_items': [
                ServerMenuItem(types=["server-group", "server"],
                               name="create_server",
                               label=gettext('Server...'),
                               priority=50,
                               function='create_server(item)')
            ],
            'context_items': [
                ServerMenuItem(name='delete_server',
                               label=gettext('Delete server'),
                               priority=50,
                               onclick='drop_server(item)'),
                ServerMenuItem(name='rename_server',
                               label=gettext('Rename server...'),
                               priority=60,
                               onclick='rename_server(item);')
            ]
        }


    @property
    def jssnippets(self):
        return [render_template("servers/servers.js")]


class ServerMenuItem(MenuItem):

    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerModule.NODE_TYPE)
        super(ServerMenuItem, self).__init__(**kwargs)


blueprint = ServerModule(__name__)


class ServerNode(NodeView):

    node_type = ServerModule.NODE_TYPE
    parent_ids = [{'type':'int', 'id':'gid'}]
    ids = [{'type':'int', 'id':'sid'}]


    def list(self, gid):
        res = []
        """Return a JSON document listing the server groups for the user"""
        servers = Server.query.filter_by(user_id=current_user.id,
                servergroup_id=gid)

        for server in servers:
            res.append(
                    generate_browser_node(
                        "%d/%d" % (gid, server.id),
                        server.name,
                        "icon-%s" % NODE_TYPE,
                        True,
                        NODE_TYPE
                        )
                    )
        return make_json_response(result=res)


    def delete(self, gid, sid):
        """Delete a server node in the settings database"""
        server = Server.query.filter_by(user_id=current_user.id, id=sid)

        # TODO:: A server, which is connected, can not be deleted
        if server is None:
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
                db.session.delete(server)
                db.session.commit()
            except Exception as e:
                return make_json_response(
                        success=0,
                        errormsg=e.message)

        return make_json_response(success=success,
                errormsg=errormsg,
                info=traceback.format_exc())


    def update(self, gid, sid):
        """Update the server settings"""
        server = Server.query.filter_by(user_id=current_user.id, id=sid).first()

        if server is None:
            return make_json_response(
                    success=0,
                    errormsg=gettext("Couldn't find the given server.")
                    )

        # TODO::
        #   Not all parameters can be modified, while the server is connected
        possible_args = {
                'name': 'name',
                'host': 'host',
                'port': 'port',
                'db': 'maintenance_db',
                'username': 'username',
                'sslmode': 'sslmode',
                'gid': 'servergroup_id'
                }

        idx = 0
        for arg in possible_args:
            if arg in request.form:
                server[possible_args[arg]] = request.form[arg]
                idx += 1

        if idx == 0:
            return make_json_response(
                    success=0,
                    errormsg=gettext('No parameters were chagned!')
                    )

        try:
            db.session.commit()
        except Exception as e:
            return make_json_response(
                    success=0,
                    errormsg=e.message
                    )

        return make_json_response(
                success=1,
                data={
                    'id': server.id,
                    'gid': server.servergroup_id
                    }
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

        return make_json_response(
                success=1,
                data={
                    'id':server.id,
                    'name':server.name,
                    'host':server.host,
                    'port':server.port,
                    'db':server.maintenance_db,
                    'username':server.username,
                    'gid':server.servergroup_id,
                    'group-name':sg.name
                    }
                )


    def create(self, gid):
        """Add a server node to the settings database"""
        required_args = [
                'name',
                'host',
                'port',
                'db',
                'username',
                'sslmode'
                ]

        for arg in required_args:
            if arg not in request.form:
                return make_json_response(
                        success=0,
                        errormsg=gettext(
                            "Couldn't find the required parameter (%s)." % arg
                            )
                        )

        server = Server(
                user_id=current_user.id,
                servergroup_id=gid,
                name=request.form['name'],
                host=request.form['host'],
                port=request.form['port'],
                maintenance_db=request.form['db'],
                username=request.form['username'],
                sslmode=request.form['username']
                )

        try:
            db.session.add(server)
            db.session.commit()
        except Exception as e:
            return make_json_response(
                    success=0,
                    errormsg=e.message
                    )

        return make_json_response(success=1,
                data={
                    'id': server.id,
                    'name': server.name,
                    'gid': gid
                    })


    def nodes(self, gid, sid):
        """Build a list of treeview nodes from the child nodes."""
        nodes = []
        # TODO::
        # We can have nodes for the server object, only when
        # the server is connected at the moment.
        for module in blueprint.submodules:
            nodes.extend(module.get_nodes(server=sid))
        return make_json_response(data=nodes)


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


ServerNode.register_node_view(blueprint)
