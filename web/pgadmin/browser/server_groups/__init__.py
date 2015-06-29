##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Defines views for management of server groups"""

from abc import ABCMeta, abstractmethod
import traceback
from flask import Blueprint, Response, current_app, request, render_template
from flask.ext.babel import gettext
from flask.ext.security import current_user, login_required
from pgadmin import current_blueprint
from pgadmin.utils.ajax import make_json_response
from pgadmin.browser import BrowserPluginModule
from pgadmin.utils.menu import MenuItem
from pgadmin.settings.settings_model import db, ServerGroup
from pgadmin.browser.utils import generate_browser_node
import config


class ServerGroupModule(BrowserPluginModule):

    NODE_TYPE = "server-group"

    def get_own_menuitems(self):
        return {
            'standard_items': [
                ServerGroupMenuItem(action="drop", priority=10, function="drop_server_group"),
                ServerGroupMenuItem(action="rename", priority=10, function="rename_server_group")
            ],
            'create_items': [
                ServerGroupMenuItem(name="create_server_group",
                                    label=gettext('Server Group...'),
                                    priority=10,
                                    function="create_server_group",
                                    types=[self.node_type])
            ],
            'context_items': [
                ServerGroupMenuItem(name="delete_server_group",
                                    label=gettext('Delete server group'),
                                    priority=10,
                                    onclick='drop_server_group(item);'),
                ServerGroupMenuItem(name="rename_server_group",
                                    label=gettext('Rename server group...'),
                                    priority=10,
                                    onclick='rename_server_group(item);')
            ]
        }


    @property
    def jssnippets(self):
        snippets = [render_template("server_groups/server_groups.js")]
        for module in self.submodules:
            snippets.extend(module.jssnippets)
        return snippets

    def get_nodes(self, **kwargs):
        """Return a JSON document listing the server groups for the user"""
        groups = ServerGroup.query.filter_by(user_id=current_user.id)
        # TODO: Move this JSON generation to a Server method
        # this code is duplicated somewhere else
        for group in groups:
            yield generate_browser_node(
                    "%d" % (group.id),
                    group.name,
                    "icon-%s" % self.node_type,
                    True,
                    self.node_type)

    @property
    def node_type(self):
        return self.NODE_TYPE

    @property
    def node_path(self):
        return '/browser/' + self.node_type


class ServerGroupMenuItem(MenuItem):

    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerGroupModule.NODE_TYPE)
        super(ServerGroupMenuItem, self).__init__(**kwargs)


class ServerGroupPluginModule(BrowserPluginModule):
    """
    Base class for server group plugins.
    """

    __metaclass__ = ABCMeta


    @abstractmethod
    def get_nodes(self, servergroup):
        pass


    @property
    def node_path(self):
        return '/browser/' + self.node_type


blueprint = ServerGroupModule( __name__, static_url_path='')

# Initialise the module
from pgadmin.browser.utils import NodeView


class ServerGroupView(NodeView):

    node_type = ServerGroupModule.NODE_TYPE
    parent_ids = []
    ids = [{'type':'int', 'id':'gid'}]


    def list(self):
        res = []
        for g in blueprint.get_nodes():
            res.append(g)
        return make_json_response(result=res)


    def delete(self, gid):
        """Delete a server group node in the settings database"""

        # There can be only one record at most
        servergroup = ServerGroup.query.filter_by(
                user_id=current_user.id,
                id=gid)

        if servergroup is None:
            return make_json_response(
                    success=0,
                    errormsg=gettext('The specified server group could not be found.'))
        else:
            try:
                db.session.delete(servergroup)
                db.session.commit()
            except Exception as e:
                return make_json_response(success=0, errormsg=e.message)

        return make_json_response(result=request.form)


    def update(self, gid):
        """Update the server-group properties"""

        # There can be only one record at most
        servergroup = ServerGroup.query.filter_by(
                user_id=current_user.id,
                id=gid).first()

        if servergroup is None:
            return make_json_response(
                    success=0,
                    errormsg=gettext('The specified server group could not be found.'))
        else:
            try:
                if 'name' in request.form:
                    servergroup.name = request.form['name']
                db.session.commit()
            except Exception as e:
                return make_json_response(success=0, errormsg=e.message)

        return make_json_response(result=request.form)


    def properties(self, gid):
        """Update the server-group properties"""

        # There can be only one record at most
        sg = ServerGroup.query.filter_by(
                user_id=current_user.id,
                id=gid).first()
        data = {}

        if sg is None:
            return make_json_response(
                    success=0,
                    errormsg=gettext('The specified server group could not be found.'))
        else:
            return make_json_response(data={'id': sg.id, 'name': sg.name})


    def create(self):
        data = []
        if request.form['name'] != '':
            servergroup = ServerGroup(
                    user_id=current_user.id,
                    name=request.form['name'])
            try:
                db.session.add(servergroup)
                db.session.commit()

                data['id'] = servergroup.id
                data['name'] = servergroup.name
            except Exception as e:
                return make_json_response(success=0, errormsg=e.message)

        else:
            return make_json_response(
                    success=0,
                    errormsg=gettext('No server group name was specified'))

        return make_json_response(data=data)


    def nodes(self, gid):
        """Build a list of treeview nodes from the child nodes."""
        nodes = []
        for module in blueprint.submodules:
            nodes.extend(module.get_nodes(server_group=gid))
        return make_json_response(data=nodes)


    def sql(self, gid):
        return make_json_response(data='')


    def modified_sql(self, gid):
        return make_json_response(data='')


    def statistics(self, gid):
        return make_json_response(data='')


    def dependencies(self, gid):
        return make_json_response(data='')


    def dependents(self, gid):
        return make_json_response(data='')


ServerGroupView.register_node_view(blueprint)
