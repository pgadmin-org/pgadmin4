##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Integration hooks for servers."""

from flask import render_template, url_for
from flask.ext.babel import gettext
from flask.ext.security import current_user

from pgadmin.settings.settings_model import db, Server
from . import NODE_TYPE

def get_nodes(server_group):
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


def get_standard_menu_items():
    """Return a (set) of dicts of standard menu items (create/drop/rename), with
    object type, action, priority and the function to call on click."""
    return [
            {'type': 'server', 'action': 'drop', 'priority': 50, 'function': 'drop_server'},
            {'type': 'server', 'action': 'rename', 'priority': 60, 'function': 'rename_server'}
           ]


def get_create_menu_items():
    """Return a (set) of dicts of create menu items, with a Javascript array of
    object types on which the option should appear, name, label, priority and
    the function name (no parens) to call on click."""
    return [
            {'type': "['server-group', 'server']", 'name': 'create_server', 'label': gettext('Server...'), 'priority': 50, 'function': 'create_server'}
           ]


def get_context_menu_items():
    """Return a (set) of dicts of content menu items with name, node type, label, priority and JS"""
    return [
            {'name': 'delete_server', 'type': NODE_TYPE, 'label': gettext('Delete server'), 'priority': 50, 'onclick': 'drop_server(item);'},
            {'name': 'rename_server', 'type': NODE_TYPE, 'label': gettext('Rename server...'), 'priority': 60, 'onclick': 'rename_server(item);'}
           ]


def get_script_snippets():
    """Return the script snippets needed to handle treeview node operations."""
    return render_template('servers/servers.js')


def get_css_snippets():
    """Return the CSS needed to display the treeview node image."""
    css = ".icon-server {\n"
    css += " background: url('%s') 0 0 no-repeat !important;\n" % \
            url_for('NODE-%s.static' % NODE_TYPE, filename='img/server.png')
    css += "}\n"

    return css
