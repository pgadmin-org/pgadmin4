##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for the About module."""

from flask import url_for

import config

def get_help_menu_items():
    """Return a (set) of dicts of help menu items, with name, priority and URL."""
    return [{'name': 'About %s' % (config.APP_NAME), 'priority': 999, 'url': url_for('about.index')}]