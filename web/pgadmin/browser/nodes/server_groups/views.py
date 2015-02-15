##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of server groups"""

NODE_NAME = 'server-group'

NODE_PATH = '/browser/' + NODE_NAME

import traceback
from flask import Blueprint, Response, current_app, request
from flask.ext.security import current_user, login_required

from utils.ajax import make_json_result
from pgadmin.settings.settings_model import db, ServerGroup
import config

# Initialise the module
blueprint = Blueprint("NODE-" + NODE_NAME, __name__, static_folder='static',  static_url_path='', template_folder='templates', url_prefix=NODE_PATH)

@blueprint.route('/add/', methods=['POST'])
@login_required
def add():
    """Add a server group node to the settings database"""
    success = 1
    errormsg = ''
    data = { }
    
    if request.form['name'] != '':
        servergroup = ServerGroup(user_id=current_user.id, name=request.form['name'])

        try:
            db.session.add(servergroup)
            db.session.commit()
        except Exception as e:
            success = 0
            errormsg = e.message

    else:
        success = 0
        errormsg = "No server group name was specified"
            
    if success == 1:
        data['id'] = servergroup.id
        data['name'] = servergroup.name
        
    value = make_json_result(success=success, 
                             errormsg=errormsg, 
                             info=traceback.format_exc(), 
                             result=request.form, 
                             data=data)
    
    resp = Response(response=value,
                    status=200,
                    mimetype="text/json")
    
    return resp
    