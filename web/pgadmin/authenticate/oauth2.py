##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Oauth2 authentication."""

import config

from authlib.integrations.flask_client import OAuth
from flask import current_app, url_for, session, request, \
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
        logout_url = None
        id_token = session['oauth2_token'].get('id_token')
        if 'oauth2_logout_url' in session:
            logout_url = session['oauth2_logout_url']

        if not current_user.is_authenticated:
            return redirect(get_safe_post_logout_redirect())

        # Logout the user first to avoid crypt key issue while
        # cancelling existing query tool transactions
        logout_user()
        for key in list(session.keys()):
            session.pop(key)

        if logout_url:
            return redirect(logout_url.format(
                redirect_uri=request.url_root,
                id_token=id_token))
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
        # Selected provider name (set during authenticate()).
        # Initializing avoids AttributeError in edge cases/tests.
        self.oauth2_current_client = None

        for oauth2_config in config.OAUTH2_CONFIG:

            provider_name = oauth2_config.get('OAUTH2_NAME', '<unknown>')

            OAuth2Authentication.oauth2_config[
                oauth2_config['OAUTH2_NAME']] = oauth2_config

            # Build client_kwargs with defaults
            client_kwargs = {
                'scope': oauth2_config.get(
                    'OAUTH2_SCOPE', 'email profile'),
                'verify': oauth2_config.get(
                    'OAUTH2_SSL_CERT_VERIFICATION', True)
            }

            pkce_method = oauth2_config.get('OAUTH2_CHALLENGE_METHOD')
            pkce_response_type = oauth2_config.get('OAUTH2_RESPONSE_TYPE')
            pkce_is_configured = any(
                [
                    pkce_method is not None,
                    pkce_response_type is not None
                ]
            )

            raw_client_secret = oauth2_config.get('OAUTH2_CLIENT_SECRET')
            client_secret_is_empty = (
                raw_client_secret is None or
                (isinstance(raw_client_secret, str) and
                 raw_client_secret.strip() == '')
            )

            if client_secret_is_empty and not (
                pkce_is_configured and
                pkce_method and
                pkce_response_type == 'code'
            ):
                raise ValueError(
                    f'OAuth2 provider "{provider_name}" is configured '
                    'without OAUTH2_CLIENT_SECRET (public client). '
                    'Public clients must use Authorization Code + PKCE; set '
                    'OAUTH2_CHALLENGE_METHOD="S256" and '
                    'OAUTH2_RESPONSE_TYPE="code".'
                )

            # Preserve existing behavior for confidential clients:
            # only pass PKCE kwargs if both keys are present in config.
            if pkce_is_configured:
                client_kwargs.update({
                    'code_challenge_method': pkce_method,
                    'response_type': pkce_response_type
                })

            register_kwargs = {
                'name': oauth2_config['OAUTH2_NAME'],
                'client_id': oauth2_config['OAUTH2_CLIENT_ID'],
                'client_secret': (
                    None if client_secret_is_empty else raw_client_secret
                ),
                'access_token_url': oauth2_config.get('OAUTH2_TOKEN_URL'),
                'authorize_url': oauth2_config.get('OAUTH2_AUTHORIZATION_URL'),
                'api_base_url': oauth2_config.get('OAUTH2_API_BASE_URL'),
                'client_kwargs': client_kwargs,
                'server_metadata_url': oauth2_config.get(
                    'OAUTH2_SERVER_METADATA_URL', None)
            }

            if client_secret_is_empty:
                register_kwargs['token_endpoint_auth_method'] = 'none'

            OAuth2Authentication.oauth2_clients[
                oauth2_config['OAUTH2_NAME']
            ] = OAuth2Authentication.oauth_obj.register(**register_kwargs)

    def get_source_name(self):
        return OAUTH2

    def get_friendly_name(self):
        provider = self.oauth2_config.get(self.oauth2_current_client)
        if not provider:
            return OAUTH2
        return provider.get('OAUTH2_NAME', OAUTH2)

    def validate(self, form):
        return True, None

    def _is_oidc_provider(self):
        """
        Determine if the current provider is configured as an OIDC provider.
        Returns True if OAUTH2_SERVER_METADATA_URL is defined.
        """
        provider = self.oauth2_config.get(self.oauth2_current_client)
        if not provider:
            return False
        return 'OAUTH2_SERVER_METADATA_URL' in provider and \
            provider['OAUTH2_SERVER_METADATA_URL'] is not None

    def _get_id_token_claims(self):
        """
        Extract and return ID token claims for OIDC providers.

        In pgAdmin's Authlib integration, the token response returned by
        authorize_access_token() may include a decoded claims dict under the
        'userinfo' key (e.g. populated from the ID token).

        If those claims are not present, this returns an empty dict and the
        caller should fall back to the configured userinfo endpoint.

        Returns:
            dict: ID token claims, or empty dict if not available or
            parsing fails
        """
        if not self._is_oidc_provider():
            return {}

        token = session.get('oauth2_token')
        if not isinstance(token, dict):
            return {}

        claims = token.get('userinfo')
        if isinstance(claims, dict):
            return claims

        return {}

    def get_profile_dict(self, profile):
        """
        Returns the dictionary from profile
        whether it's a list or dictionary.
        Includes additional type checking.
        """
        if isinstance(profile, list):
            return profile[0] if profile else {}
        elif isinstance(profile, dict):
            return profile
        else:
            return {}

    def _resolve_username(self, id_token_claims, profile_dict):
        """
        Resolve username from available claims with OIDC-aware fallback.

        Resolution order:
        1. If OAUTH2_USERNAME_CLAIM is configured, use that claim from
           ID token first, then userinfo profile
        2. For OIDC providers, check in order: email, preferred_username, sub
        3. For non-OIDC providers, use email only

        Args:
            id_token_claims (dict): Claims from ID token
            profile_dict (dict): Claims from userinfo endpoint

        Returns:
            tuple: (username, email) or (None, None) if resolution fails
        """
        provider = self.oauth2_config.get(self.oauth2_current_client, {})
        username_claim = provider.get('OAUTH2_USERNAME_CLAIM')

        # Extract email from profile (backward compatibility)
        email_key = [value for value in self.email_keys
                     if value in profile_dict.keys()]
        email = profile_dict[email_key[0]] if email_key else None

        # If specific username claim is configured, look for it
        if username_claim:
            # Check ID token claims first
            if username_claim in id_token_claims:
                username = id_token_claims[username_claim]
                current_app.logger.debug(
                    f'Found username claim "{username_claim}" '
                    'in ID token')
                return username, email
            # Fall back to userinfo profile
            elif username_claim in profile_dict:
                username = profile_dict[username_claim]
                current_app.logger.debug(
                    f'Found username claim "{username_claim}" '
                    'in profile')
                return username, email
            else:
                current_app.logger.error(
                    f'Required username claim "{username_claim}" '
                    f'not found in ID token or profile')
                return None, email

        # For OIDC providers, use standard claim hierarchy
        if self._is_oidc_provider():
            # Priority 1: email (from ID token or profile)
            if 'email' in id_token_claims:
                username = id_token_claims['email']
                # Use as email if not found elsewhere
                email = email or username
                current_app.logger.debug(
                    'Using email from ID token as username')
                return username, email
            elif email:
                current_app.logger.debug(
                    'Using email from profile as username')
                return email, email

            # Priority 2: preferred_username
            if 'preferred_username' in id_token_claims:
                username = id_token_claims['preferred_username']
                current_app.logger.debug(
                    'Using preferred_username from ID token')
                return username, email

            # Priority 3: sub (always present in OIDC)
            if 'sub' in id_token_claims:
                username = id_token_claims['sub']
                current_app.logger.debug(
                    'Using sub from ID token as last resort')
                return username, email

            # Should not reach here for valid OIDC provider
            current_app.logger.warning(
                'OIDC provider but no standard claims found in ID token')

        # For non-OIDC OAuth2 providers, email is required
        if email:
            current_app.logger.debug(
                'Using email as username for OAuth2 provider')
            return email, email

        return None, None

    def login(self, form):
        if not self.oauth2_current_client:
            error_msg = 'No OAuth2 provider available.'
            current_app.logger.error(error_msg)
            return False, gettext(error_msg)

        profile = self.get_user_profile()
        profile_dict = self.get_profile_dict(profile)

        profile_dict_keys = []
        if isinstance(profile_dict, dict):
            profile_dict_keys = sorted(profile_dict.keys())
        current_app.logger.debug(
            f'profile_dict keys: {profile_dict_keys}'
            if profile_dict_keys else 'profile_dict empty'
        )

        # Get ID token claims for OIDC providers
        id_token_claims = self._get_id_token_claims()
        id_token_claims_keys = []
        if isinstance(id_token_claims, dict):
            id_token_claims_keys = sorted(id_token_claims.keys())
        current_app.logger.debug(
            f'id_token_claims keys: {id_token_claims_keys}'
            if id_token_claims_keys else 'id_token_claims empty'
        )

        # For OIDC providers, we must have either ID token claims or profile
        if (
            self._is_oidc_provider() and
            not id_token_claims and
            not profile_dict
        ):
            error_msg = "No profile data found from OIDC provider."
            current_app.logger.error(error_msg)
            return False, gettext(error_msg)

        # For non-OIDC providers, profile is required
        if not self._is_oidc_provider() and not profile_dict:
            error_msg = "No profile data found."
            current_app.logger.error(error_msg)
            return False, gettext(error_msg)

        # Resolve username using OIDC-aware logic
        username, email = self._resolve_username(id_token_claims, profile_dict)

        if not username:
            if self._is_oidc_provider():
                error_msg = (
                    'Could not extract username from OIDC claims. '
                    'Please ensure your OIDC provider returns standard '
                    'claims (email, preferred_username, or sub).'
                )
            else:
                error_msg = (
                    'An email id or OAUTH2_USERNAME_CLAIM is required to '
                    'login into pgAdmin. Please update your OAuth2 profile '
                    'for email id or set OAUTH2_USERNAME_CLAIM config '
                    'parameter.'
                )
            current_app.logger.error(error_msg)
            return False, gettext(error_msg)

        additional_claims = None
        if 'OAUTH2_ADDITIONAL_CLAIMS' in self.oauth2_config[
                self.oauth2_current_client]:

            additional_claims = self.oauth2_config[
                self.oauth2_current_client
            ]['OAUTH2_ADDITIONAL_CLAIMS']

        # For OIDC providers, check ID token claims first, then userinfo
        # For non-OIDC providers, check userinfo only
        if self._is_oidc_provider():
            valid_idtoken, reason = self.__is_any_claim_valid(
                id_token_claims, additional_claims)
            current_app.logger.debug(
                f'ID token claim keys: {id_token_claims_keys}'
            )
            current_app.logger.debug(
                f'ID token validation reason: {reason}'
            )

            # If ID token validation succeeds, we're done
            if valid_idtoken:
                valid_combined = True
            else:
                # Fall back to userinfo profile
                valid_profile, reason = self.__is_any_claim_valid(
                    profile_dict, additional_claims)
                current_app.logger.debug(
                    f'Profile claim keys: {profile_dict_keys}'
                )
                current_app.logger.debug(
                    f'Profile validation reason: {reason}'
                )
                valid_combined = valid_profile
        else:
            # Non-OIDC: only check userinfo profile
            valid_combined, reason = self.__is_any_claim_valid(
                profile_dict, additional_claims)
            current_app.logger.debug(
                f'Profile claim keys: {profile_dict_keys}'
            )
            current_app.logger.debug(
                f'Validation reason: {reason}'
            )

        if not valid_combined:
            return_msg = (
                'The user is not authorized to login based on your identity '
                'profile. Please contact your administrator.'
            )

            additional_claim_names = []
            if isinstance(additional_claims, dict):
                additional_claim_names = sorted(additional_claims.keys())

            audit_msg = (
                f'The authenticated user {username} is not authorized to '
                'access pgAdmin based on OAUTH2 config. '
                'Reason: additional claims required. '
                f'additional_claim_names={additional_claim_names}, '
                f'profile_len={len(profile_dict)}, '
                f'profile_keys={profile_dict_keys}, '
                f'id_token_len={len(id_token_claims)}, '
                f'id_token_keys={id_token_claims_keys}.'
            )
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

        if 'OAUTH2_LOGOUT_URL' in self.oauth2_config[
                self.oauth2_current_client]:
            session['oauth2_logout_url'] = self.oauth2_config[
                self.oauth2_current_client]['OAUTH2_LOGOUT_URL']

        # For OIDC providers, parse the ID token JWT to extract claims.
        # We can skip the userinfo endpoint call if the ID token has
        # sufficient claims for authentication and authorization.
        if self._is_oidc_provider():
            id_token_claims = self._get_id_token_claims()
            # Check if we have basic required claims in ID token
            has_sufficient_claims = any([
                'email' in id_token_claims,
                'preferred_username' in id_token_claims,
                'sub' in id_token_claims
            ])

            # Default to requiring the userinfo endpoint unless we can prove
            # the ID token claims are sufficient for our configured needs.
            needs_userinfo = True

            if has_sufficient_claims:
                provider = self.oauth2_config.get(
                    self.oauth2_current_client, {}
                )
                username_claim = provider.get('OAUTH2_USERNAME_CLAIM')
                additional_claims = provider.get('OAUTH2_ADDITIONAL_CLAIMS')

                # If custom username claim or additional authorization
                #  claims are configured, they may exist only in userinfo;
                # don't skip userinfo unless ID token has them.
                needs_userinfo = False
                if username_claim and username_claim not in id_token_claims:
                    needs_userinfo = True
                if isinstance(additional_claims, dict) and additional_claims:
                    missing_authz_keys = [
                        k for k in additional_claims.keys()
                        if k not in id_token_claims
                    ]
                    if missing_authz_keys:
                        needs_userinfo = True

            if has_sufficient_claims and not needs_userinfo:
                current_app.logger.debug(
                    'OIDC provider: using parsed ID token JWT claims, '
                    'skipping userinfo endpoint')
                # Return ID token claims as profile
                return id_token_claims
            else:
                current_app.logger.debug(
                    'OIDC provider: ID token JWT lacks standard claims, '
                    'falling back to userinfo endpoint')

        # For non-OIDC providers or when ID token is insufficient,
        # call the userinfo endpoint
        if 'OAUTH2_USERINFO_ENDPOINT' not in self.oauth2_config[
                self.oauth2_current_client]:
            if self._is_oidc_provider():
                # OIDC provider should have provided claims in ID token
                current_app.logger.warning(
                    'OIDC provider has no userinfo endpoint configured '
                    'and ID token lacks standard claims')
            else:
                current_app.logger.error(
                    'OAUTH2_USERINFO_ENDPOINT not configured for '
                    'non-OIDC provider')
            return {}

        resp = self.oauth2_clients[self.oauth2_current_client].get(
            self.oauth2_config[
                self.oauth2_current_client]['OAUTH2_USERINFO_ENDPOINT'],
            token=session['oauth2_token']
        )
        resp.raise_for_status()
        return resp.json()

    def authenticate(self, form):
        # Prefer the explicit oauth2 button value.
        # Avoid raising BadRequestKeyError when oauth2 isn't selected.
        self.oauth2_current_client = request.form.get('oauth2_button')
        if not self.oauth2_current_client:
            return False, gettext('No OAuth2 provider selected.')
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
                return True, reason
        reason = "No match was found."
        return False, reason
