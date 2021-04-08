##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for storing and retrieving user configuration settings."""

import traceback
import json

from flask import Response, request, render_template, url_for, current_app
from flask_babelex import gettext
from flask_login import current_user
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, bad_request,\
    success_return, internal_server_error
from pgadmin.utils.menu import MenuItem

from pgadmin.model import db, Setting
from pgadmin.utils.constants import MIMETYPE_APP_JS

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
                MenuItem(
                    name='mnu_resetlayout',
                    priority=998,
                    module="pgAdmin.Settings",
                    callback='show',
                    icon='fa fa-retweet',
                    label=gettext('Reset Layout')
                )
            ]
        }

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return [
            'settings.store', 'settings.store_bulk', 'settings.reset_layout',
            'settings.save_tree_state', 'settings.get_tree_state',
            'settings.reset_tree_state',
            'settings.save_file_format_setting',
            'settings.get_file_format_setting'
        ]


blueprint = SettingsModule(MODULE_NAME, __name__)


def store_setting(setting, value):
    """Set a configuration setting for the current user."""
    data = Setting(user_id=current_user.id, setting=setting, value=value)

    db.session.merge(data)
    db.session.commit()


def get_setting(setting, default=''):
    """Retrieve a configuration setting for the current user, or return the
    default value specified by the caller."""
    data = Setting.query.filter_by(
        user_id=current_user.id, setting=setting).first()

    if not data or data.value is None:
        return default
    else:
        return data.value


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=gettext("This URL cannot be called directly."))


@blueprint.route("/settings.js")
@login_required
def script():
    """Render the required Javascript"""
    return Response(response=render_template("settings/settings.js"),
                    status=200,
                    mimetype=MIMETYPE_APP_JS)


@blueprint.route("/store", methods=['POST'], endpoint='store_bulk')
@blueprint.route("/store/<setting>/<value>", methods=['PUT'], endpoint='store')
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
                    store_setting(request.form['setting%d' % (
                        x + 1)], request.form['value%d' % (x + 1)])
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


@blueprint.route("/layout", methods=['DELETE'], endpoint='reset_layout')
@login_required
def reset_layout():
    """Reset configuration setting"""

    try:
        db.session.query(Setting) \
            .filter(Setting.user_id == current_user.id)\
            .filter((Setting.setting == 'Browser/Layout') |
                    (Setting.setting == 'SQLEditor/Layout') |
                    (Setting.setting == 'Debugger/Layout'))\
            .delete()

        db.session.commit()
    except Exception as e:
        return make_json_response(
            status=410, success=0, errormsg=str(e)
        )

    return make_json_response(result=request.form)


@blueprint.route("/reset_tree_state", methods=['DELETE'],
                 endpoint='reset_tree_state')
@login_required
def reset_tree_state():
    """Reset the saved tree state."""

    data = Setting.query.filter_by(user_id=current_user.id,
                                   setting='browser_tree_state').first()
    try:
        if data is not None:
            db.session.delete(data)
            db.session.commit()
    except Exception as e:
        return make_json_response(
            status=410, success=0, errormsg=str(e)
        )

    return success_return()


@blueprint.route("/save_tree_state/", endpoint="save_tree_state",
                 methods=['POST'])
@login_required
def save_browser_tree_state():
    """Save the browser tree state."""
    data = request.form if request.form else request.data.decode('utf-8')
    old_data = get_setting('browser_tree_state')

    if old_data and old_data != 'null':
        if data:
            data = json.loads(data)

        old_data = json.loads(old_data)

        old_data.update(data)
        new_data = json.dumps(old_data)
    else:
        new_data = data

    try:
        store_setting('browser_tree_state', new_data)
    except Exception as e:
        current_app.logger.exception(e)
        return internal_server_error(errormsg=str(e))

    return success_return()


@blueprint.route("/get_tree_state/", endpoint="get_tree_state",
                 methods=['GET'])
@login_required
def get_browser_tree_state():
    """Get the browser tree state."""

    try:
        data = get_setting('browser_tree_state')
    except Exception as e:
        current_app.logger.exception(e)
        return internal_server_error(errormsg=str(e))

    return Response(response=data,
                    status=200,
                    mimetype="application/json")


def _get_dialog_type(file_type):
    """
    This function return dialog type
    :param file_type:
    :return: dialog type.
    """
    if 'pgerd' in file_type:
        return 'erd_file_type'
    elif 'backup' in file_type:
        return 'backup_file_type'
    elif 'csv' in file_type and 'txt' in file_type:
        return 'import_export_file_type'
    elif 'csv' in file_type and 'txt' not in file_type:
        return 'storage_manager_file_type'
    else:
        return 'sqleditor_file_format'


@blueprint.route("/save_file_format_setting/",
                 endpoint="save_file_format_setting",
                 methods=['POST'])
@login_required
def save_file_format_setting():
    """
    This function save the selected file format.
    :return: save file format response
    """
    data = request.form if request.form else json.loads(
        request.data.decode('utf-8'))
    file_type = _get_dialog_type(data['allowed_file_types'])

    store_setting(file_type, data['selectedFormat'])
    return make_json_response(success=True,
                              info=data,
                              result=request.form)


@blueprint.route("/get_file_format_setting/",
                 endpoint="get_file_format_setting",
                 methods=['GET'])
@login_required
def get_file_format_setting():
    """
    This function return the last selected file format
    :return: last selected file format
    """
    data = dict()
    for k, v in request.args.items():
        try:
            data[k] = json.loads(v, encoding='utf-8')
        except (ValueError, TypeError, KeyError):
            data[k] = v

    file_type = _get_dialog_type(list(data.values()))

    data = Setting.query.filter_by(
        user_id=current_user.id, setting=file_type).first()
    if data is None:
        return make_json_response(success=True, info='*')
    else:
        return make_json_response(success=True, info=data.value)
