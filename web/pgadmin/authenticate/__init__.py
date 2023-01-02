##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Authentication."""

import config
import copy
import functools

from flask import current_app, flash, Response, request, url_for, \
    session, redirect, render_template
from flask_babel import gettext
from flask_security.views import _security, _ctx
from flask_security.utils import get_post_logout_redirect, logout_user,\
    config_value

from flask_login import current_user
from flask_socketio import disconnect, ConnectionRefusedError


from pgadmin.model import db, User
from pgadmin.utils import PgAdminModule, get_safe_post_login_redirect
from pgadmin.utils.constants import KERBEROS, INTERNAL, OAUTH2, LDAP
from pgadmin.authenticate.registry import AuthSourceRegistry

MODULE_NAME = 'authenticate'
auth_obj = None

_URL_WITH_NEXT_PARAM = "{0}?next={1}"


def get_logout_url() -> str:
    """
    Returns the logout url based on the current authentication method.

    Returns:
        str: logout url
    """
    BROWSER_INDEX = 'browser.index'
    if config.SERVER_MODE and\
            session['auth_source_manager']['current_source'] == \
            KERBEROS:
        return _URL_WITH_NEXT_PARAM.format(url_for(
            'kerberos.logout'), url_for(BROWSER_INDEX))
    elif config.SERVER_MODE and\
            session['auth_source_manager']['current_source'] == \
            OAUTH2:
        return _URL_WITH_NEXT_PARAM.format(url_for(
            'oauth2.logout'), url_for(BROWSER_INDEX))

    return _URL_WITH_NEXT_PARAM.format(
        url_for('security.logout'), url_for(BROWSER_INDEX))


