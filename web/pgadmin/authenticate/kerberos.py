##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Spnego/Kerberos authentication."""

import base64
from os import environ

from werkzeug.datastructures import Headers
from flask_babelex import gettext
from flask import Flask, request, Response, session,\
    current_app, render_template, flash

import config
from pgadmin.model import User
from pgadmin.tools.user_management import create_user
from pgadmin.utils.constants import KERBEROS

from flask_security.views import _security
from werkzeug.datastructures import MultiDict

from .internal import BaseAuthentication

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


class KerberosAuthentication(BaseAuthentication):

    def get_source_name(self):
        return KERBEROS

    def get_friendly_name(self):
        return gettext("kerberos")

    def validate(self, form):
        return True

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
        form_class = _security.login_form

        if request.json:
            form = form_class(MultiDict(request.json))
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
                        session['kerberos_key'] = auth_header[1][0:15]
                        # Create user
                        retval = self.__auto_create_user(
                            str(negotiate.initiator_name))
                    elif isinstance(negotiate, Exception):
                        flash(gettext(negotiate), 'danger')
                        retval = [status,
                                  Response(render_template(
                                      "security/login_user.html",
                                      login_user_form=form))]
                    else:
                        headers.add('WWW-Authenticate', 'Negotiate ' +
                                    str(base64.b64encode(negotiate), 'utf-8'))
                        return False, Response("Success", 200, headers)
            else:
                flash(gettext("Kerberos authentication failed."
                              " Couldn't find kerberos ticket."), 'danger')
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
            return True, context
        else:
            return False, None

    def negotiate_end(self, context):
        # Free gss_cred_id_t
        del_creds = getattr(context, 'delegated_creds', None)
        if del_creds:
            deleg_creds = context.delegated_creds
            del(deleg_creds)

    def __auto_create_user(self, username):
        """Add the ldap user to the internal SQLite database."""
        username = str(username)
        if config.KRB_AUTO_CREATE_USER:
            user = User.query.filter_by(
                username=username).first()
            if user is None:
                return create_user({
                    'username': username,
                    'email': username,
                    'role': 2,
                    'active': True,
                    'auth_source': KERBEROS
                })

        return True, {'username': username}
