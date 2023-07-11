##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Spnego/Kerberos authentication."""

import base64
from os import environ, path, remove

from werkzeug.datastructures import Headers, MultiDict
from flask_babel import gettext
from flask import request, Response, session,\
    current_app, render_template, flash, url_for
from flask_security.views import _security
from flask_security.utils import logout_user
from flask_security import login_required

import config
from pgadmin.model import User
from pgadmin.tools.user_management import create_user
from pgadmin.utils.constants import KERBEROS, MessageType
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, internal_server_error


from pgadmin.authenticate.internal import BaseAuthentication
from pgadmin.authenticate import get_auth_sources
from pgadmin.utils.csrf import pgCSRFProtect


try:
    import gssapi
    KERBEROS_AUTH_AVAILABLE = True
except ImportError:
    # Do not fail at this time, as this could be a desktop mode.
    # Instead throw the runtime error, when the server attempts
    # to use this authentication method.
    KERBEROS_AUTH_AVAILABLE = False
except OSError:
    # On Windows, it fails with OSError, when KFW libraries not found.
    # Instead throw the runtime error, when the server attempts
    # to use this authentication method.
    KERBEROS_AUTH_AVAILABLE = False

# Set the Kerberos config file
if config.KRB_KTNAME and config.KRB_KTNAME != '<KRB5_KEYTAB_FILE>':
    environ['KRB5_KTNAME'] = config.KRB_KTNAME


class KerberosModule(PgAdminModule):
    def register(self, app, options):
        # Do not look for the sub_modules,
        # instead call blueprint.register(...) directly
        super().register(app, options)

    def get_exposed_url_endpoints(self):
        return ['kerberos.login',
                'kerberos.logout',
                'kerberos.update_ticket',
                'kerberos.validate_ticket']


def init_app(app):
    MODULE_NAME = 'kerberos'

    blueprint = KerberosModule(MODULE_NAME, __name__, static_url_path='')

    @blueprint.route("/login",
                     endpoint="login", methods=["GET"])
    @pgCSRFProtect.exempt
    def kerberos_login():
        logout_user()
        return Response(render_template("browser/kerberos_login.html",
                                        login_url=url_for('security.login'),
                                        ))

    @blueprint.route("/logout",
                     endpoint="logout", methods=["GET"])
    @pgCSRFProtect.exempt
    def kerberos_logout():
        logout_user()
        if 'KRB5CCNAME' in session:
            # Remove the credential cache
            cache_file_path = session['KRB5CCNAME'].split(":")[1]
            if path.exists(cache_file_path):
                remove(cache_file_path)

        return Response(render_template("browser/kerberos_logout.html",
                                        login_url=url_for('security.login'),
                                        ))

    @blueprint.route("/update_ticket",
                     endpoint="update_ticket", methods=["GET"])
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

    @blueprint.route("/validate_ticket",
                     endpoint="validate_ticket", methods=["GET"])
    @pgCSRFProtect.exempt
    @login_required
    def kerberos_validate_ticket():
        """
        Return the kerberos ticket lifetime left after getting the
        ticket from the credential cache
        """
        import gssapi

        try:
            del_creds = gssapi.Credentials(store={
                'ccache': session['KRB5CCNAME']})
            creds = del_creds.acquire(store={'ccache': session['KRB5CCNAME']})
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

        return make_json_response(
            data={'ticket_lifetime': creds.lifetime},
            status=200
        )

    app.register_blueprint(blueprint)


