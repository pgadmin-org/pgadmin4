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

import config

def get_help_menu_items():
    """Return a (set) of dicts of help menu items, with name, priority, URL, 
    target and onclick code."""
    return [{'name': 'mnu_contents',
             'label': 'Contents', 
             'priority': 1, 
             'target': '_new',
             'url': url_for('help.static', filename='index.html') }]