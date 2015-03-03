##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for the Help module."""

from flask import url_for
from flask.ext.babel import gettext

import config

def get_help_menu_items():
    """Return a (set) of dicts of help menu items, with name, priority, URL, 
    target and onclick code."""
    return [{'name': 'mnu_online_help',
             'label': gettext('Online Help'), 
             'priority': 100, 
             'target': '_new',
             'url': url_for('help.static', filename='index.html') },
             
            {'name': 'mnu_pgadmin_website',
             'label': gettext('pgAdmin Website'), 
             'priority': 200, 
             'target': '_new',
             'url': 'http://www.pgadmin.org/' },
             
             {'name': 'mnu_postgresql_website',
             'label': gettext('PostgreSQL Website'), 
             'priority': 300, 
             'target': '_new',
             'url': 'http://www.postgresql.org/' }]
    
def get_panels():
    """Return a (set) of dicts describing panels to create in the browser. Fields
    are name, priority, title, width, height, isIframe, showTitle, isCloseable, 
    isPrivate and content"""
    return [{'name': 'pnl_online_help',
             'priority': 100,
             'title': gettext('Online Help'),
             'width': 500,
             'height': 600,
             'isIframe': True,
             'showTitle': True,
             'isCloseable': True,
             'isPrivate': False,
             'content': url_for('help.static', filename='index.html') },
             
            {'name': 'pnl_pgadmin_website',
             'priority': 200,
             'title': gettext('pgAdmin Website'),
             'width': 500,
             'height': 600,
             'isIframe': True,
             'showTitle': True,
             'isCloseable': True,
             'isPrivate': False,
             'content': 'http://www.pgadmin.org/' },
             
            {'name': 'pnl_postgresql_website',
             'priority': 300,
             'title': gettext('PostgreSQL Website'),
             'width': 500,
             'height': 600,
             'isIframe': True,
             'showTitle': True,
             'isCloseable': True,
             'isPrivate': False,
             'content': 'http://www.postgresql.org/' }]