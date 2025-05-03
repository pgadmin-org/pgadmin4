##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements pgAdmin4 User Management Utility"""

import json

import sys
from unicodedata import normalize, is_normalized

from flask import render_template, request, \
    Response, abort, current_app, session
from flask_babel import gettext as _
from flask_security import roles_required, current_user
from pgadmin.user_login_check import pga_login_required
from flask_security.utils import hash_password
from werkzeug.exceptions import InternalServerError

import config
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_response as ajax_response, \
    make_json_response, bad_request, internal_server_error
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.constants import MIMETYPE_APP_JS, INTERNAL, \
    SUPPORTED_AUTH_SOURCES, NO_CACHE_CONTROL
from pgadmin.utils.validation_utils import validate_email
from pgadmin.model import db, Role, User, UserPreference, Server, \
    ServerGroup, Process, Setting, roles_users, SharedServer
from pgadmin.utils.paths import create_users_storage_directory
from pgadmin.tools.user_management.PgAdminPermissions import PgAdminPermissions
from sqlalchemy import func

# set template path for sql scripts
MODULE_NAME = 'user_management'
server_info = {}

permissions_obj = PgAdminPermissions()


class UserManagementModule(PgAdminModule):
    """
    class UserManagementModule():

        It is a utility which inherits PgAdminModule
        class and define methods to load its own
        javascript file.
    """

    LABEL = _('Users')

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
            'user_management.roles',
            'user_management.role',
            'user_management.role_save',
            'user_management.role_delete',
            'user_management.users',
            'user_management.user',
            current_app.login_manager.login_view,
            'user_management.auth_sources',
            'user_management.change_owner',
            'user_management.shared_servers',
            'user_management.admin_users',
            'user_management.save',
            'user_management.save_id',
            'user_management.all_permissions',
            'user_management.save_permissions']


# Create blueprint for BackupModule class
blueprint = UserManagementModule(
    MODULE_NAME, __name__, static_url_path=''
)


@blueprint.route("/")
@pga_login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route("/current_user.js")
@pgCSRFProtect.exempt
@pga_login_required
def current_user_info():
    return Response(
        response=render_template(
            "user_management/js/current_user.js",
            is_admin='true' if current_user.has_role(
                "Administrator") else 'false',
            user_id=current_user.id,
            email=current_user.email.replace("'", "\\'") if current_user.email
            else current_user.email,
            name=(
                current_user.username.split('@')[0].replace("'", "\\'") if
                config.SERVER_MODE is True
                else 'postgres'
            ),
            allow_save_password='true' if
            config.ALLOW_SAVE_PASSWORD and
            session.get('allow_save_password', None)
            else 'false',
            allow_save_tunnel_password='true' if
            config.ALLOW_SAVE_TUNNEL_PASSWORD and
            session.get('allow_save_password', None) else 'false',
            auth_sources=config.AUTHENTICATION_SOURCES,
            current_auth_source=session['auth_source_manager'][
                'current_source'] if config.SERVER_MODE is True else INTERNAL,
            permissions=list({p for r in current_user.roles
                              for p in r.get_permissions()})
        ),
        headers={
            'Cache-Control': NO_CACHE_CONTROL
        },
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
               'auth_source': u.auth_source,
               'locked': u.locked
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
                               'auth_source': u.auth_source,
                               'locked': u.locked,
                               'canDrop': u.id != current_user.id
                               })

        res = users_data

    return ajax_response(
        response=res,
        status=200
    )