class KerberosAuthentication(BaseAuthentication):

    LOGIN_VIEW = 'kerberos.login'
    LOGOUT_VIEW = 'kerberos.logout'

    def get_source_name(self):
        return KERBEROS

    def get_friendly_name(self):
        return gettext("kerberos")

    def validate(self, form):
        return True, None

    def authenticate(self, frm):

        if KERBEROS_AUTH_AVAILABLE is not True:
            raise RuntimeError(gettext(
                "Kerberos authentication can't be used as"
                " GSSAPI module couldn't be loaded."
            ))

        retval = [True, None]
        negotiate = False
        headers = Headers()
        authorization = request.headers.get("Authorization", None)
        form_class = _security.forms.get('login_form').cls
        req_json = request.get_json(silent=True)

        if req_json:
            form = form_class(MultiDict(req_json))
        else:
            form = form_class()

        try:
            if authorization is not None:
                auth_header = authorization.split()
                if auth_header[0] == 'Negotiate':
                    status, negotiate = self.negotiate_start(auth_header[1])

                    if status:
                        # Saving the first 15 characters of the kerberos key
                        # to encrypt/decrypt database password
                        session['pass_enc_key'] = auth_header[1][0:15]
                        # Create user
                        retval = self.__auto_create_user(
                            str(negotiate.initiator_name))
                    elif isinstance(negotiate, Exception):
                        flash(gettext(negotiate), MessageType.ERROR)
                        retval = [status,
                                  Response(render_template(
                                      "security/login_user.html",
                                      login_user_form=form))]
                    else:
                        headers.add('WWW-Authenticate', 'Negotiate ' +
                                    str(base64.b64encode(negotiate), 'utf-8'))
                        return False, Response("Success", 200, headers)
            else:
                flash(gettext("Kerberos authentication failed. Couldn't find "
                              "kerberos ticket."), MessageType.ERROR)
                headers.add('WWW-Authenticate', 'Negotiate')
                retval = [False,
                          Response(render_template(
                              "security/login_user.html",
                              login_user_form=form), 401, headers)]
        finally:
            if negotiate is not False:
                self.negotiate_end(negotiate)
        return retval

    def negotiate_start(self, in_token):
        svc_princ = gssapi.Name('HTTP@%s' % config.KRB_APP_HOST_NAME,
                                name_type=gssapi.NameType.hostbased_service)
        cname = svc_princ.canonicalize(gssapi.MechType.kerberos)

        try:
            server_creds = gssapi.Credentials(usage='accept', name=cname)
            context = gssapi.SecurityContext(creds=server_creds)
            out_token = context.step(base64.b64decode(in_token))
        except Exception as e:
            current_app.logger.exception(e)
            return False, e

        if out_token and not context.complete:
            return False, out_token
        if context.complete:
            deleg_creds = context.delegated_creds
            if not hasattr(deleg_creds, 'name'):
                error_msg = gettext('Delegated credentials not supplied.')
                current_app.logger.error(error_msg)
                return False, Exception(error_msg)
            try:
                cache_file_path = path.join(
                    config.KERBEROS_CCACHE_DIR, 'pgadmin_cache_{0}'.format(
                        deleg_creds.name)
                )
                CCACHE = 'FILE:{0}'.format(cache_file_path)
                store = {'ccache': CCACHE}
                deleg_creds.store(store, overwrite=True, set_default=True)
                session['KRB5CCNAME'] = CCACHE
            except Exception as e:
                current_app.logger.exception(e)
                return False, e

            return True, context
        else:
            return False, None

    def negotiate_end(self, context):
        # Free Delegated Credentials
        del_creds = getattr(context, 'delegated_creds', None)
        if del_creds:
            deleg_creds = context.delegated_creds
            del deleg_creds

    def __auto_create_user(self, username):
        """Add the kerberos user to the internal SQLite database."""
        username = str(username)
        if config.KRB_AUTO_CREATE_USER:
            user = User.query.filter_by(
                username=username, auth_source=KERBEROS).first()
            if user is None:
                create_msg = ("Creating user {0} with email {1} "
                              "from auth source KERBEROS.")
                current_app.logger.info(create_msg.format(username,
                                                          username))
                return create_user({
                    'username': username,
                    'email': username,
                    'role': 2,
                    'active': True,
                    'auth_source': KERBEROS
                })

        return True, {'username': username}
