##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for the Test module."""

from flask import url_for

def get_file_menu_items():
    """Return a (set) of dicts of file menu items, with name, priority and URL."""
    return [{'name': 'Generated Test HTML', 'priority': 100, 'url': url_for('test.generated')}]