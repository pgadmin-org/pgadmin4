##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of server groups"""

import json
from abc import ABCMeta, abstractmethod

from flask import request, jsonify, render_template
from flask_babel import gettext
from flask_security import current_user, login_required
from pgadmin.browser import BrowserPluginModule
from pgadmin.browser.utils import NodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response, bad_request
from pgadmin.utils.menu import MenuItem
from sqlalchemy import exc
from pgadmin.model import db, ServerGroup, Server
import config
from pgadmin.utils.preferences import Preferences


def get_icon_css_class(group_id, group_user_id,
                       default_val='icon-server_group'):
    """
    Returns css value
    :param group_id:
    :param group_user_id:
    :param default_val:
    :return: default_val
    """
    if (config.SERVER_MODE and
        group_user_id != current_user.id and
            ServerGroupModule.has_shared_server(group_id)):
        default_val = 'icon-server_group_shared'

    return default_val


SG_NOT_FOUND_ERROR = 'The specified server group could not be found.'


class ServerGroupModule(BrowserPluginModule):
    _NODE_TYPE = "server_group"
    node_icon = "icon-%s" % _NODE_TYPE

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [render_template("css/server_group.css")]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets

    @staticmethod
    def has_shared_server(gid):
        """
        To check whether given server group contains shared server or not
        :param gid:
        :return: True if servergroup contains shared server else false
        """
        servers = Server.query.filter_by(servergroup_id=gid)
        for s in servers:
            if s.shared:
                return True
        return False

    def get_nodes(self, *arg, **kwargs):
        """Return a JSON document listing the server groups for the user"""

        if config.SERVER_MODE:
            groups = ServerGroupView.get_all_server_groups()
        else:
            groups = ServerGroup.query.filter_by(
                user_id=current_user.id
            ).order_by("id")

        for idx, group in enumerate(groups):
            yield self.generate_browser_node(
                "%d" % (group.id), None,
                group.name,
                get_icon_css_class(group.id, group.user_id),
                True,
                self.node_type,
                can_delete=True if idx > 0 else False,
                user_id=group.user_id
            )

    @property
    def node_type(self):
        """
        node_type
        Node type for Server Group is server-group. It is defined by _NODE_TYPE
        static attribute of the class.
        """
        return self._NODE_TYPE

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

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        from .servers import blueprint as module
        self.submodules.append(module)
        super().register(app, options)


class ServerGroupMenuItem(MenuItem):
    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerGroupModule.node_type)
        super().__init__(**kwargs)


class ServerGroupPluginModule(BrowserPluginModule, metaclass=ABCMeta):
    """
    Base class for server group plugins.
    """

    @abstractmethod
    def get_nodes(self, *arg, **kwargs):
        pass


blueprint = ServerGroupModule(__name__)


