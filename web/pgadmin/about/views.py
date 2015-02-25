##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the about box."""
MODULE_NAME = 'about'

from flask import Blueprint, Response, current_app, render_template, __version__
from flask.ext.babel import gettext
from flask.ext.security import current_user, login_required

import sys

import config

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, static_folder='static',  static_url_path='', template_folder='templates', url_prefix='/' + MODULE_NAME)

##########################################################################
# A test page
##########################################################################
@blueprint.route("/")
@login_required
def index():
    """Render the about box."""
    info = { }
    info['python_version'] = sys.version
    info['flask_version'] = __version__
    if config.SERVER_MODE == True:
        info['app_mode'] = gettext('Server')
    else:
        info['app_mode'] = gettext('Desktop')
    info['current_user'] = current_user.email
    
    return render_template(MODULE_NAME + '/index.html', info=info)
    
@blueprint.route("/about.js")
@login_required
def script():
    """Render the required Javascript"""
    return Response(response=render_template("about/about.js"),
                    status=200,
                    mimetype="application/javascript")