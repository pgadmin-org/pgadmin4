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
import json
from flask import request, render_template, make_response, jsonify
from flask.ext.babel import gettext
from flask.ext.security import current_user, login_required
from pgadmin import current_blueprint
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response
from pgadmin.browser import BrowserPluginModule
from pgadmin.utils.menu import MenuItem
from pgadmin.settings.settings_model import db, ServerGroup
from pgadmin.browser.utils import NodeView


class ServerGroupModule(BrowserPluginModule):

    NODE_TYPE = "server-group"

    def get_nodes(self, *arg, **kwargs):
        """Return a JSON document listing the server groups for the user"""
        groups = ServerGroup.query.filter_by(user_id=current_user.id)
        for group in groups:
            yield self.generate_browser_node(
                    "%d" % (group.id),
                    None,
                    group.name,
                    "icon-%s" % self.node_type,
                    True,
                    self.node_type
                    )

    @property
    def node_type(self):
        return self.NODE_TYPE

    @property
    def script_load(self):
        return None


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
    def get_nodes(self, *arg, **kwargs):
        pass


blueprint = ServerGroupModule(__name__, static_url_path='')


class ServerGroupView(NodeView):

    node_type = ServerGroupModule.NODE_TYPE
    parent_ids = []
    ids = [{'type': 'int', 'id': 'gid'}]

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
                    status=417,
                    success=0,
                    errormsg=gettext(
                        'The specified server group could not be found.'
                        )
                    )
        else:
            try:
                for sg in servergroup:
                    db.session.delete(sg)
                db.session.commit()
            except Exception as e:
                return make_json_response(
                        status=410, success=0, errormsg=e.message
                        )

        return make_json_response(result=request.form)

    def update(self, gid):
        """Update the server-group properties"""

        # There can be only one record at most
        servergroup = ServerGroup.query.filter_by(
                user_id=current_user.id,
                id=gid).first()

        data = request.form if request.form else json.loads(request.data)

        if servergroup is None:
            return make_json_response(
                    status=417,
                    success=0,
                    errormsg=gettext(
                        'The specified server group could not be found.'
                        )
                    )
        else:
            try:
                if u'name' in data:
                    servergroup.name = data[u'name']
                db.session.commit()
            except Exception as e:
                return make_json_response(
                        status=410, success=0, errormsg=e.message
                        )

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
                    status=417,
                    success=0,
                    errormsg=gettext(
                        'The specified server group could not be found.'
                        )
                    )
        else:
            return ajax_response(
                    response={'id': sg.id, 'name': sg.name},
                    status=200
                    )

    def create(self):
        data = request.form if request.form else json.loads(request.data)

        if data[u'name'] != '':
            try:
                sg = ServerGroup(
                    user_id=current_user.id,
                    name=data[u'name'])
                db.session.add(sg)
                db.session.commit()

                data[u'id'] = sg.id
                data[u'name'] = sg.name

                return jsonify(
                        node=self.blueprint.generate_browser_node(
                            "%d" % (sg.id),
                            None,
                            sg.name,
                            "icon-%s" % self.node_type,
                            True,
                            self.node_type
                            )
                        )
            except Exception as e:
                return make_json_response(
                        status=410,
                        success=0,
                        errormsg=e.message)

        else:
            return make_json_response(
                    status=417,
                    success=0,
                    errormsg=gettext('No server group name was specified'))

    def sql(self, gid):
        return make_json_response(status=422)

    def modified_sql(self, gid):
        return make_json_response(status=422)

    def statistics(self, gid):
        return make_json_response(status=422)

    def dependencies(self, gid):
        return make_json_response(status=422)

    def dependents(self, gid):
        return make_json_response(status=422)

    def module_js(self, **kwargs):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
                render_template("server_groups/server_groups.js"),
                200, {'Content-Type': 'application/x-javascript'}
                )


ServerGroupView.register_node_view(blueprint)
