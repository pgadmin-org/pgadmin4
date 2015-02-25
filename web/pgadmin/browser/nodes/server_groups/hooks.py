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

from pgadmin.settings.settings_model import db, ServerGroup

def get_nodes():
    """Return a JSON document listing the server groups for the user"""
    groups = ServerGroup.query.filter_by(user_id=current_user.id)
    
    value = ''
    for group in groups:
        value += '{"id":%d,"label":"%s","icon":"icon-server-group","inode":true},' % (group.id, group.name)
    value = value[:-1]
    
    return value

    
def get_file_menu_items():
    """Return a (set) of dicts of file menu items, with name, priority, URL, 
    target and onclick code."""
    return [
            {'name': 'mnu_add_server_group', 'label': gettext('Add a server group...'), 'priority': 10, 'url': '#', 'onclick': 'add_server_group()'},
            {'name': 'mnu_delete_server_group', 'label': gettext('Delete server group'), 'priority': 20, 'url': '#', 'onclick': 'delete_server_group()'},
            {'name': 'mnu_rename_server_group', 'label': gettext('Rename server group...'), 'priority': 30, 'url': '#', 'onclick': 'rename_server_group()'}
           ]


def get_context_menu_items():
    """Return a (set) of dicts of content menu items with name, label, priority and JS"""
    return [
            {'name': 'delete', 'label': gettext('Delete server group'), 'priority': 100, 'onclick': 'delete_server_group(item);'},
            {'name': 'rename', 'label': gettext('Rename server group...'), 'priority': 200, 'onclick': 'rename_server_group(item);'}
           ]
    
    
def get_script_snippets():
    """Return the script snippets needed to handle treeview node operations."""
    return render_template('server_groups/server_groups.js')


def get_css_snippets():
    """Return the CSS needed to display the treeview node image."""
    css = ".icon-server-group {\n"
    css += " background: url('%s') 0 0 no-repeat !important;\n" % \
            url_for('NODE-server-group.static', filename='img/server-group.png')
    css += "{"
    
    return css
