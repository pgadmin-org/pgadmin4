##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Oauth2 authentication."""

import config

from authlib.integrations.flask_client import OAuth
from flask import current_app, url_for, session, request,\
    redirect, Flask, flash
from flask_babel import gettext
from flask_security import login_user, current_user
from flask_security.utils import get_post_logout_redirect, logout_user

from pgadmin.authenticate.internal import BaseAuthentication
from pgadmin.model import User
from pgadmin.tools.user_management import create_user
from pgadmin.utils.constants import OAUTH2
from pgadmin.utils import PgAdminModule, get_safe_post_login_redirect
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.model import db

OAUTH2_LOGOUT = 'oauth2.logout'
OAUTH2_AUTHORIZE = 'oauth2.authorize'


class Oauth2Module(PgAdminModule):
    def register(self, app, options):
        # Do not look for the sub_modules,
        # instead call blueprint.register(...) directly
        super().register(app, options)

    def get_exposed_url_endpoints(self):
        return [OAUTH2_AUTHORIZE,
                OAUTH2_LOGOUT]


def init_app(app):
    MODULE_NAME = 'oauth2'

    blueprint = Oauth2Module(MODULE_NAME, __name__, static_url_path='')

    @blueprint.route('/authorize', endpoint="authorize",
                     methods=['GET', 'POST'])
    @pgCSRFProtect.exempt
    def oauth_authorize():
        auth_obj = session['auth_obj']
        auth_obj.set_current_source(auth_obj.source.get_source_name())
        status, msg = auth_obj.login()
        if status:
            session['auth_source_manager'] = auth_obj.as_dict()
            if 'auth_obj' in session:
                session.pop('auth_obj')
            return redirect(get_safe_post_login_redirect())
        if 'auth_obj' in session:
            session.pop('auth_obj')
        logout_user()
        flash(msg, 'danger')
        return redirect(get_safe_post_login_redirect())

    @blueprint.route('/logout', endpoint="logout",
                     methods=['GET', 'POST'])
    @pgCSRFProtect.exempt
    def oauth_logout():
        if not current_user.is_authenticated:
            return redirect(get_post_logout_redirect())
        for key in list(session.keys()):
            session.pop(key)
        logout_user()
        return redirect(get_post_logout_redirect())

    app.register_blueprint(blueprint)
    app.login_manager.logout_view = OAUTH2_LOGOUT


class OAuth2Authentication(BaseAuthentication):
    """OAuth Authentication Class"""

    LOGOUT_VIEW = OAUTH2_LOGOUT

    oauth_obj = OAuth(Flask(__name__))
    oauth2_clients = {}
    oauth2_config = {}
    email_keys = ['mail', 'email']

    def __init__(self):
        for oauth2_config in config.OAUTH2_CONFIG:

            OAuth2Authentication.oauth2_config[
                oauth2_config['OAUTH2_NAME']] = oauth2_config

            OAuth2Authentication.oauth2_clients[
                oauth2_config['OAUTH2_NAME']
            ] = OAuth2Authentication.oauth_obj.register(
                name=oauth2_config['OAUTH2_NAME'],
                client_id=oauth2_config['OAUTH2_CLIENT_ID'],
                client_secret=oauth2_config['OAUTH2_CLIENT_SECRET'],
                access_token_url=oauth2_config['OAUTH2_TOKEN_URL'],
                authorize_url=oauth2_config['OAUTH2_AUTHORIZATION_URL'],
                api_base_url=oauth2_config['OAUTH2_API_BASE_URL'],
                client_kwargs={'scope': oauth2_config.get(
                    'OAUTH2_SCOPE', 'email profile')},
                server_metadata_url=oauth2_config.get(
                    'OAUTH2_SERVER_METADATA_URL', None)
            )

    def get_source_name(self):
        return OAUTH2

    def get_friendly_name(self):
        return self.oauth2_config[self.oauth2_current_client]['OAUTH2_NAME']

    def validate(self, form):
        return True, None

    def login(self, form):
        profile = self.get_user_profile()
        email_key = \
            [value for value in self.email_keys if value in profile.keys()]
        email = profile[email_key[0]] if (len(email_key) > 0) else None

        username = email
        username_claim = None
        if 'OAUTH2_USERNAME_CLAIM' in self.oauth2_config[
                self.oauth2_current_client]:
            username_claim = self.oauth2_config[
                self.oauth2_current_client
            ]['OAUTH2_USERNAME_CLAIM']
        if username_claim is not None:
            if username_claim in profile:
                username = profile[username_claim]
            else:
                error_msg = "The claim '%s' is required to login into " \
                    "pgAdmin. Please update your Oauth2 profile." % (
                        username_claim)
                current_app.logger.exception(error_msg)
                return False, gettext(error_msg)

        if not email or email == '':
            current_app.logger.exception(
                "An email id is required to login into pgAdmin. "
                "Please update your Oauth2 profile."
            )
            return False, gettext(
                "An email id is required to login into pgAdmin. "
                "Please update your Oauth2 profile.")

        user, msg = self.__auto_create_user(username, email)
        if user:
            user = db.session.query(User).filter_by(
                username=username, auth_source=OAUTH2).first()
            current_app.login_manager.logout_view = \
                OAuth2Authentication.LOGOUT_VIEW
            current_app.logger.info(
                "OAUTH2 user {0} logged in.".format(username))
            return login_user(user), None
        return False, msg

    def get_user_profile(self):
        session['oauth2_token'] = self.oauth2_clients[
            self.oauth2_current_client].authorize_access_token()

        session['pass_enc_key'] = session['oauth2_token']['access_token']

        resp = self.oauth2_clients[self.oauth2_current_client].get(
            self.oauth2_config[
                self.oauth2_current_client]['OAUTH2_USERINFO_ENDPOINT'],
            token=session['oauth2_token']
        )
        resp.raise_for_status()
        return resp.json()

    def authenticate(self, form):
        self.oauth2_current_client = request.form['oauth2_button']
        redirect_url = url_for(OAUTH2_AUTHORIZE, _external=True)

        if self.oauth2_current_client not in self.oauth2_clients:
            return False, gettext(
                "Please set the configuration parameters properly.")
        return False, self.oauth2_clients[
            self.oauth2_current_client].authorize_redirect(redirect_url)

    def __auto_create_user(self, username, email):
        if config.OAUTH2_AUTO_CREATE_USER:
            user = User.query.filter_by(username=username,
                                        auth_source=OAUTH2).first()
            if not user:
                create_msg = ("Creating user {0} with email {1} "
                              "from auth source OAUTH2.")
                current_app.logger.info(create_msg.format(username,
                                                          email))
                return create_user({
                    'username': username,
                    'email': email,
                    'role': 2,
                    'active': True,
                    'auth_source': OAUTH2
                })

        return True, {'username': username}
