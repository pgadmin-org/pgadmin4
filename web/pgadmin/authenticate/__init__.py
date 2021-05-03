##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Authentication."""

import flask
import pickle
from flask import current_app, flash, Response, request, url_for,\
    render_template
from flask_babelex import gettext
from flask_security import current_user, login_required
from flask_security.views import _security, _ctx
from flask_security.utils import config_value, get_post_logout_redirect, \
    get_post_login_redirect, logout_user
from pgadmin.utils.ajax import make_json_response, internal_server_error
import os

from flask import session

import config
from pgadmin.utils import PgAdminModule
from pgadmin.utils.constants import KERBEROS
from pgadmin.utils.csrf import pgCSRFProtect

from .registry import AuthSourceRegistry

MODULE_NAME = 'authenticate'


class AuthenticateModule(PgAdminModule):
    def get_exposed_url_endpoints(self):
        return ['authenticate.login',
                'authenticate.kerberos_login',
                'authenticate.kerberos_logout',
                'authenticate.kerberos_update_ticket',
                'authenticate.kerberos_validate_ticket']


blueprint = AuthenticateModule(MODULE_NAME, __name__, static_url_path='')


@blueprint.route("/login/kerberos",
                 endpoint="kerberos_login", methods=["GET"])
@pgCSRFProtect.exempt
def kerberos_login():
    logout_user()
    return Response(render_template("browser/kerberos_login.html",
                                    login_url=url_for('security.login'),
                                    ))


@blueprint.route("/logout/kerberos",
                 endpoint="kerberos_logout", methods=["GET"])
@pgCSRFProtect.exempt
def kerberos_logout():
    logout_user()
    if 'KRB5CCNAME' in session:
        # Remove the credential cache
        cache_file_path = session['KRB5CCNAME'].split(":")[1]
        if os.path.exists(cache_file_path):
            os.remove(cache_file_path)

    return Response(render_template("browser/kerberos_logout.html",
                                    login_url=url_for('security.login'),
                                    ))


@blueprint.route('/login', endpoint='login', methods=['GET', 'POST'])
def login():
    """
    Entry point for all the authentication sources.
    The user input will be validated and authenticated.
    """
    form = _security.login_form()
    auth_obj = AuthSourceManager(form, config.AUTHENTICATION_SOURCES)
    session['_auth_source_manager_obj'] = None

    # Validate the user
    if not auth_obj.validate():
        for field in form.errors:
            for error in form.errors[field]:
                flash(error, 'warning')
            return flask.redirect(get_post_logout_redirect())

    # Authenticate the user
    status, msg = auth_obj.authenticate()
    if status:
        # Login the user
        status, msg = auth_obj.login()
        current_auth_obj = auth_obj.as_dict()
        if not status:
            if current_auth_obj['current_source'] ==\
                    KERBEROS:
                return flask.redirect('{0}?next={1}'.format(url_for(
                    'authenticate.kerberos_login'), url_for('browser.index')))

            flash(msg, 'danger')
            return flask.redirect(get_post_logout_redirect())

        session['_auth_source_manager_obj'] = current_auth_obj
        return flask.redirect(get_post_login_redirect())

    elif isinstance(msg, Response):
        return msg
    flash(msg, 'danger')
    response = flask.redirect(get_post_logout_redirect())
    return response


class AuthSourceManager():
    """This class will manage all the authentication sources.
     """
    def __init__(self, form, sources):
        self.form = form
        self.auth_sources = sources
        self.source = None
        self.source_friendly_name = None
        self.current_source = None

    def as_dict(self):
        """
        Returns the dictionary object representing this object.
        """

        res = dict()
        res['source_friendly_name'] = self.source_friendly_name
        res['auth_sources'] = self.auth_sources
        res['current_source'] = self.current_source

        return res

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
        for src in self.auth_sources:
            source = get_auth_sources(src)
            if source.validate(self.form):
                return True
        return False

    def authenticate(self):
        """Authenticate through all the sources."""
        status = False
        msg = None
        for src in self.auth_sources:
            source = get_auth_sources(src)
            current_app.logger.debug(
                "Authentication initiated via source: %s" %
                source.get_source_name())

            if self.form.data['email'] and self.form.data['password'] and \
                    source.get_source_name() == KERBEROS:
                msg = gettext('pgAdmin internal user authentication'
                              ' is not enabled, please contact administrator.')
                continue

            status, msg = source.authenticate(self.form)

            # When server sends Unauthorized header to get the ticket over HTTP
            # OR When kerberos authentication failed while accessing pgadmin,
            # we need to break the loop as no need to authenticate further
            # even if the authentication sources set to multiple
            if not status:
                if (hasattr(msg, 'status') and
                    msg.status == '401 UNAUTHORIZED') or\
                        (source.get_source_name() ==
                         KERBEROS and
                         request.method == 'GET'):
                    break

            if status:
                self.set_source(source)
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
        return status, msg


def get_auth_sources(type):
    """Get the authenticated source object from the registry"""

    auth_sources = getattr(current_app, '_pgadmin_auth_sources', None)

    if auth_sources is None or not isinstance(auth_sources, dict):
        auth_sources = dict()

    if type in auth_sources:
        return auth_sources[type]

    auth_source = AuthSourceRegistry.create(type)

    if auth_source is not None:
        auth_sources[type] = auth_source
        setattr(current_app, '_pgadmin_auth_sources', auth_sources)

    return auth_source


def init_app(app):
    auth_sources = dict()

    setattr(app, '_pgadmin_auth_sources', auth_sources)
    AuthSourceRegistry.load_auth_sources()

    return auth_sources


@blueprint.route("/kerberos/update_ticket",
                 endpoint="kerberos_update_ticket", methods=["GET"])
@pgCSRFProtect.exempt
@login_required
def kerberos_update_ticket():
    """
    Update the kerberos ticket.
    """
    from werkzeug.datastructures import Headers
    headers = Headers()

    authorization = request.headers.get("Authorization", None)

    if authorization is None:
        # Send the Negotiate header to the client
        # if Kerberos ticket is not found.
        headers.add('WWW-Authenticate', 'Negotiate')
        return Response("Unauthorised", 401, headers)
    else:
        source = get_auth_sources(KERBEROS)
        auth_header = authorization.split()
        in_token = auth_header[1]

        # Validate the Kerberos ticket
        status, context = source.negotiate_start(in_token)
        if status:
            return Response("Ticket updated successfully.")

        return Response(context, 500)


@blueprint.route("/kerberos/validate_ticket",
                 endpoint="kerberos_validate_ticket", methods=["GET"])
@pgCSRFProtect.exempt
@login_required
def kerberos_validate_ticket():
    """
    Return the kerberos ticket lifetime left after getting the
    ticket from the credential cache
    """
    import gssapi

    try:
        del_creds = gssapi.Credentials(store={'ccache': session['KRB5CCNAME']})
        creds = del_creds.acquire(store={'ccache': session['KRB5CCNAME']})
    except Exception as e:
        current_app.logger.exception(e)
        return internal_server_error(errormsg=str(e))

    return make_json_response(
        data={'ticket_lifetime': creds.lifetime},
        status=200
    )
