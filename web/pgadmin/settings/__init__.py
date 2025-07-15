##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for storing and retrieving user configuration settings."""
import json

from flask import Response, request, render_template, current_app
from flask_babel import gettext
from flask_login import current_user

from pgadmin.user_login_check import pga_login_required
from pgadmin.utils import PgAdminModule, get_complete_file_path
from pgadmin.utils.ajax import make_json_response, bad_request,\
    success_return, internal_server_error, make_response as ajax_response
from pgadmin.utils.menu import MenuItem

from pgadmin.model import db, Setting, ApplicationState
from pgadmin.utils.constants import MIMETYPE_APP_JS
from .utils import get_dialog_type, get_file_type_setting
from cryptography.fernet import Fernet
import hashlib

MODULE_NAME = 'settings'


class SettingsModule(PgAdminModule):
    def get_own_menuitems(self):
        return {
            'file_items': [
                MenuItem(
                    name='mnu_resetlayout',
                    priority=998,
                    module="pgAdmin.Settings",
                    callback='show',
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
            'settings.get_file_format_setting',
            'settings.save_application_state',
            'settings.get_application_state',
            'settings.delete_application_state',
            'settings.get_tool_data'
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


def get_workspace_layout():
    result = (Setting.query.filter(
        Setting.user_id == current_user.id,
        Setting.setting.ilike('Workspace/Layout%')).all())

    settings = {}
    for row in result:
        settings[row.setting] = row.value
    return settings


def get_layout():
    layout = {'Browser/Layout': get_setting('Browser/Layout', default='')}
    layout = {**layout, **get_workspace_layout()}
    return layout


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(errormsg=gettext("This URL cannot be called directly."))


@blueprint.route("/settings.js")
@pga_login_required
def script():
    """Render the required Javascript"""
    return Response(response=render_template("settings/settings.js"),
                    status=200,
                    mimetype=MIMETYPE_APP_JS)


@blueprint.route("/store", methods=['POST'], endpoint='store_bulk')
@blueprint.route("/store/<setting>/<value>", methods=['PUT'], endpoint='store')
@pga_login_required
def store(setting=None, value=None):
    """Store a configuration setting, or if this is a POST request and a
    count value is present, store multiple settings at once."""
    success = 1
    errormsg = ''

    try:
        data = request.form if request.form else json.loads(
            request.data.decode('utf-8'))
        if request.method == 'POST':
            if 'count' in request.form:
                for x in range(int(data['count'])):
                    store_setting(data['setting%d' % (
                        x + 1)], data['value%d' % (x + 1)])
            else:
                store_setting(data['setting'], data['value'])
        else:
            store_setting(setting, value)
    except Exception as e:
        success = 0
        errormsg = str(e)

    return make_json_response(success=success,
                              errormsg=errormsg,
                              info=gettext("Setting stored"))


@blueprint.route("/layout", methods=['DELETE'], endpoint='reset_layout')
@pga_login_required
def reset_layout():
    """Reset configuration setting"""

    try:
        if hasattr(request, 'params') and \
            request.params['setting'] in [
                'Browser/Layout', 'SQLEditor/Layout', 'Debugger/Layout']:
            db.session.query(Setting) \
                .filter(Setting.user_id == current_user.id) \
                .filter((Setting.setting == request.params['setting'])) \
                .delete()
        else:
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
@pga_login_required
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
@pga_login_required
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
@pga_login_required
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


@blueprint.route("/save_file_format_setting/",
                 endpoint="save_file_format_setting",
                 methods=['POST'])
@pga_login_required
def save_file_format_setting():
    """
    This function save the selected file format.save_file_format_setting
    :return: save file format response
    """
    data = request.form if request.form else json.loads(
        request.data.decode('utf-8'))
    file_type = get_dialog_type(data['allowed_file_types'])

    store_setting(file_type, data['last_selected_format'])
    return make_json_response(success=True,
                              info=data,
                              result=request.form)


@blueprint.route("/get_file_format_setting/",
                 endpoint="get_file_format_setting",
                 methods=['GET'])
@pga_login_required
def get_file_format_setting():
    """
    This function return the last selected file format
    :return: last selected file format
    """
    data = dict()
    for k, v in request.args.items():
        try:
            data[k] = json.loads(v)
        except (ValueError, TypeError, KeyError):
            data[k] = v

    return make_json_response(success=True,
                              info=get_file_type_setting(list(data.values())))


@blueprint.route(
    '/save_application_state',
    methods=["POST"], endpoint='save_application_state'
)
@pga_login_required
def save_application_state():
    """
    Expose an api to save the application state which stores the data from
    query tool, ERD, schema-diff, psql
    """
    data = json.loads(request.data)
    trans_id = data['trans_id']
    fernet = Fernet(current_app.config['SECRET_KEY'].encode())
    tool_data = fernet.encrypt(json.dumps(data['tool_data']).encode())
    connection_info = data['connection_info'] \
        if 'connection_info' in data else None
    if (connection_info and 'open_file_name' in connection_info and
            connection_info['open_file_name']):
        file_path = get_complete_file_path(connection_info['open_file_name'])
        connection_info['last_saved_file_hash'] = (
            get_last_saved_file_hash(file_path, trans_id))

    try:
        data_entry = ApplicationState(
            uid=current_user.id, id=trans_id,connection_info=connection_info,
            tool_data=tool_data)

        db.session.merge(data_entry)
        db.session.commit()
    except Exception as e:
        print(e)
        db.session.rollback()

    return make_json_response(
        data={
            'status': True,
            'msg': 'Success',
        })


def get_last_saved_file_hash(file_path, trans_id):
    result = db.session \
        .query(ApplicationState) \
        .filter(ApplicationState.uid == current_user.id,
                ApplicationState.id == trans_id).all()
    file_hash_update_require = True
    last_saved_file_hash = None

    for row in result:
        connection_info = row.connection_info
        if ('open_file_name' in connection_info and
                connection_info['open_file_name']):
            file_hash_update_require = not connection_info['is_editor_dirty']
            last_saved_file_hash = connection_info['last_saved_file_hash']

    if file_hash_update_require:
        last_saved_file_hash = compute_md5_hash_file(file_path)

    return last_saved_file_hash


@blueprint.route(
    '/get_application_state',
    methods=["GET"], endpoint='get_application_state')
@pga_login_required
def get_application_state():
    """
    Returns application state if any stored.
    """
    fernet = Fernet(current_app.config['SECRET_KEY'].encode())
    result = db.session \
        .query(ApplicationState) \
        .filter(ApplicationState.uid == current_user.id) \
        .all()

    res = []
    for row in result:
        connection_info = row.connection_info
        if (connection_info and 'open_file_name' in connection_info and
                connection_info['open_file_name']):
            file_path = get_complete_file_path(
                connection_info['open_file_name'])
            file_deleted = False if file_path else True
            connection_info['file_deleted'] = file_deleted

            if (not file_deleted and connection_info['is_editor_dirty'] and
                'last_saved_file_hash' in connection_info and
                    connection_info['last_saved_file_hash']):
                connection_info['external_file_changes'] = \
                    check_external_file_changes(
                        file_path, connection_info['last_saved_file_hash'])

        res.append({'connection_info': connection_info,
                    'tool_data': fernet.decrypt(row.tool_data).decode(),
                    'id': row.id
                    })
    return make_json_response(
        data={
            'status': True,
            'msg': '',
            'result': res
        }
    )


@blueprint.route(
    '/get_tool_data/<int:trans_id>',
    methods=["GET"], endpoint='get_tool_data')
@pga_login_required
def get_tool_data(trans_id):
    fernet = Fernet(current_app.config['SECRET_KEY'].encode())
    result = db.session \
        .query(ApplicationState) \
        .filter(ApplicationState.uid == current_user.id,
                ApplicationState.id == trans_id) \
        .first()

    if result:
        connection_info = result.connection_info
        tool_data = fernet.decrypt(result.tool_data).decode()

        if (connection_info and 'open_file_name' in connection_info and
                connection_info['open_file_name']):
            file_path = (
                get_complete_file_path(connection_info['open_file_name']))
            file_deleted = False if file_path else True
            connection_info['file_deleted'] = file_deleted

            if (not file_deleted and connection_info['is_editor_dirty'] and
                'last_saved_file_hash' in connection_info and
                    connection_info['last_saved_file_hash']):
                connection_info['external_file_changes'] = \
                    check_external_file_changes(
                        file_path, connection_info['last_saved_file_hash'])

            if not (file_deleted or connection_info['is_editor_dirty']):
                # Send tool data only if file is deleted or edited
                tool_data = None

        return make_json_response(
            data={
                'status': True,
                'msg': '',
                'result': {
                    'connection_info': connection_info,
                    'tool_data': tool_data,
                    'id': result.id
                }
            }
        )
    else:
        return (
            make_json_response(
                success=0,
                errormsg=gettext(
                    'There is no saved content available for this tab.'),
                status=404
            ))


@blueprint.route(
    '/delete_application_state/',
    methods=["DELETE"], endpoint='delete_application_state')
@pga_login_required
def delete_application_state():
    status = False
    msg = gettext('Unable to delete application state data.')
    if request.data:
        data = json.loads(request.data)
        if 'trans_ids' in data:
            for trans_id in data['trans_ids']:
                status, msg = delete_tool_data(trans_id)
        else:
            trans_id = int(data['panelId'].split('_')[-1])
            status, msg = delete_tool_data(trans_id)
    return make_json_response(
        data={
            'status': status,
            'msg': msg,
        }
    )


def delete_tool_data(trans_id=None):
    try:
        if trans_id:
            results = db.session \
                .query(ApplicationState) \
                .filter(ApplicationState.uid == current_user.id,
                        ApplicationState.id == trans_id) \
                .all()
        else:
            results = db.session \
                .query(ApplicationState) \
                .filter(ApplicationState.uid == current_user.id) \
                .all()
        for result in results:
            db.session.delete(result)
        db.session.commit()
        return True, 'Success'
    except Exception as e:
        db.session.rollback()
        return False, str(e)


def compute_md5_hash_file(file_path, chunk_size=8192):
    """Compute md5 hash for large files by reading in chunks."""
    md5_hash = hashlib.md5()

    # Open the file in binary mode
    with open(file_path, "rb") as file:
        # Read and hash in 8 KB chunks (can adjust the chunk size if needed)
        for chunk in iter(lambda: file.read(chunk_size), b""):
            md5_hash.update(chunk)

    return md5_hash.hexdigest()


def check_external_file_changes(file_path, last_saved_file_hash):
    current_file_hash = compute_md5_hash_file(file_path)
    if current_file_hash != last_saved_file_hash:
        return True
    return False
