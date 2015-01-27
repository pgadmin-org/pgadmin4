##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for the About module."""

from flask import render_template, url_for

import config

def get_help_menu_items():
    """Return a (set) of dicts of help menu items, with name, priority, URL and 
    onclick code."""
    return [{'name': 'About %s' % (config.APP_NAME), 
             'priority': 999, 
             'url': "#", 
             'onclick': "about_show()"}]
    
def get_javascript_code():
    """Render from the template and return any Javascript code snippets required
    in the browser"""
    return render_template("about/browser.js")