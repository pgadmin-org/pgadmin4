##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Defines views for management of server groups"""

import simplejson as json
from abc import ABCMeta, abstractmethod

import six
from flask import request, render_template, make_response, jsonify
from flask_babel import gettext
from flask_security import current_user
from pgadmin.browser import BrowserPluginModule
from pgadmin.browser.utils import NodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response
from pgadmin.utils.menu import MenuItem

from pgadmin.model import db, ServerGroup


class ServerGroupModule(BrowserPluginModule):
    NODE_TYPE = "server-group"

    def get_nodes(self, *arg, **kwargs):
        """Return a JSON document listing the server groups for the user"""
        groups = ServerGroup.query.filter_by(
            user_id=current_user.id
        ).order_by("id")
        for idx, group in enumerate(groups):
            yield self.generate_browser_node(
                "%d" % (group.id), None,
                group.name,
                "icon-%s" % self.node_type,
                True,
                self.node_type,
                can_delete=True if idx > 0 else False
            )

    @property
    def node_type(self):
        """
        node_type
        Node type for Server Group is server-group. It is defined by NODE_TYPE
        static attribute of the class.
        """
        return self.NODE_TYPE

    @property
    def script_load(self):
        """
        script_load
        Load the server-group javascript module on loading of browser module.
        """
        return None

    def register_preferences(self):
        """
        register_preferences
        Overrides the register_preferences PgAdminModule, because - we will not
        register any preference for server-group (specially the show_node
        preference.)
        """
        pass


class ServerGroupMenuItem(MenuItem):
    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerGroupModule.NODE_TYPE)
        super(ServerGroupMenuItem, self).__init__(**kwargs)


@six.add_metaclass(ABCMeta)
class ServerGroupPluginModule(BrowserPluginModule):
    """
    Base class for server group plugins.
    """

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

        for sg in ServerGroup.query.filter_by(
                user_id=current_user.id
        ).order_by('name'):
            res.append({
                'id': sg.id,
                'name': sg.name
            })

        return ajax_response(response=res, status=200)

    def delete(self, gid):
        """Delete a server group node in the settings database"""

        groups = ServerGroup.query.filter_by(
            user_id=current_user.id
        ).order_by("id")

        # if server group id is 1 we won't delete it.
        sg = groups.first()

        if sg.id == gid:
            return make_json_response(
                status=417,
                success=0,
                errormsg=gettext(
                    'The specified server group cannot be deleted.'
                )
            )

        # There can be only one record at most
        sg = groups.filter_by(id=gid).first()

        if sg is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    'The specified server group could not be found.'
                )
            )
        else:
            try:
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

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

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

        return jsonify(
            node=self.blueprint.generate_browser_node(
                gid,
                None,
                servergroup.name,
                "icon-%s" % self.node_type,
                True,
                self.node_type,
                can_delete=True  # This is user created hence can deleted
            )
        )

    def properties(self, gid):
        """Update the server-group properties"""

        # There can be only one record at most
        sg = ServerGroup.query.filter_by(
            user_id=current_user.id,
            id=gid).first()

        if sg is None:
            return make_json_response(
                status=410,
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
        """Creates new server-group """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        if data[u'name'] != '':
            try:
                check_sg = ServerGroup.query.filter_by(
                    user_id=current_user.id,
                    name=data[u'name']).first()

                # Throw error if server group already exists...
                if check_sg is not None:
                    return make_json_response(
                        status=409,
                        success=0,
                        errormsg=gettext('Server group already exists')
                    )

                sg = ServerGroup(
                    user_id=current_user.id,
                    name=data[u'name'])
                db.session.add(sg)
                db.session.commit()

                data[u'id'] = sg.id
                data[u'name'] = sg.name

                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        "%d" % (sg.id),None,
                        sg.name,
                        "icon-%s" % self.node_type,
                        True,
                        self.node_type,
                        can_delete=True  # This is user created hence can deleted
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

    def nodes(self, gid=None):
        """Return a JSON document listing the server groups for the user"""
        nodes = []

        if gid is None:
            groups = ServerGroup.query.filter_by(user_id=current_user.id)

            for group in groups:
                nodes.append(
                    self.blueprint.generate_browser_node(
                        "%d" % (group.id), None,
                        group.name,
                        "icon-%s" % self.node_type,
                        True,
                        self.node_type
                    )
                )
        else:
            group = ServerGroup.query.filter_by(user_id=current_user.id,
                                                 id=gid).first()
            if not group:
                return gone(errormsg="Couldn't find the server-group!")

            nodes = self.blueprint.generate_browser_node(
                "%d" % (group.id), None,
                group.name,
                "icon-%s" % self.node_type,
                True,
                self.node_type
            )

        return make_json_response(data=nodes)

    def node(self, gid):
        return self.nodes(gid)


ServerGroupView.register_node_view(blueprint)