class ServerGroupView(NodeView):
    node_type = ServerGroupModule._NODE_TYPE
    node_icon = ServerGroupModule.node_icon
    node_label = "Server Group"

    parent_ids = []
    ids = [{'type': 'int', 'id': 'gid'}]

    @login_required
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

    @login_required
    def delete(self, gid):
        """Delete a server group node in the settings database"""

        groups = ServerGroup.query.filter_by(
            user_id=current_user.id
        ).order_by("id")

        # if server group id is 1 we won't delete it.
        sg = groups.first()

        shared_servers = Server.query.filter_by(servergroup_id=gid,
                                                shared=True).all()
        if shared_servers:
            return make_json_response(
                status=417,
                success=0,
                errormsg=gettext(
                    'The specified server group cannot be deleted.'
                )
            )

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
                errormsg=gettext(SG_NOT_FOUND_ERROR)
            )
        else:
            try:
                db.session.delete(sg)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                return make_json_response(
                    status=410, success=0, errormsg=e.message
                )

        return make_json_response(result=request.form)

    @login_required
    def update(self, gid):
        """Update the server-group properties"""

        # There can be only one record at most
        servergroup = ServerGroup.query.filter_by(
            user_id=current_user.id,
            id=gid).first()

        data = request.form if request.form else json.loads(
            request.data
        )

        if servergroup is None:
            return make_json_response(
                status=417,
                success=0,
                errormsg=gettext(SG_NOT_FOUND_ERROR)
            )
        else:
            try:
                if 'name' in data:
                    servergroup.name = data['name']
                db.session.commit()
            except exc.IntegrityError:
                db.session.rollback()
                return bad_request(gettext(
                    "The specified server group already exists."
                ))
            except Exception as e:
                db.session.rollback()
                return make_json_response(
                    status=410, success=0, errormsg=e.message
                )

        return jsonify(
            node=self.blueprint.generate_browser_node(
                gid,
                None,
                servergroup.name,
                get_icon_css_class(gid, servergroup.user_id),
                True,
                self.node_type,
                can_delete=True  # This is user created hence can deleted
            )
        )

    @login_required
    def properties(self, gid):
        """Update the server-group properties"""

        sg = ServerGroup.query.filter(ServerGroup.id == gid).first()

        if sg is None:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(SG_NOT_FOUND_ERROR)
            )
        else:
            return ajax_response(
                response={'id': sg.id, 'name': sg.name, 'user_id': sg.user_id},
                status=200
            )

    @login_required
    def create(self):
        """Creates new server-group """
        data = request.form if request.form else json.loads(
            request.data
        )
        if data['name'] != '':
            try:
                sg = ServerGroup(
                    user_id=current_user.id,
                    name=data['name'])
                db.session.add(sg)
                db.session.commit()

                data['id'] = sg.id
                data['name'] = sg.name

                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        "%d" % sg.id,
                        None,
                        sg.name,
                        get_icon_css_class(sg.id, sg.user_id),
                        True,
                        self.node_type,
                        # This is user created hence can deleted
                        can_delete=True
                    )
                )
            except exc.IntegrityError:
                db.session.rollback()
                return bad_request(gettext(
                    "The specified server group already exists."
                ))

            except Exception as e:
                db.session.rollback()
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=e.message)

        else:
            return make_json_response(
                status=417,
                success=0,
                errormsg=gettext('No server group name was specified'))

    @login_required
    def sql(self, gid):
        return make_json_response(status=422)

    @login_required
    def modified_sql(self, gid):
        return make_json_response(status=422)

    @login_required
    def statistics(self, gid):
        return make_json_response(status=422)

    @login_required
    def dependencies(self, gid):
        return make_json_response(status=422)

    @login_required
    def dependents(self, gid):
        return make_json_response(status=422)

    @staticmethod
    def get_all_server_groups():
        """
        Returns the list of server groups to show in server mode and
        if there is any shared server in the group.
        :return: server groups
        """

        # Don't display shared server if user has
        # selected 'Hide shared server'
        pref = Preferences.module('browser')
        hide_shared_server = pref.preference('hide_shared_server').get()

        server_groups = ServerGroup.query.all()
        groups = []
        for group in server_groups:
            if hide_shared_server and \
                ServerGroupModule.has_shared_server(group.id) and \
                    group.user_id != current_user.id:
                continue
            if group.user_id == current_user.id or \
                    ServerGroupModule.has_shared_server(group.id):
                groups.append(group)
        return groups

    @login_required
    def nodes(self, gid=None):
        """Return a JSON document listing the server groups for the user"""
        nodes = []
        if gid is None:
            if config.SERVER_MODE:

                groups = self.get_all_server_groups()
            else:
                groups = ServerGroup.query.filter_by(user_id=current_user.id)

            for group in groups:
                nodes.append(
                    self.blueprint.generate_browser_node(
                        "%d" % group.id,
                        None,
                        group.name,
                        get_icon_css_class(group.id, group.user_id),
                        True,
                        self.node_type
                    )
                )
        else:
            group = ServerGroup.query.filter(ServerGroup.id == gid).first()

            if not group:
                return gone(
                    errormsg=gettext("Could not find the server group.")
                )

            nodes = self.blueprint.generate_browser_node(
                "%d" % (group.id), None,
                group.name,
                get_icon_css_class(group.id, group.user_id),
                True,
                self.node_type
            )

        return make_json_response(data=nodes)

    def node(self, gid):
        return self.nodes(gid)


ServerGroupView.register_node_view(blueprint)
