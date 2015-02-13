##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the core pgAdmin browser."""
MODULE_NAME = 'browser'

from flask import Blueprint, current_app, render_template, url_for
from flaskext.gravatar import Gravatar
from flask.ext.security import login_required
from flask.ext.login import current_user
from inspect import getmoduleinfo, getmembers

from pgadmin import modules
from pgadmin.settings import get_setting

import config

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, static_folder='static', template_folder='templates', url_prefix='/' + MODULE_NAME)

##########################################################################
# A test page
##########################################################################
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
    help_items = [ ]
    stylesheets = [ ]
    scripts = [ ]
        
    # Add browser stylesheets
    stylesheets.append(url_for('static', filename='css/codemirror/codemirror.css'))
    stylesheets.append(url_for('browser.static', filename='css/browser.css'))
    stylesheets.append(url_for('browser.static', filename='css/aciTree/css/aciTree.css'))
    
    # Add browser scripts
    scripts.append(url_for('static', filename='js/codemirror/codemirror.js'))
    scripts.append(url_for('static', filename='js/codemirror/mode/sql.js'))
    scripts.append(url_for('browser.static', filename='js/aciTree/jquery.aciPlugin.min.js'))
    scripts.append(url_for('browser.static', filename='js/aciTree/jquery.aciTree.min.js'))
    
    for module in modules:
        # Get the edit menu items
        if 'browser' in dir(module) and 'get_file_menu_items' in dir(module.browser):
            file_items.extend(module.browser.get_file_menu_items())
    
        # Get the edit menu items
        if 'browser' in dir(module) and 'get_edit_menu_items' in dir(module.browser):
            edit_items.extend(module.browser.get_edit_menu_items())

        # Get the tools menu items
        if 'browser' in dir(module) and 'get_tools_menu_items' in dir(module.browser):
            tools_items.extend(module.browser.get_tools_menu_items())
    
        # Get the help menu items
        if 'browser' in dir(module) and 'get_help_menu_items' in dir(module.browser):
            help_items.extend(module.browser.get_help_menu_items())
        
        # Get any stylesheets
        if 'browser' in dir(module) and 'get_stylesheets' in dir(module.browser):
            stylesheets += module.browser.get_stylesheets()
                    
        # Get any scripts
        if 'browser' in dir(module) and 'get_scripts' in dir(module.browser):
            scripts += module.browser.get_scripts()

    file_items = sorted(file_items, key=lambda k: k['priority'])
    edit_items = sorted(edit_items, key=lambda k: k['priority'])
    tools_items = sorted(tools_items, key=lambda k: k['priority'])
    help_items = sorted(help_items, key=lambda k: k['priority'])
    
    # Get the layout settings
    layout_settings = { }
    layout_settings['sql_size'] = get_setting('Browser/SQLPane/Size', default=250)
    layout_settings['sql_closed'] = get_setting('Browser/SQLPane/Closed', default="false")
    layout_settings['browser_size'] = get_setting('Browser/BrowserPane/Size', default=250)
    layout_settings['browser_closed'] = get_setting('Browser/BrowserPane/Closed', default="false")
    
    return render_template(MODULE_NAME + '/index.html', 
                           username=current_user.email, 
                           file_items=file_items, 
                           edit_items=edit_items, 
                           tools_items=tools_items, 
                           help_items=help_items,
                           stylesheets = stylesheets,
                           scripts = scripts,
                           layout_settings = layout_settings)
