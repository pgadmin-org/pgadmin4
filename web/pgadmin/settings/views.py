##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Views for setting and storing configuration options."""
MODULE_NAME = 'settings'

import config
from flask import Blueprint, abort, request
from flask.ext.security import login_required

from . import get_setting, store_setting

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, url_prefix='/' + MODULE_NAME)

@blueprint.route("/store", methods=['POST'])
@blueprint.route("/store/<setting>/<value>", methods=['GET'])
@login_required
def store(setting=None, value=None):
    """Store a configuration setting."""
    if request.method == 'POST':
        setting = request.form['setting']
        value = request.form['value']
        
    store_setting(setting, value)
    
    return ''

@blueprint.route("/get", methods=['POST'])
@blueprint.route("/get/<setting>", methods=['GET'])
@blueprint.route("/get/<setting>/<default>", methods=['GET'])
@login_required
def get(setting=None, default=None):
    """Get a configuration setting."""
    if request.method == 'POST':
        setting = request.form['setting']
        default = request.form['default']
        
    try:
        value = get_setting(setting, default)
    except:
        return ''
    
    return value
