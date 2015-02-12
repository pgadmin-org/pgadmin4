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
from flask import Blueprint, Response, abort, request
from flask.ext.security import login_required

from . import get_setting, store_setting

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, url_prefix='/' + MODULE_NAME)

@blueprint.route("/store", methods=['POST'])
@blueprint.route("/store/<setting>/<value>", methods=['GET'])
@login_required
def store(setting=None, value=None):
    """Store a configuration setting, or if this is a POST request and a  
    count value is present, store multiple settings at once."""
    if request.method == 'POST':
        if 'count' in request.form:
            for x in range(int(request.form['count'])):
                store_setting(request.form['setting%d' % (x+1)], request.form['value%d' % (x+1)])
        else:
            store_setting(request.form['setting'], request.form['value'])
    else:
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
    
    resp = Response(response=value,
                    status=200,
                    mimetype="text/plain")
    
    return resp
