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
from pgadmin.settings.settings_model import db, Server
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.ajax import make_json_response
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
            yield {
                "id": "%s/%d" % (NODE_TYPE, server.id),
                "label": server.name,
                "icon": "icon-%s" % NODE_TYPE,
                "inode": True,
                "_type": NODE_TYPE
            }

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
                               function='create_server')
            ],
            'context_items': [
                ServerMenuItem(name='delete_server',
                               label=gettext('Delete server'),
                               priority=50,
                               onclick='drop_server'),
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

@blueprint.route('/add/', methods=['POST'])
@login_required
def add():
    """Add a server node to the settings database"""
    success = 1
    errormsg = ''
    data = {}

    success = False
    errormsg = ''
    if request.form['name'] != '':
        server = Server(user_id=current_user.id, name=request.form['name'])
        try:
            db.session.add(server)
            db.session.commit()
            success = True
        except Exception as e:
            errormsg = e.message
    else:
        errormsg = gettext('No server name was specified')

    if success:
        data['id'] = server.id
        data['name'] = server.name

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form,
                              data=data)

@blueprint.route('/delete/', methods=['POST'])
@login_required
def delete():
    """Delete a server node in the settings database"""
    success = 1
    errormsg = ''

    if request.form['id'] != '':
        # There can be only one record at most
        servergroup = Server.query.filter_by(user_id=current_user.id, id=int(request.form['id'])).first()

        if server is None:
            success = 0
            errormsg = gettext('The specified server could not be found.')
        else:
            try:
                db.session.delete(server)
                db.session.commit()
            except Exception as e:
                success = 0
                errormsg = e.message

    else:
        success = 0
        errormsg = gettext('No server was specified.')

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form)

@blueprint.route('/rename/', methods=['POST'])
@login_required
def rename():
    """Rename a server node in the settings database"""
    success = 1
    errormsg = ''

    if request.form['id'] != '':
        # There can be only one record at most
        servergroup = Server.query.filter_by(user_id=current_user.id, id=int(request.form['id'])).first()

        if server is None:
            success = 0
            errormsg = gettext('The specified server could not be found.')
        else:
            try:
                server.name = request.form['name']
                db.session.commit()
            except Exception as e:
                success = 0
                errormsg = e.message

    else:
        success = 0
        errormsg = gettext('No server was specified.')

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form)

