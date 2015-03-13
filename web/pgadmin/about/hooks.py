##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for the About module."""

from flask import render_template, url_for
from flask.ext.babel import gettext

import config

def get_help_menu_items():
    """Return a (set) of dicts of help menu items, with name, priority, URL, 
    target and onclick code."""
    return [{'name': 'mnu_about',
             'label': gettext('About %(appname)s', appname=config.APP_NAME), 
             'priority': 999, 
             'url': "#", 
             'onclick': "about_show()"}]

def get_scripts():
    """Return a list of script URLs to include in the rendered page header"""
    return [ url_for('about.script') ]