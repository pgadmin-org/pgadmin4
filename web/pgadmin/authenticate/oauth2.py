##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
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
from flask_security.utils import logout_user

from pgadmin.authenticate.internal import BaseAuthentication
from pgadmin.model import User
from pgadmin.tools.user_management import create_user
from pgadmin.utils.constants import OAUTH2, MessageType
from pgadmin.utils import PgAdminModule, get_safe_post_login_redirect, \
    get_safe_post_logout_redirect
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
        flash(msg, MessageType.ERROR)
        return redirect(get_safe_post_login_redirect())

    @blueprint.route('/logout', endpoint="logout",
                     methods=['GET', 'POST'])
    @pgCSRFProtect.exempt
    def oauth_logout():
        if not current_user.is_authenticated:
            return redirect(get_safe_post_logout_redirect())
        for key in list(session.keys()):
            session.pop(key)
        logout_user()
        return redirect(get_safe_post_logout_redirect())

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
                    'OAUTH2_SCOPE', 'email profile'),
                    'verify': oauth2_config.get(
                    'OAUTH2_SSL_CERT_VERIFICATION', True)},
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
                    "pgAdmin. Please update your OAuth2 profile." % (
                        username_claim)
                current_app.logger.exception(error_msg)
                return False, gettext(error_msg)
        else:
            if not email or email == '':
                error_msg = "An email id or OAUTH2_USERNAME_CLAIM is" \
                    " required to login into pgAdmin. Please update your" \
                    " OAuth2 profile for email id or set" \
                    " OAUTH2_USERNAME_CLAIM config parameter."
                current_app.logger.exception(error_msg)
                return False, gettext(error_msg)

        additinal_claims = None
        if 'OAUTH2_ADDITIONAL_CLAIMS' in self.oauth2_config[
                self.oauth2_current_client]:

            additinal_claims = self.oauth2_config[
                self.oauth2_current_client
            ]['OAUTH2_ADDITIONAL_CLAIMS']

        # checking oauth provider userinfo response
        valid_profile, reason = self.__is_any_claim_valid(profile,
                                                          additinal_claims)
        current_app.logger.debug(f"profile claims: {profile}")
        current_app.logger.debug(f"reason: {reason}")

        # checking oauth provider idtoken claims
        id_token_claims = session.get('oauth2_token', {}).get('userinfo',{})
        valid_idtoken, reason = self.__is_any_claim_valid(id_token_claims,
                                                          additinal_claims)
        current_app.logger.debug(f"idtoken claims: {id_token_claims}")
        current_app.logger.debug(f"reason: {reason}")

        if not valid_profile and not valid_idtoken:
            return_msg = "The user is not authorized to login" \
                " based on your identity profile." \
                " Please contact your administrator."
            audit_msg = f"The authenticated user {username} is not" \
                " authorized to access pgAdmin based on OAUTH2 config. " \
                f"Reason: additional claim required {additinal_claims}, " \
                f"profile claims {profile}, idtoken cliams {id_token_claims}."
            current_app.logger.warning(audit_msg)
            return False, return_msg

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

    def __is_any_claim_valid(self, identity, additional_claims):
        if additional_claims is None:
            reason = "Additional claim config is None, no check to do."
            return (True, reason)
        if not isinstance(additional_claims, dict):
            reason = "Additional claim check config is not a dict."
            return (False, reason)
        if additional_claims.keys() is None:
            reason = "Additional claim check config dict is empty."
            return (False, reason)
        for key in additional_claims.keys():
            claim = identity.get(key)
            if claim is None:
                continue
            if not isinstance(claim, list):
                claim = [claim]
            authorized_claims = additional_claims.get(key)
            if not isinstance(authorized_claims, list):
                authorized_claims = [authorized_claims]
            if any(item in authorized_claims for item in claim):
                reason = "Claim match found. Authorized access."
                return (True, reason)
        reason = f"No match was found."
        return (False, reason)
