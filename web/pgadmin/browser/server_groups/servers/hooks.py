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
    
    value = ''
    for server in servers:
        value += '{"id":"%s/%d","label":"%s","icon":"icon-%s","inode":true,"_type":"%s"},' % (NODE_TYPE, server.id, server.name, NODE_TYPE, NODE_TYPE)
    value = value[:-1]
    
    return value

    
def get_file_menu_items():
    """Return a (set) of dicts of file menu items, with name, priority, URL, 
    target and onclick code."""
    return [
            {'name': 'mnu_add_server', 'label': gettext('Add a server...'), 'priority': 50, 'url': '#', 'onclick': 'add_server()'},
            {'name': 'mnu_delete_server', 'label': gettext('Delete server'), 'priority': 60, 'url': '#', 'onclick': 'delete_server()'},
            {'name': 'mnu_rename_server', 'label': gettext('Rename server...'), 'priority': 70, 'url': '#', 'onclick': 'rename_server()'}
           ]


def get_context_menu_items():
    """Return a (set) of dicts of content menu items with name, node type, label, priority and JS"""
    return [
            {'name': 'delete_server', 'type': NODE_TYPE, 'label': gettext('Delete server'), 'priority': 50, 'onclick': 'delete_server(item);'},
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
