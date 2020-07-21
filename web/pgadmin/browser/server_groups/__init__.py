##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of server groups"""

import simplejson as json
from abc import ABCMeta, abstractmethod

import six
from flask import request, jsonify
from flask_babelex import gettext
from flask_security import current_user, login_required
from pgadmin.browser import BrowserPluginModule
from pgadmin.browser.utils import NodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response, bad_request
from pgadmin.utils.menu import MenuItem
from sqlalchemy import exc
from pgadmin.model import db, ServerGroup


class ServerGroupModule(BrowserPluginModule):
    _NODE_TYPE = "server_group"

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


class ServerGroupMenuItem(MenuItem):
    def __init__(self, **kwargs):
        kwargs.setdefault("type", ServerGroupModule.node_type)
        super(ServerGroupMenuItem, self).__init__(**kwargs)


@six.add_metaclass(ABCMeta)
class ServerGroupPluginModule(BrowserPluginModule):
    """
    Base class for server group plugins.
    """

    @abstractmethod
    def get_nodes(self, *arg, **kwargs):
        pass


blueprint = ServerGroupModule(__name__)


class ServerGroupView(NodeView):
    node_type = ServerGroupModule._NODE_TYPE
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
                "icon-%s" % self.node_type,
                True,
                self.node_type,
                can_delete=True  # This is user created hence can deleted
            )
        )

    @login_required
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

    @login_required
    def create(self):
        """Creates new server-group """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
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
                        "%d" % sg.id,
                        None,
                        sg.name,
                        "icon-%s" % self.node_type,
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

    @login_required
    def nodes(self, gid=None):
        """Return a JSON document listing the server groups for the user"""
        nodes = []

        if gid is None:
            groups = ServerGroup.query.filter_by(user_id=current_user.id)

            for group in groups:
                nodes.append(
                    self.blueprint.generate_browser_node(
                        "%d" % group.id,
                        None,
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
                return gone(
                    errormsg=gettext("Could not find the server group.")
                )

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
