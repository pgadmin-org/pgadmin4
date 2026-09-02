##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Webserver authentication."""

import hmac
import ipaddress
import secrets
import string
import config
from flask import request, current_app, session, Response, render_template, \
    url_for
from flask_babel import gettext
from flask_security import login_user
from .internal import BaseAuthentication
from pgadmin.model import User
from pgadmin.tools.user_management import create_user
from pgadmin.utils.constants import WEBSERVER
from pgadmin.utils import PgAdminModule
from pgadmin.utils.csrf import pgCSRFProtect
from flask_security.utils import logout_user
from pgadmin.utils.master_password import set_crypt_key


def _is_cgi_var_name(name):
    """Return True only for a genuine CGI/WSGI environment variable name,
    e.g. REMOTE_USER. Anything HTTP_-prefixed or hyphenated is, in practice,
    a client-supplied HTTP header (e.g. HTTP_X_FORWARDED_USER or
    X-Forwarded-User), so it must never be trusted as-is.
    """
    return bool(name) and not name.startswith('HTTP_') and '-' not in name


def _get_untrusted_peer_addr():
    """Return the raw peer address of the socket that connected to pgAdmin,
    ignoring anything ProxyFix derived from a client-controlled
    X-Forwarded-For header. request.remote_addr is NOT safe for this
    purpose: with the default PROXY_X_FOR_COUNT = 1, ProxyFix rewrites it
    from X-Forwarded-For even when nothing is actually in front of pgAdmin.
    """
    orig = request.environ.get('werkzeug.proxy_fix.orig', {})
    return orig.get('REMOTE_ADDR') or request.environ.get('REMOTE_ADDR')


def _peer_is_trusted_proxy():
    """Check the raw peer address against WEBSERVER_TRUSTED_PROXIES. Never
    raises - a malformed config entry or an unparseable/missing peer address
    is treated as untrusted, with a warning logged for the operator.
    """
    peer_addr = _get_untrusted_peer_addr()
    if not peer_addr:
        current_app.logger.warning(
            "Webserver auth: could not determine the peer address; "
            "rejecting the header-asserted identity.")
        return False

    try:
        peer = ipaddress.ip_address(peer_addr)
    except ValueError:
        current_app.logger.warning(
            "Webserver auth: peer address {0} is not a valid IP; "
            "rejecting the header-asserted identity.".format(peer_addr))
        return False

    for entry in config.WEBSERVER_TRUSTED_PROXIES:
        try:
            network = ipaddress.ip_network(entry, strict=False)
        except ValueError:
            current_app.logger.warning(
                "Webserver auth: WEBSERVER_TRUSTED_PROXIES entry {0} is "
                "not a valid IP/CIDR; ignoring it.".format(entry))
            continue
        if peer in network:
            return True

    current_app.logger.warning(
        "Webserver auth: peer {0} is not in WEBSERVER_TRUSTED_PROXIES; "
        "rejecting the header-asserted identity.".format(peer_addr))
    return False


def _shared_secret_matches():
    """When a shared secret is configured, require the proxy to have sent
    it back in the configured header, compared with hmac.compare_digest to
    avoid a timing side-channel. When no secret is configured, this check is
    skipped (returns True).
    """
    if not config.WEBSERVER_SHARED_SECRET:
        return True

    supplied = request.headers.get(config.WEBSERVER_SHARED_SECRET_HEADER)
    if not supplied:
        return False
    return hmac.compare_digest(supplied, config.WEBSERVER_SHARED_SECRET)


def _get_trusted_value(name):
    """Read a value that the client cannot forge: the WSGI/CGI environment,
    but only for a genuine CGI variable name (see _is_cgi_var_name). Any
    HTTP_-prefixed or hyphenated name is, under this WSGI server, indistin-
    guishable from a client-supplied header, so it is never read here.
    """
    if not _is_cgi_var_name(name):
        return None
    return request.environ.get(name)


