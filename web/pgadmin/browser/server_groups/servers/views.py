##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of servers"""

from flask import Blueprint, request
from flask.ext.babel import gettext
from flask.ext.security import current_user, login_required

from . import NODE_TYPE, NODE_PATH
from pgadmin.utils.ajax import make_json_response
from pgadmin.settings.settings_model import db, Server
import traceback

# Initialise the module
blueprint = Blueprint("NODE-" + NODE_TYPE, __name__,
                      static_folder='static',
                      static_url_path='',
                      template_folder='templates',
                      url_prefix=NODE_PATH)


@blueprint.route('/add/', methods=['POST'])
@login_required
def add():
    """Add a server node to the settings database"""
    success = 1
    errormsg = ''
    data = {}

    success = False
    errormsg = ''
    if request.form['name'] != '':
        server = Server(user_id=current_user.id, name=request.form['name'])
        try:
            db.session.add(server)
            db.session.commit()
            success = True
        except Exception as e:
            errormsg = e.message
    else:
        errormsg = gettext('No server name was specified')

    if success:
        data['id'] = server.id
        data['name'] = server.name

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form,
                              data=data)

@blueprint.route('/delete/', methods=['POST'])
@login_required
def delete():
    """Delete a server node in the settings database"""
    success = 1
    errormsg = ''

    if request.form['id'] != '':
        # There can be only one record at most
        servergroup = Server.query.filter_by(user_id=current_user.id, id=int(request.form['id'])).first()

        if server is None:
            success = 0
            errormsg = gettext('The specified server could not be found.')
        else:
            try:
                db.session.delete(server)
                db.session.commit()
            except Exception as e:
                success = 0
                errormsg = e.message

    else:
        success = 0
        errormsg = gettext('No server was specified.')

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form)

@blueprint.route('/rename/', methods=['POST'])
@login_required
def rename():
    """Rename a server node in the settings database"""
    success = 1
    errormsg = ''

    if request.form['id'] != '':
        # There can be only one record at most
        servergroup = Server.query.filter_by(user_id=current_user.id, id=int(request.form['id'])).first()

        if server is None:
            success = 0
            errormsg = gettext('The specified server could not be found.')
        else:
            try:
                server.name = request.form['name']
                db.session.commit()
            except Exception as e:
                success = 0
                errormsg = e.message

    else:
        success = 0
        errormsg = gettext('No server was specified.')

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=traceback.format_exc(),
                              result=request.form)

