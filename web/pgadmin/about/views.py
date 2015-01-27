##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2014, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the about box."""
MODULE_NAME = 'about'

import config
from flask import Blueprint, current_app, render_template
from flask.ext.security import login_required

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, static_folder='static',  static_url_path='', template_folder='templates', url_prefix='/' + MODULE_NAME)

##########################################################################
# A test page
##########################################################################
@blueprint.route("/")
@login_required
def index():
    """Render the about box."""
    return render_template(MODULE_NAME + '/index.html')
