##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the pgAdmin help system."""
MODULE_NAME = 'help'

from flask import Blueprint

import config

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, static_url_path='/help', static_folder=config.HELP_PATH)
