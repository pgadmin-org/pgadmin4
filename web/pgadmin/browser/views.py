##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the core pgAdmin browser."""
MODULE_NAME = 'browser'

from flask import Blueprint, Response, current_app, render_template, url_for
from flaskext.gravatar import Gravatar
from flask.ext.security import login_required
from flask.ext.login import current_user
from inspect import getmoduleinfo, getmembers

from . import nodes
from pgadmin import modules
from pgadmin.settings import get_setting

import config

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, static_folder='static', template_folder='templates', url_prefix='/' + MODULE_NAME)

@blueprint.route("/")
@login_required
def index():
    """Render and process the main browser window."""
    # Get the Gravatar
    gravatar = Gravatar(current_app,
                        size=100,
                        rating='g',
                        default='retro',
                        force_default=False,
                        use_ssl=False,
                        base_url=None)

    # Get the plugin elements from the module
    file_items = [ ]
    edit_items = [ ]
    tools_items = [ ]
    management_items = [ ]
    help_items = [ ]
    stylesheets = [ ]
    scripts = [ ]

    modules_and_nodes = modules + nodes
        
    # Add browser stylesheets
    stylesheets.append(url_for('static', filename='css/codemirror/codemirror.css'))
    stylesheets.append(url_for('browser.static', filename='css/browser.css'))
    stylesheets.append(url_for('browser.static', filename='css/aciTree/css/aciTree.css'))
    stylesheets.append(url_for('browser.static', filename='css/jQuery-contextMenu/jQuery.contextMenu.css'))
    stylesheets.append(url_for('browser.browser_css'))
    
    # Add browser scripts
    scripts.append(url_for('static', filename='js/codemirror/codemirror.js'))
    scripts.append(url_for('static', filename='js/codemirror/mode/sql.js'))
    scripts.append(url_for('browser.static', filename='js/aciTree/jquery.aciPlugin.min.js'))
    scripts.append(url_for('browser.static', filename='js/aciTree/jquery.aciTree.dom.js'))
    scripts.append(url_for('browser.static', filename='js/aciTree/jquery.aciTree.min.js'))
    scripts.append(url_for('browser.static', filename='js/jQuery-contextMenu/jquery.ui.position.js'))
    scripts.append(url_for('browser.static', filename='js/jQuery-contextMenu/jQuery.contextMenu.js'))
    scripts.append(url_for('browser.browser_js'))
    
    for module in modules_and_nodes:
        # Get the edit menu items
        if 'hooks' in dir(module) and 'get_file_menu_items' in dir(module.hooks):
            file_items.extend(module.hooks.get_file_menu_items())
    
        # Get the edit menu items
        if 'hooks' in dir(module) and 'get_edit_menu_items' in dir(module.hooks):
            edit_items.extend(module.hooks.get_edit_menu_items())

        # Get the tools menu items
        if 'hooks' in dir(module) and 'get_tools_menu_items' in dir(module.hooks):
            tools_items.extend(module.hooks.get_tools_menu_items())

        # Get the management menu items
        if 'hooks' in dir(module) and 'get_management_menu_items' in dir(module.hooks):
            management_items.extend(module.hooks.get_management_menu_items())
                
        # Get the help menu items
        if 'hooks' in dir(module) and 'get_help_menu_items' in dir(module.hooks):
            help_items.extend(module.hooks.get_help_menu_items())
                    
        # Get any stylesheets
        if 'hooks' in dir(module) and 'get_stylesheets' in dir(module.hooks):
            stylesheets += module.hooks.get_stylesheets()
                    
        # Get any scripts
        if 'hooks' in dir(module) and 'get_scripts' in dir(module.hooks):
            scripts += module.hooks.get_scripts()

    file_items = sorted(file_items, key=lambda k: k['priority'])
    edit_items = sorted(edit_items, key=lambda k: k['priority'])
    tools_items = sorted(tools_items, key=lambda k: k['priority'])
    management_items = sorted(management_items, key=lambda k: k['priority'])
    help_items = sorted(help_items, key=lambda k: k['priority'])
    
    return render_template(MODULE_NAME + '/index.html', 
                           username=current_user.email, 
                           file_items=file_items, 
                           edit_items=edit_items, 
                           tools_items=tools_items, 
                           management_items=management_items,
                           help_items=help_items,
                           stylesheets = stylesheets,
                           scripts = scripts)

@blueprint.route("/browser.js")
@login_required
def browser_js():
    """Render and return JS snippets from the nodes and modules."""
    snippets = ''
    modules_and_nodes = modules + nodes
    
    # Load the core browser code first
    
    # Get the context menu items
    context_items = [ ]
    modules_and_nodes = modules + nodes
    
    for module in modules_and_nodes:
        if 'hooks' in dir(module) and 'get_context_menu_items' in dir(module.hooks):
            context_items.extend(module.hooks.get_context_menu_items())

    context_items = sorted(context_items, key=lambda k: k['priority'])
    
    layout_settings = { }
    layout_settings['sql_size'] = get_setting('Browser/SQLPane/Size', default=250)
    layout_settings['sql_closed'] = get_setting('Browser/SQLPane/Closed', default="false")
    layout_settings['browser_size'] = get_setting('Browser/BrowserPane/Size', default=250)
    layout_settings['browser_closed'] = get_setting('Browser/BrowserPane/Closed', default="false")
    
    snippets += render_template('browser/js/browser.js', 
                                layout_settings=layout_settings,
                                context_items=context_items)
    
    # Add module and node specific code
    for module in modules_and_nodes:
        if 'hooks' in dir(module) and 'get_script_snippets' in dir(module.hooks):
            snippets += module.hooks.get_script_snippets()
    
    resp = Response(response=snippets,
                status=200,
                mimetype="application/javascript")
    
    return resp

@blueprint.route("/browser.css")
@login_required
def browser_css():
    """Render and return CSS snippets from the nodes and modules."""
    snippets = ''
    modules_and_nodes = modules + nodes
    
    for module in modules_and_nodes:
        if 'hooks' in dir(module) and 'get_css_snippets' in dir(module.hooks):
            snippets += module.hooks.get_css_snippets()
            
    resp = Response(response=snippets,
                status=200,
                mimetype="text/css")
    
    return resp


@blueprint.route("/root-nodes.json")
@login_required
def get_nodes():
    """Build a list of treeview nodes from the child modules."""
    value = '['
    
    for node in nodes:
        if 'hooks' in dir(node) and 'get_nodes' in dir(node.hooks):
            value += node.hooks.get_nodes() + ','
        
    if value[-1:] == ',':
        value = value[:-1]
        
    value += ']'
    
    resp = Response(response=value,
                status=200,
                mimetype="text/json")
    
    return resp
    
        
        