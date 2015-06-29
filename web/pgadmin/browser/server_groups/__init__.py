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
            yield {
                "id": "%s/%d" % (self.node_type, group.id),
                "label": group.name,
                "icon": "icon-%s" % self.node_type,
                "inode": True,
                "_type": self.node_type
            }

    @property
    def node_type(self):
        return self.NODE_TYPE



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


# Initialise the module
blueprint = ServerGroupModule( __name__, static_url_path='')

@blueprint.route("/<server_group>")
@login_required
def get_nodes(server_group):
    """Build a list of treeview nodes from the child nodes."""
    nodes = []
    for module in current_blueprint.submodules:
        nodes.extend(module.get_nodes(server_group=server_group))
    return make_json_response(data=nodes)


@blueprint.route('/add/', methods=['POST'])
@login_required
def add():
    """Add a server group node to the settings database"""
    success = 1
    errormsg = ''
    data = { }

    if request.form['name'] != '':
        servergroup = ServerGroup(user_id=current_user.id, name=request.form['name'])

        try:
            db.session.add(servergroup)
            db.session.commit()
        except Exception as e:
            success = 0
            errormsg = e.message

    else:
        success = 0
        errormsg = gettext('No server group name was specified')

    if success == 1:
        data['id'] = servergroup.id
        data['name'] = servergroup.name

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form,
                              data=data)

@blueprint.route('/delete/', methods=['POST'])
@login_required
def delete():
    """Delete a server group node in the settings database"""
    success = 1
    errormsg = ''

    if request.form['id'] != '':
        # There can be only one record at most
        servergroup = ServerGroup.query.filter_by(user_id=current_user.id, id=int(request.form['id'])).first()

        if servergroup is None:
            success = 0
            errormsg = gettext('The specified server group could not be found.')
        else:
            try:
                db.session.delete(servergroup)
                db.session.commit()
            except Exception as e:
                success = 0
                errormsg = e.message

    else:
        success = 0
        errormsg = gettext('No server group  was specified.')

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form)

@blueprint.route('/rename/', methods=['POST'])
@login_required
def rename():
    """Rename a server group node in the settings database"""
    success = 1
    errormsg = ''

    if request.form['id'] != '':
        # There can be only one record at most
        servergroup = ServerGroup.query.filter_by(user_id=current_user.id, id=int(request.form['id'])).first()

        if servergroup is None:
            success = 0
            errormsg = gettext('The specified server group could not be found.')
        else:
            try:
                servergroup.name = request.form['name']
                db.session.commit()
            except Exception as e:
                success = 0
                errormsg = e.message

    else:
        success = 0
        errormsg = gettext('No server group was specified.')

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form)
