##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
from flask import render_template, request, make_response, jsonify
from flask.ext.security import login_required, current_user
from pgadmin.settings.settings_model import db, Server, ServerGroup
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response
from pgadmin.browser.utils import NodeView, generate_browser_node
import traceback
from flask.ext.babel import gettext

import pgadmin.browser.server_groups as sg


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

    def get_nodes(self, server_group):
        """Return a JSON document listing the server groups for the user"""
        servers = Server.query.filter_by(user_id=current_user.id,
                                         servergroup_id=server_group)

        # TODO: Move this JSON generation to a Server method
        for server in servers:
            node = generate_browser_node(
                "%d" % (server.id),
                "%d" % server_group,
                server.name,
                "icon-%s-not-connected" % self.NODE_TYPE,
                True,
                self.NODE_TYPE)

            yield node

    @property
    def jssnippets(self):
        return []


class ServerMenuItem(MenuItem):
    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerModule.NODE_TYPE)
        super(ServerMenuItem, self).__init__(**kwargs)


blueprint = ServerModule(__name__)


@blueprint.route('/module.js')
@login_required
def module():
    return make_response(
        render_template("servers/servers.js"),
        200, {'Content-Type': 'application/x-javascript'})


class ServerNode(NodeView):
    node_type = ServerModule.NODE_TYPE
    parent_ids = [{'type': 'int', 'id': 'gid'}]
    ids = [{'type': 'int', 'id': 'sid'}]
    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'nodes'}],
        'sql': [{'get': 'sql', 'post': 'modified_sql'}],
        'stats': [{'get': 'statistics'}],
        'deps': [{'get': 'dependencies', 'post': 'dependents'}],
        'connect': [{'get': 'connect_status', 'post': 'connect', 'delete': 'disconnect'}]
    })

    def list(self, gid):
        res = []
        """Return a JSON document listing the server groups for the user"""
        servers = Server.query.filter_by(user_id=current_user.id,
                                         servergroup_id=gid)

        for server in servers:
            res.append(
                generate_browser_node(
                    "%s" % server.id,
                    "%s" % gid,
                    server.name,
                    "icon-%s-not-connected" % ServerModule.NODE_TYPE,
                    True,
                    ServerModule.NODE_TYPE)
            )
        return make_json_response(result=res)

    def delete(self, gid, sid):
        """Delete a server node in the settings database"""
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

        return make_json_response(success=1,
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
            'gid': 'servergroup_id',
            'comment': 'comment'
        }

        idx = 0
        data = request.form if request.form else json.loads(request.data)

        for arg in possible_args:
            if arg in data:
                setattr(server, possible_args[arg], data[arg])
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
                # TODO:: Make sure - we do have correct values here
                'connected': True,
                'version': 'PostgreSQL 9.3 (linux-x64)'
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
            u'sslmode'
        ]

        data = request.form if request.form else json.loads(request.data)

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
                ssl_mode=data['sslmode'],
                comment=data['comment'] if 'comment' in data else None
            )
            db.session.add(server)
            db.session.commit()

            return jsonify(node=generate_browser_node(
                '%s' % server.id,
                '%s' % gid,
                '%s' % server.name,
                "icon-{0}-not-connected".format(ServerModule.NODE_TYPE),
                True,
                ServerModule.NODE_TYPE))

        except Exception as e:
            return make_json_response(
                status=410,
                success=0,
                errormsg=e.message
            )

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