def socket_login_required(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
            raise ConnectionRefusedError("Unauthorised !")
        else:
            return f(*args, **kwargs)
    return wrapped


class AuthenticateModule(PgAdminModule):
    def get_exposed_url_endpoints(self):
        return ['authenticate.login']


blueprint = AuthenticateModule(MODULE_NAME, __name__, static_url_path='')


@blueprint.route('/login', endpoint='login', methods=['GET', 'POST'])
def login():
    """
    Entry point for all the authentication sources.
    The user input will be validated and authenticated.
    """
    form = _security.login_form()
    if OAUTH2 in config.AUTHENTICATION_SOURCES \
            and 'oauth2_button' in request.form:
        # Sending empty form as oauth2 does not require form attribute
        auth_obj = AuthSourceManager({}, copy.deepcopy(
            config.AUTHENTICATION_SOURCES))
        session['auth_obj'] = auth_obj
    else:
        auth_obj = AuthSourceManager(form, copy.deepcopy(
            config.AUTHENTICATION_SOURCES))

    session['auth_source_manager'] = None

    username = form.data['email']
    user = User.query.filter_by(username=username,
                                auth_source=INTERNAL).first()

    if user:
        if user.login_attempts >= config.MAX_LOGIN_ATTEMPTS > 0:
            user.locked = True
        else:
            user.locked = False
        db.session.commit()

        if user.login_attempts >= config.MAX_LOGIN_ATTEMPTS > 0:
            flash(gettext('Your account is locked. Please contact the '
                          'Administrator.'),
                  'warning')
            logout_user()
            return redirect(get_post_logout_redirect())

    # Validate the user
    if not auth_obj.validate():
        for field in form.errors:
            flash_login_attempt_error = None
            if user and field in config.LOGIN_ATTEMPT_FIELDS:
                if config.MAX_LOGIN_ATTEMPTS > 0:
                    user.login_attempts += 1
                    left_attempts = \
                        config.MAX_LOGIN_ATTEMPTS - user.login_attempts
                    if left_attempts > 1:
                        flash_login_attempt_error = \
                            gettext('{0} more attempts remaining.'.
                                    format(left_attempts))
                    else:
                        flash_login_attempt_error = \
                            gettext('{0} more attempt remaining.'.
                                    format(left_attempts))
                db.session.commit()
            for error in form.errors[field]:
                if flash_login_attempt_error:
                    error = error + flash_login_attempt_error
                    flash_login_attempt_error = None
                flash(error, 'warning')

        return redirect(get_post_logout_redirect())

    # Authenticate the user
    status, msg = auth_obj.authenticate()
    if status:
        # Login the user
        status, msg = auth_obj.login()
        current_auth_obj = auth_obj.as_dict()

        if not status:
            if current_auth_obj['current_source'] == \
                    KERBEROS:
                return redirect('{0}?next={1}'.format(url_for(
                    'authenticate.kerberos_login'), url_for('browser.index')))

            flash(msg, 'danger')
            return redirect(get_post_logout_redirect())

        session['auth_source_manager'] = current_auth_obj

        if user:
            user.login_attempts = 0
        db.session.commit()

        if 'auth_obj' in session:
            session.pop('auth_obj')
        return redirect(get_safe_post_login_redirect())

    elif isinstance(msg, Response):
        return msg
    elif 'oauth2_button' in request.form and not isinstance(msg, str):
        return msg
    if 'auth_obj' in session:
        session.pop('auth_obj')
    flash(msg, 'danger')
    form_class = _security.login_form
    form = form_class()

    return _security.render_template(
        config_value('LOGIN_USER_TEMPLATE'),
        login_user_form=form, **_ctx('login'))


class AuthSourceManager:
    """This class will manage all the authentication sources.
     """

    def __init__(self, form, sources):
        self.form = form
        self.auth_sources = sources
        self.source = None
        self.source_friendly_name = INTERNAL
        self.current_source = INTERNAL
        self.update_auth_sources()

    def as_dict(self):
        """
        Returns the dictionary object representing this object.
        """

        res = dict()
        res['source_friendly_name'] = self.source_friendly_name
        res['auth_sources'] = self.auth_sources
        res['current_source'] = self.current_source

        return res

    def update_auth_sources(self):
        for auth_src in [KERBEROS, OAUTH2]:
            if auth_src in self.auth_sources:
                if 'internal_button' in request.form:
                    self.auth_sources.remove(auth_src)
                else:
                    if INTERNAL in self.auth_sources:
                        self.auth_sources.remove(INTERNAL)
                    if LDAP in self.auth_sources:
                        self.auth_sources.remove(LDAP)

    def set_current_source(self, source):
        self.current_source = source

    @property
    def get_current_source(self):
        return self.current_source

    def set_source(self, source):
        self.source = source

    @property
    def get_source(self):
        return self.source

    def set_source_friendly_name(self, name):
        self.source_friendly_name = name

    @property
    def get_source_friendly_name(self):
        return self.source_friendly_name

    def validate(self):
        """Validate through all the sources."""
        err_msg = None
        for src in self.auth_sources:
            source = get_auth_sources(src)
            status, err_msg = source.validate(self.form)
            if status:
                return True
        if err_msg:
            flash(err_msg, 'warning')
        return False

    def authenticate(self):
        """Authenticate through all the sources."""
        status = False
        msg = None
        for src in self.auth_sources:
            source = get_auth_sources(src)
            self.set_source(source)
            current_app.logger.debug(
                "Authentication initiated via source: %s" %
                source.get_source_name())

            status, msg = source.authenticate(self.form)

            if status:
                self.set_current_source(source.get_source_name())
                if msg is not None and 'username' in msg:
                    self.form._fields['email'].data = msg['username']
                return status, msg

        return status, msg

    def login(self):
        status, msg = self.source.login(self.form)
        if status:
            self.set_source_friendly_name(self.source.get_friendly_name())
            current_app.logger.debug(
                "Authentication and Login successfully done via source : %s" %
                self.source.get_source_name())

            # Set the login, logout view as per source  if available
            current_app.login_manager.login_view = getattr(
                self.source, 'LOGIN_VIEW', 'security.login')
            current_app.login_manager.logout_view = getattr(
                self.source, 'LOGOUT_VIEW', 'security.logout')

        return status, msg


def get_auth_sources(type):
    """Get the authenticated source object from the registry"""

    auth_sources = getattr(current_app, '_pgadmin_auth_sources', None)

    if auth_sources is None or not isinstance(auth_sources, dict):
        auth_sources = dict()

    if type in auth_sources:
        return auth_sources[type]

    auth_source = AuthSourceRegistry.get(type)

    if auth_source is not None:
        auth_sources[type] = auth_source
        setattr(current_app, '_pgadmin_auth_sources', auth_sources)

    return auth_source


def init_app(app):
    auth_sources = dict()

    setattr(app, '_pgadmin_auth_sources', auth_sources)
    AuthSourceRegistry.load_modules(app)

    return auth_sources
