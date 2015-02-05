##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""
MODULE_NAME = 'utils'

import config
from flask import Blueprint, render_template
from flask.ext.security import login_required
from time import time, ctime

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, static_folder='static', template_folder='templates', url_prefix='/' + MODULE_NAME)

##########################################################################
# A special URL used to "ping" the server
##########################################################################
@blueprint.route("/ping")
def ping():
    """Generate a "PING" response to indicate that the server is alive."""
    return "PING"

