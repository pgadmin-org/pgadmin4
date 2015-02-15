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

import traceback
from flask import Blueprint, Response, abort, request, render_template
from flask.ext.security import login_required

import config
from utils.ajax import make_json_result
from . import get_setting, store_setting

# Initialise the module
blueprint = Blueprint(MODULE_NAME, __name__, template_folder='templates', url_prefix='/' + MODULE_NAME)

@blueprint.route("/settings.js")
@login_required
def script():
    """Render the required Javascript"""
    return Response(response=render_template("settings/settings.js"),
                    status=200,
                    mimetype="application/javascript")
    
@blueprint.route("/store", methods=['POST'])
@blueprint.route("/store/<setting>/<value>", methods=['GET'])
@login_required
def store(setting=None, value=None):
    """Store a configuration setting, or if this is a POST request and a  
    count value is present, store multiple settings at once."""
    success = 1
    errorcode = 0
    errormsg = ''
    
    try:
        if request.method == 'POST':
            if 'count' in request.form:
                for x in range(int(request.form['count'])):
                    store_setting(request.form['setting%d' % (x+1)], request.form['value%d' % (x+1)])
            else:
                store_setting(request.form['setting'], request.form['value'])
        else:
            store_setting(setting, value)
    except Exception as e:
        success = 0
        errormsg = e.message
        
    value = make_json_result(success=success, errormsg=errormsg, info=traceback.format_exc(), result=request.form)
    
    resp = Response(response=value,
                    status=200,
                    mimetype="text/json")
    
    return resp

@blueprint.route("/get", methods=['POST'])
@blueprint.route("/get/<setting>", methods=['GET'])
@blueprint.route("/get/<setting>/<default>", methods=['GET'])
@login_required
def get(setting=None, default=None):
    """Get a configuration setting."""
    if request.method == 'POST':
        setting = request.form['setting']
        default = request.form['default']
    
    success = 1
    errorcode = 0
    errormsg = ''
    
    try:
        value = get_setting(setting, default)
    except Exception as e:
        success = 0
        errormsg = e.message

    value = make_json_result(success=success, errormsg=errormsg, info=traceback.format_exc(), result=request.form)
        
    resp = Response(response=value,
                    status=200,
                    mimetype="text/json")
    
    return resp
