##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser application hooks"""

import os, sys
import config

from pgadmin.browser.utils import register_modules
from pgadmin.browser import all_nodes
from . import sub_nodes

def register_submodules(app):
    """Register any child node blueprints"""
    register_modules(app, __file__, all_nodes, sub_nodes, 'pgadmin.browser')