def _get_header_value(name):
    """Read a value from an inbound HTTP request header - a client-
    controlled source. Only returned when the operator has explicitly
    opted in via WEBSERVER_REMOTE_USER_FROM_HEADER, the request came from a
    peer listed in WEBSERVER_TRUSTED_PROXIES, and (if configured) the
    shared secret matches.
    """
    if not config.WEBSERVER_REMOTE_USER_FROM_HEADER:
        return None
    if not _peer_is_trusted_proxy():
        return None
    if not _shared_secret_matches():
        current_app.logger.warning(
            "Webserver auth: shared secret mismatch; rejecting the "
            "header-asserted identity.")
        return None
    return request.headers.get(name)


class WebserverModule(PgAdminModule):
    def register(self, app, options):
        # Do not look for the sub_modules,
        # instead call blueprint.register(...) directly
        super().register(app, options)

    def get_exposed_url_endpoints(self):
        return ['webserver.login',
                'webserver.logout']


def init_app(app):
    MODULE_NAME = 'webserver'

    blueprint = WebserverModule(MODULE_NAME, __name__, static_url_path='')

    @blueprint.route("/login",
                     endpoint="login", methods=["GET"])
    @pgCSRFProtect.exempt
    def webserver_login():
        logout_user()
        return Response(render_template("browser/kerberos_login.html",
                                        login_url=url_for('security.login'),
                                        ))

    @blueprint.route("/logout",
                     endpoint="logout", methods=["GET"])
    @pgCSRFProtect.exempt
    def webserver_logout():
        logout_user()
        return Response(render_template("browser/kerberos_logout.html",
                                        login_url=url_for('security.login'),
                                        ))

    app.register_blueprint(blueprint)


class WebserverAuthentication(BaseAuthentication):
    LOGIN_VIEW = 'webserver.login'
    LOGOUT_VIEW = 'webserver.logout'

    def get_source_name(self):
        return WEBSERVER

    def get_friendly_name(self):
        return gettext("webserver")

    def validate(self, form):
        return True, None

    def get_user(self):
        username = _get_trusted_value(config.WEBSERVER_REMOTE_USER)
        if not username:
            # Gated fallback: only for deployments that have explicitly
            # opted in to trusting a header-asserted identity. See
            # _get_header_value() for the checks this requires.
            username = _get_header_value(config.WEBSERVER_REMOTE_USER)
        return username

    def authenticate(self, form):
        username = self.get_user()

        if not username:
            return False, gettext(
                "Webserver authenticate failed.")

        session['pass_enc_key'] = ''.join(
            (secrets.choice(string.ascii_lowercase) for _ in range(10)))

        useremail = _get_trusted_value('mail')
        if not useremail:
            useremail = ''
        return self.__auto_create_user(username, '')

    def login(self, form):
        username = self.get_user()
        if username:
            user = User.query.filter_by(username=username).first()
            if user is None:
                current_app.logger.exception(self.messages('LOGIN_FAILED'))
                return False, self.messages('LOGIN_FAILED')
            # Defense in depth: a header-asserted identity must never be
            # able to log in an account that was not created via Webserver
            # authentication (e.g. the internal default admin), even if the
            # trust gate above is misconfigured.
            if user.auth_source != WEBSERVER:
                current_app.logger.warning(
                    "Webserver auth: rejecting login for {0}, whose "
                    "auth_source is {1}, not {2}.".format(
                        username, user.auth_source, WEBSERVER))
                return False, self.messages('LOGIN_FAILED')
            status = login_user(user)
            if not status:
                current_app.logger.exception(self.messages('LOGIN_FAILED'))
                return False, self.messages('LOGIN_FAILED')
            current_app.logger.info(
                "Webserver user {0} logged in.".format(username))
            return True, None
        return False, self.messages('LOGIN_FAILED')

    def __auto_create_user(self, username, useremail):
        """Add the webserver user to the internal SQLite database."""
        if config.WEBSERVER_AUTO_CREATE_USER:
            user = User.query.filter_by(username=username).first()
            if not user:
                create_msg = ("Creating user {0} with email {1} "
                              "from auth source Webserver.")
                current_app.logger.info(create_msg.format(username,
                                                          useremail))
                return create_user({
                    'username': username,
                    'email': useremail,
                    'role': 2,
                    'active': True,
                    'auth_source': WEBSERVER
                })
        return True, None
