##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Integration hooks for server groups."""

from flask import render_template, url_for
from flask.ext.babel import gettext
from flask.ext.security import current_user

from pgadmin.browser.utils import register_modules
from pgadmin.settings.settings_model import db, ServerGroup

from pgadmin.browser import all_nodes
from . import NODE_TYPE, sub_nodes

def register_submodules(app):
    """Register any child node blueprints"""
    register_modules(app, __file__, all_nodes, sub_nodes, 'pgadmin.browser.server_groups')

def get_nodes():
    """Return a JSON document listing the server groups for the user"""
    groups = ServerGroup.query.filter_by(user_id=current_user.id)
    # TODO: Move this JSON generation to a Server method
    # this code is duplicated somewhere else
    for group in groups:
        yield {
            "id": "%s/%d" % (NODE_TYPE, group.id),
            "label": group.name,
            "icon": "icon-%s" % NODE_TYPE,
            "inode": True,
            "_type": NODE_TYPE
        }

def get_standard_menu_items():
    """Return a (set) of dicts of standard menu items (create/drop/rename), with
    object type, action and the function name (no parens) to call on click."""
    return [
            {'type': 'server-group', 'action': 'drop', 'priority': 10, 'function': 'drop_server_group'},
            {'type': 'server-group', 'action': 'rename', 'priority': 20, 'function': 'rename_server_group'}
           ]


def get_create_menu_items():
    """Return a (set) of dicts of create menu items, with a Javascript array of
    object types on which the option should appear, name, label and the function
    name (no parens) to call on click."""
    return [
            {'type': "['server-group']", 'name': 'create_server_group', 'label': gettext('Server Group...'), 'priority': 10, 'function': 'create_server_group'}
           ]


def get_context_menu_items():
    """Return a (set) of dicts of content menu items with name, node type, label, priority and JS"""
    return [
            {'name': 'delete_server_group', 'type': NODE_TYPE, 'label': gettext('Delete server group'), 'priority': 10, 'onclick': 'drop_server_group(item);'},
            {'name': 'rename_server_group', 'type': NODE_TYPE, 'label': gettext('Rename server group...'), 'priority': 20, 'onclick': 'rename_server_group(item);'}
           ]


def get_script_snippets():
    """Return the script snippets needed to handle treeview node operations."""
    return render_template('server_groups/server_groups.js')


def get_css_snippets():
    """Return the CSS needed to display the treeview node image."""
    css = ".icon-server-group {\n"
    css += " background: url('%s') 0 0 no-repeat !important;\n" % \
            url_for('NODE-%s.static' % NODE_TYPE, filename='img/server-group.png')
    css += "}\n"

    return css
