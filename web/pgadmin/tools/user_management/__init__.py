##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements pgAdmin4 User Management Utility"""

import simplejson as json
import re

from flask import render_template, request, \
    url_for, Response, abort, current_app
from flask_babelex import gettext as _
from flask_security import login_required, roles_required, current_user
from flask_security.utils import encrypt_password
from werkzeug.exceptions import InternalServerError

import config
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_response as ajax_response, \
    make_json_response, bad_request, internal_server_error, forbidden
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.utils.validation_utils import validate_email
from pgadmin.model import db, Role, User, UserPreference, Server, \
    ServerGroup, Process, Setting

# set template path for sql scripts
MODULE_NAME = 'user_management'
server_info = {}


class UserManagementModule(PgAdminModule):
    """
    class UserManagementModule(Object):

        It is a utility which inherits PgAdminModule
        class and define methods to load its own
        javascript file.
    """

    LABEL = _('Users')

    def get_own_javascripts(self):
        """"
        Returns:
            list: js files used by this module
        """
        return [{
            'name': 'pgadmin.tools.user_management',
            'path': url_for('user_management.index') + 'user_management',
            'when': None
        }, {
            'name': 'pgadmin.user_management.current_user',
            'path': url_for('user_management.index') + 'current_user',
            'when': None,
            'is_template': True
        }]

    def show_system_objects(self):
        """
        return system preference objects
        """
        return self.pref_show_system_objects

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for backup module
        """
        return [
            'user_management.roles', 'user_management.role',
            'user_management.update_user', 'user_management.delete_user',
            'user_management.create_user', 'user_management.users',
            'user_management.user', current_app.login_manager.login_view,
            'user_management.auth_sources', 'user_management.auth_sources'
        ]


# Create blueprint for BackupModule class
blueprint = UserManagementModule(
    MODULE_NAME, __name__, static_url_path=''
)


def validate_password(data, new_data):
    """
    Check password new and confirm password match. If both passwords are not
    match raise exception.
    :param data: Data.
    :param new_data: new data dict.
    """
    if ('newPassword' in data and data['newPassword'] != "" and
            'confirmPassword' in data and data['confirmPassword'] != ""):

        if data['newPassword'] == data['confirmPassword']:
            new_data['password'] = encrypt_password(data['newPassword'])
        else:
            raise InternalServerError(_("Passwords do not match."))


def validate_user(data):
    new_data = dict()

    validate_password(data, new_data)

    if 'email' in data and data['email'] and data['email'] != "":
        if validate_email(data['email']):
            new_data['email'] = data['email']
        else:
            raise InternalServerError(_("Invalid email address."))

    if 'role' in data and data['role'] != "":
        new_data['roles'] = int(data['role'])

    if 'active' in data and data['active'] != "":
        new_data['active'] = data['active']

    if 'username' in data and data['username'] != "":
        new_data['username'] = data['username']

    if 'auth_source' in data and data['auth_source'] != "":
        new_data['auth_source'] = data['auth_source']

    return new_data


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route("/user_management.js")
@login_required
def script():
    """render own javascript"""
    return Response(
        response=render_template(
            "user_management/js/user_management.js", _=_,
            is_admin=current_user.has_role("Administrator"),
            user_id=current_user.id
        ),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


@blueprint.route("/current_user.js")
@pgCSRFProtect.exempt
@login_required
def current_user_info():

    return Response(
        response=render_template(
            "user_management/js/current_user.js",
            is_admin='true' if current_user.has_role(
                "Administrator") else 'false',
            user_id=current_user.id,
            email=current_user.email,
            name=(
                current_user.username.split('@')[0] if
                config.SERVER_MODE is True
                else 'postgres'
            ),
            allow_save_password='true' if config.ALLOW_SAVE_PASSWORD
            else 'false',
            allow_save_tunnel_password='true'
            if config.ALLOW_SAVE_TUNNEL_PASSWORD else 'false',
            auth_sources=config.AUTHENTICATION_SOURCES,
        ),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


@blueprint.route(
    '/user/', methods=['GET'], defaults={'uid': None}, endpoint='users'
)
@blueprint.route('/user/<int:uid>', methods=['GET'], endpoint='user')
@roles_required('Administrator')
def user(uid):
    """

    Args:
      uid: User id

    Returns: List of pgAdmin4 users or single user if uid is provided.

    """

    if uid:
        u = User.query.get(uid)

        res = {'id': u.id,
               'username': u.username,
               'email': u.email,
               'active': u.active,
               'role': u.roles[0].id,
               'auth_source': u.auth_source
               }
    else:
        users = User.query.all()

        users_data = []
        for u in users:
            users_data.append({'id': u.id,
                               'username': u.username,
                               'email': u.email,
                               'active': u.active,
                               'role': u.roles[0].id,
                               'auth_source': u.auth_source
                               })

        res = users_data

    return ajax_response(
        response=res,
        status=200
    )


@blueprint.route('/user/', methods=['POST'], endpoint='create_user')
@roles_required('Administrator')
def create():
    """

    Returns:

    """
    data = request.form if request.form else json.loads(
        request.data, encoding='utf-8'
    )

    status, res = create_user(data)

    if not status:
        return internal_server_error(errormsg=res)

    return ajax_response(
        response=res,
        status=200
    )


def _create_new_user(new_data):
    """
    Create new user.
    :param new_data: Data from user creation.
    :return: Return new created user.
    """
    auth_source = new_data['auth_source'] if 'auth_source' in new_data \
        else current_app.PGADMIN_DEFAULT_AUTH_SOURCE
    username = new_data['username'] if \
        'username' in new_data and auth_source != \
        current_app.PGADMIN_DEFAULT_AUTH_SOURCE else new_data['email']
    email = new_data['email'] if 'email' in new_data else None
    password = new_data['password'] if 'password' in new_data else None

    usr = User(username=username,
               email=email,
               roles=new_data['roles'],
               active=new_data['active'],
               password=password,
               auth_source=auth_source)
    db.session.add(usr)
    db.session.commit()
    # Add default server group for new user.
    server_group = ServerGroup(user_id=usr.id, name="Servers")
    db.session.add(server_group)
    db.session.commit()

    return usr


def create_user(data):
    if 'auth_source' in data and data['auth_source'] != \
            current_app.PGADMIN_DEFAULT_AUTH_SOURCE:
        req_params = ('username', 'role', 'active', 'auth_source')
    else:
        req_params = ('email', 'role', 'active', 'newPassword',
                      'confirmPassword')

    for f in req_params:
        if f in data and data[f] != '':
            continue
        else:
            return False, _("Missing field: '{0}'").format(f)

    try:
        new_data = validate_user(data)

        if 'roles' in new_data:
            new_data['roles'] = [Role.query.get(new_data['roles'])]

    except Exception as e:
        return False, str(e)

    try:
        usr = _create_new_user(new_data)
    except Exception as e:
        return False, str(e)

    return True, {
        'id': usr.id,
        'username': usr.username,
        'email': usr.email,
        'active': usr.active,
        'role': usr.roles[0].id
    }


@blueprint.route(
    '/user/<int:uid>', methods=['DELETE'], endpoint='delete_user'
)
@roles_required('Administrator')
def delete(uid):
    """

    Args:
      uid:

    Returns:

    """
    usr = User.query.get(uid)

    if not usr:
        abort(404)

    try:

        Setting.query.filter_by(user_id=uid).delete()

        UserPreference.query.filter_by(uid=uid).delete()

        Server.query.filter_by(user_id=uid).delete()

        ServerGroup.query.filter_by(user_id=uid).delete()

        Process.query.filter_by(user_id=uid).delete()

        # Finally delete user
        db.session.delete(usr)

        db.session.commit()

        return make_json_response(
            success=1,
            info=_("User deleted."),
            data={}
        )
    except Exception as e:
        return internal_server_error(errormsg=str(e))


@blueprint.route('/user/<int:uid>', methods=['PUT'], endpoint='update_user')
@roles_required('Administrator')
def update(uid):
    """

    Args:
      uid:

    Returns:

    """

    usr = User.query.get(uid)

    if not usr:
        abort(404)

    data = request.form if request.form else json.loads(
        request.data, encoding='utf-8'
    )

    # Username and email can not be changed for internal users
    if usr.auth_source == current_app.PGADMIN_DEFAULT_AUTH_SOURCE:
        non_editable_params = ('username', 'email')

        for f in non_editable_params:
            if f in data:
                return forbidden(
                    errmsg=_(
                        "'{0}' is not allowed to modify."
                    ).format(f)
                )

    try:
        new_data = validate_user(data)

        if 'roles' in new_data:
            new_data['roles'] = [Role.query.get(new_data['roles'])]

    except Exception as e:
        return bad_request(errormsg=_(str(e)))

    try:
        for k, v in new_data.items():
            setattr(usr, k, v)

        db.session.commit()

        res = {'id': usr.id,
               'username': usr.username,
               'email': usr.email,
               'active': usr.active,
               'role': usr.roles[0].id,
               'auth_source': usr.auth_source
               }

        return ajax_response(
            response=res,
            status=200
        )

    except Exception as e:
        return internal_server_error(errormsg=str(e))


@blueprint.route(
    '/role/', methods=['GET'], defaults={'rid': None}, endpoint='roles'
)
@blueprint.route('/role/<int:rid>', methods=['GET'], endpoint='role')
@roles_required('Administrator')
def role(rid):
    """

    Args:
      rid: Role id

    Returns: List of pgAdmin4 users roles or single role if rid is provided.

    """

    if rid:
        r = Role.query.get(rid)

        res = {'id': r.id, 'name': r.name}
    else:
        roles = Role.query.all()

        roles_data = []
        for r in roles:
            roles_data.append({'id': r.id,
                               'name': r.name})

        res = roles_data

    return ajax_response(
        response=res,
        status=200
    )


@blueprint.route(
    '/auth_sources/', methods=['GET'], endpoint='auth_sources'
)
def auth_sources():
    sources = []
    for source in current_app.PGADMIN_SUPPORTED_AUTH_SOURCE:
        sources.append({'label': source, 'value': source})

    return ajax_response(
        response=sources,
        status=200
    )