@blueprint.route('/change_owner', methods=['POST'], endpoint='change_owner')
@roles_required('Administrator')
def change_owner():
    """

    Returns:

    """

    data = request.form if request.form else json.loads(
        request.data
    )
    try:
        new_user = User.query.get(data['new_owner'])
        old_user_servers = Server.query.filter_by(shared=True, user_id=data[
            'old_owner']).all()
        server_group_ids = [server.servergroup_id for server in
                            old_user_servers]
        server_groups = ServerGroup.query.filter(
            ServerGroup.id.in_(server_group_ids)).all()

        new_owner_sg = ServerGroup.query.filter_by(
            user_id=data['new_owner']).all()
        old_owner_sg = ServerGroup.query.filter_by(
            user_id=data['old_owner']).all()
        sg_data = {sg.name: sg.id for sg in new_owner_sg}
        old_sg_data = {sg.id: sg.name for sg in old_owner_sg}

        deleted_sg = []
        # Change server user.
        for server in old_user_servers:
            sh_servers = SharedServer.query.filter_by(
                servergroup_id=server.servergroup_id).all()

            if old_sg_data[server.servergroup_id] in sg_data:

                for sh in sh_servers:
                    sh.servergroup_id = sg_data[
                        old_sg_data[server.servergroup_id]]
                    sh.server_owner = new_user.username
                # Update Server user and server group to prevent deleting
                # shared server associated with deleting user.
                Server.query.filter_by(
                    servergroup_id=server.servergroup_id, shared=True,
                    user_id=data['old_owner']
                ).update(
                    {
                        'servergroup_id': sg_data[old_sg_data[
                            server.servergroup_id]],
                        'user_id': data['new_owner']
                    }
                )
                ServerGroup.query.filter_by(id=server.servergroup_id).delete()
                deleted_sg.append(server.servergroup_id)
            else:
                server.user_id = data['new_owner']
                for sh in sh_servers:
                    sh.server_owner = new_user.username

        # Change server group user.
        for server_group in server_groups:
            if server_group.id not in deleted_sg:
                server_group.user_id = data['new_owner']

        db.session.commit()
        return make_json_response(
            success=1,
            info=_("Owner changed successfully."),
            data={}
        )
    except Exception as e:
        msg = 'Unable to update shared server owner' + _(str(e))
        return internal_server_error(
            errormsg=msg)


@blueprint.route(
    '/shared_servers/<int:uid>', methods=['GET'], endpoint='shared_servers'
)
@roles_required('Administrator')
def get_shared_servers(uid):
    """

    Args:
      uid:

    Returns:

    """
    usr = User.query.get(uid)

    if not usr:
        abort(404)

    try:
        shared_servers_count = 0
        admin_role = Role.query.filter_by(name='Administrator')[0]
        # Check user has admin role.
        for role in usr.roles:
            if role.id == admin_role.id:
                # get all server created by user.
                servers = Server.query.filter_by(user_id=usr.id).all()
                for server in servers:
                    if server.shared:
                        shared_servers_count += 1
                break

        if shared_servers_count:
            return make_json_response(
                success=1,
                info=_(
                    "{0} Shared servers are associated with this user."
                    "".format(shared_servers_count)
                ),
                data={
                    'shared_servers': shared_servers_count
                }
            )

        return make_json_response(
            success=1,
            info=_("No shared servers found"),
            data={'shared_servers': 0}
        )
    except Exception as e:
        return internal_server_error(errormsg=str(e))


@blueprint.route(
    '/admin_users/<int:uid>', methods=['GET'], endpoint='admin_users'
)
@roles_required('Administrator')
def admin_users(uid=None):
    """

    Args:
      uid:

    Returns:

    """
    admin_role = Role.query.filter_by(name='Administrator')[0]

    admin_users = db.session.query(roles_users).filter_by(
        role_id=admin_role.id).all()

    if uid:
        admin_users = [user[0] for user in admin_users if user[0] != uid]
    else:
        admin_users = [user[0] for user in admin_users]

    admin_list = User.query.filter(User.id.in_(admin_users)).all()

    user_list = [{'value': admin.id, 'label': admin.username} for admin in
                 admin_list]

    return make_json_response(
        success=1,
        data={
            'status': 'success',
            'msg': 'Admin user list',
            'result': {
                'data': user_list,
            }
        }
    )


