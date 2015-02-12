##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for settings."""

from flask import render_template
    
def get_javascript_code():
    """Render from the template and return any Javascript code snippets required
    in the browser"""
    return render_template("settings/browser.js")