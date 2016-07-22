##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for storing and retrieving user configuration settings."""

import traceback

from flask import Response, request, render_template, url_for
from flask_babel import gettext
from flask_login import current_user
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, bad_request
from pgadmin.utils.menu import MenuItem

from pgadmin.model import db, Setting

MODULE_NAME = 'settings'


class SettingsModule(PgAdminModule):
    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.settings',
            'path': url_for('settings.index') + 'settings',
            'when': None
        }]

    def get_own_menuitems(self):
        return {
            'file_items': [
                MenuItem(name='mnu_resetlayout',
                         priority=999,
                         module="pgAdmin.Settings",
                         callback='show',
                         icon='fa fa-retweet',
                         label=gettext('Reset Layout'))
            ]
        }


blueprint = SettingsModule(MODULE_NAME, __name__)


def store_setting(setting, value):
    """Set a configuration setting for the current user."""
    data = Setting(user_id=current_user.id, setting=setting, value=value)

    db.session.merge(data)
    db.session.commit()


def get_setting(setting, default=None):
    """Retrieve a configuration setting for the current user, or return the
    default value specified by the caller."""
    data = Setting.query.filter_by(user_id=current_user.id, setting=setting).first()

    if not data or data.value is None:
        return default
    else:
        return data.value


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL can not be called directly."))


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
    errormsg = ''

    try:
        if request.method == 'POST':
            if 'count' in request.form:
                for x in range(int(request.form['count'])):
                    store_setting(request.form['setting%d' % (x + 1)], request.form['value%d' % (x + 1)])
            else:
                store_setting(request.form['setting'], request.form['value'])
        else:
            store_setting(setting, value)
    except Exception as e:
        success = 0
        errormsg = e.message

    try:
        info = traceback.format_exc()
    except Exception as e:
        info = str(e)

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=info,
                              result=request.form)


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
    errormsg = ''

    try:
        value = get_setting(setting, default)
    except Exception as e:
        success = 0
        errormsg = e.message

    try:
        info = traceback.format_exc()
    except Exception as e:
        info = str(e)

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=info,
                              result=request.form)


@blueprint.route("/reset_layout", methods=['DELETE'])
@login_required
def reset_layout():
    """Reset configuration setting"""

    # There can be only one record at most
    data = Setting.query.filter_by(user_id=current_user.id).first()
    try:
        if data is not None:
            db.session.delete(data)
            db.session.commit()
    except Exception as e:
        return make_json_response(
            status=410, success=0, errormsg=str(e)
        )

    return make_json_response(result=request.form)