def create_role(data):
    try:
        validate_unique_role(data)
        r = Role(name=data['name'],
                 description=data['description'])
        db.session.add(r)
        db.session.commit()
        return ajax_response(
            status=200
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(e)
        return internal_server_error(str(e))


def update_role(rid, data):
    try:
        validate_unique_role(data)
        r = Role.query.get(rid)

        if not r:
            return ajax_response(
                response=_('Role not found'),
                status=404
            )

        for key, value in data.items():
            setattr(r, key, value)

        db.session.commit()
        return ajax_response(
            status=200
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(e)
        return internal_server_error(str(e))


def delete_role(rid):
    r = Role.query.get(rid)

    if not r:
        return ajax_response(
            response=_('Role not found'),
            status=404
        )

    users = User.query.all()

    for u in users:
        if u.has_role(r):
            return make_json_response(
                success=0,
                status=400,
                errormsg=_(
                    'To proceed, ensure that all users assigned '
                    'the \'{0}\' role have been reassigned.'.format(r.name))
            )

    try:
        # Finally delete user
        db.session.delete(r)
        db.session.commit()

        return ajax_response(
            status=200
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(e)
        return internal_server_error(str(e))


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

        res = {'id': r.id,
               'name': r.name,
               'description': r.description,
               'permissions': r.permissions,
               'is_admin': r.name == "Administrator"}
    else:
        roles = Role.query.all()

        roles_data = []
        for r in roles:
            roles_data.append({'id': r.id,
                               'name': r.name,
                               'description': r.description,
                               'permissions': r.permissions,
                               'is_admin': r.name == "Administrator"})

        res = roles_data

    return ajax_response(
        response=res,
        status=200
    )


@blueprint.route(
    '/role/', methods=['POST'], defaults={'id': None}, endpoint='role_save'
)
@blueprint.route('/role/<int:id>', methods=['DELETE'], endpoint='role_delete')
@roles_required('Administrator')
def role_save(id):
    """

    Args:
      id: Role id

    """

    if request.method == 'DELETE':
        return delete_role(id)

    data = request.form if request.form else json.loads(
        request.data
    )

    if 'id' not in data:
        return create_role(data)
    else:
        return update_role(data['id'], data)


@blueprint.route(
    '/auth_sources/', methods=['GET'], endpoint='auth_sources'
)
def auth_sources():
    sources = []
    for source in SUPPORTED_AUTH_SOURCES:
        sources.append({'label': source, 'value': source})

    return ajax_response(
        response=sources,
        status=200
    )


@blueprint.route('/save', methods=['POST'], endpoint='save')
@blueprint.route('/save/<int:id>', methods=['DELETE'], endpoint='save_id')
@roles_required('Administrator')
def save(id=None):
    """
    This function is used to add/update/delete users.
    """
    if request.method == 'DELETE':
        status, res = delete_user(id)
        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            status=200
        )

    data = request.form if request.form else json.loads(
        request.data
    )

    if 'id' not in data:
        status, res = create_user(data)
    else:
        status, res = update_user(data['id'], data)

    if not status:
        return internal_server_error(errormsg=res)

    return ajax_response(
        status=200
    )


def normalise_password(password):
    """
    Normalise the password.
    Flask security normalized the password prior to changing or comparing using
    Python unicodedata.normalize(). As we are not using flask security form
    to add/update user, we need custom function to do the same.
    """
    normalise_form = current_app.config.get(
        'SECURITY_PASSWORD_NORMALIZE_FORM',
        'NFKD'
    )

    return password if is_normalized(normalise_form, password) else\
        normalize(normalise_form, password)


def validate_unique_role(data):
    if 'name' not in data:
        return

    exist_roles = Role.query.filter(
        func.lower(Role.name) == func.lower(data['name'])
    ).count()

    if exist_roles != 0:
        raise InternalServerError(_("Role name must be unique."))


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
            new_data['password'] = hash_password(normalise_password(
                data['newPassword'])
            )
        else:
            raise InternalServerError(_("Passwords do not match."))


def validate_unique_user(data):
    if 'username' not in data:
        return

    exist_users = User.query.filter_by(
        username=data['username'],
        auth_source=data['auth_source']
    ).count()

    if exist_users != 0:
        raise InternalServerError(_("User email/username must be unique "
                                    "for an authentication source."))


def validate_user(data):
    new_data = dict()

    validate_unique_user(data)

    validate_password(data, new_data)

    if 'email' in data and data['email'] and data['email'] != "":
        if validate_email(data['email']):
            new_data['email'] = data['email']
        else:
            raise InternalServerError(
                _("Invalid email address {0}.").format(data['email']))

    if 'role' in data and data['role'] != "":
        new_data['roles'] = int(data['role'])

    if 'active' in data and data['active'] != "":
        new_data['active'] = data['active']

    if 'username' in data and data['username'] != "":
        new_data['username'] = data['username']

    if 'auth_source' in data and data['auth_source'] != "":
        new_data['auth_source'] = data['auth_source']

    if 'locked' in data and isinstance(data['locked'], bool):
        new_data['locked'] = data['locked']
        if data['locked']:
            new_data['login_attempts'] = config.MAX_LOGIN_ATTEMPTS
        else:
            new_data['login_attempts'] = 0

    return new_data


def _create_new_user(new_data):
    """
    Create new user.
    :param new_data: Data from user creation.
    :return: Return new created user.
    """
    usr = User(username=new_data['username'],
               email=new_data['email'],
               roles=new_data['roles'],
               active=new_data['active'],
               password=new_data['password'],
               auth_source=new_data['auth_source'])
    db.session.add(usr)
    db.session.commit()
    # Add default server group for new user.
    server_group = ServerGroup(user_id=usr.id, name="Servers")
    db.session.add(server_group)
    db.session.commit()


def create_user(data):
    if 'auth_source' in data and data['auth_source'] != \
            INTERNAL:
        req_params = ('username', 'role', 'active', 'auth_source')
    else:
        req_params = ('email', 'role', 'active', 'newPassword',
                      'confirmPassword')

    for f in req_params:
        if f in data and data[f] != '':
            continue
        else:
            return False, _("Missing field: '{0}'").format(f)

    data['auth_source'] = data['auth_source'] if 'auth_source' in data \
        else INTERNAL
    data['username'] = data['username'] if \
        'username' in data and data['auth_source'] != \
        INTERNAL else data['email']
    data['email'] = data['email'] if 'email' in data else None
    data['password'] = data['password'] if 'password' in data else None

    try:
        new_data = validate_user(data)
        new_data['email'] = new_data['email'] if 'email' in new_data else None
        new_data['password'] = new_data['password']\
            if 'password' in new_data else None

        if 'roles' in new_data:
            new_data['roles'] = [Role.query.get(new_data['roles'])]

    except Exception as e:
        return False, str(e)

    try:
        _create_new_user(new_data)
    except Exception as e:
        return False, str(e)

    # Create users storage directory
    create_users_storage_directory()

    return True, ''


def update_user(uid, data):
    """
    This function is used to update the users.
    """

    usr = User.query.get(uid)
    if not usr:
        return False, _("Unable to update user '{0}'").format(uid)

    # Username and email can not be changed for internal users
    if usr.auth_source == INTERNAL:
        non_editable_params = ('username', 'email')
    else:
        non_editable_params = ('username',)

    for f in non_editable_params:
        if f in data:
            return False, _("'{0}' is not allowed to modify.").format(f)

    try:
        new_data = validate_user(data)
        if 'roles' in new_data:
            new_data['roles'] = [Role.query.get(new_data['roles'])]
    except Exception as e:
        return False, str(e)

    try:
        for k, v in new_data.items():
            setattr(usr, k, v)

        db.session.commit()
    except Exception as e:
        return False, str(e)

    return True, ''


def delete_user(uid):
    """
    This function is used to delete the users
    """
    usr = User.query.get(uid)

    if not usr:
        return False, _("Unable to update user '{0}'").format(uid)

    try:
        server_groups = ServerGroup.query.filter_by(user_id=uid).all()
        sg = [server_group.id for server_group in server_groups]

        Setting.query.filter_by(user_id=uid).delete()

        UserPreference.query.filter_by(uid=uid).delete()

        Server.query.filter_by(user_id=uid).delete()

        ServerGroup.query.filter_by(user_id=uid).delete()

        Process.query.filter_by(user_id=uid).delete()
        # Delete Shared servers for current user.
        SharedServer.query.filter_by(user_id=uid).delete()

        SharedServer.query.filter(SharedServer.servergroup_id.in_(sg)).delete(
            synchronize_session=False)

        # Finally delete user
        db.session.delete(usr)

        db.session.commit()
    except Exception as e:
        return False, str(e)

    return True, ''


@blueprint.route('/all_permissions',
                 methods=['GET'],
                 endpoint='all_permissions')
@roles_required('Administrator')
def get_all_permissions():
    return ajax_response(
        status=200,
        response=permissions_obj.all_permissions
    )


@blueprint.route('/save_permissions/<int:id>',
                 methods=['PUT'], endpoint='save_permissions')
@roles_required('Administrator')
def save_permissions(id):
    data = request.form if request.form else json.loads(
        request.data
    )

    r = Role.query.get(id)

    try:
        r.permissions = data['permissions']
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return internal_server_error(errormsg=str(e))

    return ajax_response(
        status=200,
        response={
            'id': r.id,
            'name': r.name,
            'permissions': r.permissions
        }
    )
