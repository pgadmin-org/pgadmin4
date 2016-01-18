##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser integration functions for settings."""

from flask import url_for
    
def get_scripts():
    """Return a list of script URLs to include in the rendered page header"""
    return [ url_for('settings.script') ]