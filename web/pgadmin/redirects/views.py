##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing URL redirects."""
MODULE_NAME = 'redirects'

import config
from flask import Blueprint, redirect, url_for
from flask.ext.security import login_required

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__)

@blueprint.route('/')
@login_required
def index():
    """Redirect users hitting the root to the browser"""
    return redirect(url_for('browser.index'))

@blueprint.route('/favicon.ico')
def favicon():
    """Redirect to the favicon"""
    return redirect(url_for('static', filename='favicon.ico'))
