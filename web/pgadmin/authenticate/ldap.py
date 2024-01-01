##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the ldap authentication."""

import ssl
import config
from ldap3 import Connection, Server, Tls, ALL, ALL_ATTRIBUTES, ANONYMOUS,\
    SIMPLE, AUTO_BIND_TLS_BEFORE_BIND, AUTO_BIND_NO_TLS, set_config_parameter
from ldap3.core.exceptions import LDAPSocketOpenError, LDAPBindError,\
    LDAPInvalidScopeError, LDAPAttributeError, LDAPInvalidFilterError,\
    LDAPStartTLSError, LDAPSSLConfigurationError
from flask_babel import gettext
from urllib.parse import urlparse

from .internal import BaseAuthentication
from pgadmin.model import User, ServerGroup, db, Role
from flask import current_app
from pgadmin.tools.user_management import create_user
from pgadmin.utils.constants import LDAP
from sqlalchemy import func
from flask_security import login_user

ERROR_SEARCHING_LDAP_DIRECTORY = gettext(
    "Error searching the LDAP directory: {}")

ERROR_CONNECTING_LDAP_SERVER = gettext(
    "Error connecting to the LDAP server: {}\n")

if config.LDAP_IGNORE_MALFORMED_SCHEMA:
    set_config_parameter('IGNORE_MALFORMED_SCHEMA',
                         config.LDAP_IGNORE_MALFORMED_SCHEMA)


class LDAPAuthentication(BaseAuthentication):
    """Ldap Authentication Class"""

    def get_source_name(self):
        return LDAP

    def get_friendly_name(self):
        return gettext("ldap")

    def authenticate(self, form):
        self.username = form.data['email']
        self.password = form.data['password']
        self.dedicated_user = True
        self.start_tls = False
        user_email = None

        # Check the dedicated ldap user
        self.bind_user = getattr(config, 'LDAP_BIND_USER', None)
        self.bind_pass = getattr(config, 'LDAP_BIND_PASSWORD', None)

        # Check for the anonymous binding
        self.anonymous_bind = getattr(config, 'LDAP_ANONYMOUS_BIND', False)

        if self.bind_user and not self.bind_pass:
            return False, gettext(
                "LDAP configuration error: Set the bind password.")

        # if no dedicated ldap user is configured then use the login
        # username and password
        if not self.bind_user and not self.bind_pass and\
                self.anonymous_bind is False:

            user_dn = config.LDAP_BIND_FORMAT\
                .format(
                    LDAP_USERNAME=self.username,
                    LDAP_BASE_DN=config.LDAP_BASE_DN,
                    LDAP_USERNAME_ATTRIBUTE=config.LDAP_USERNAME_ATTRIBUTE
                )

            self.bind_user = user_dn
            self.bind_pass = self.password
            self.dedicated_user = False

        # Connect ldap server
        status, msg = self.connect()

        if not status:
            return status, msg

        status, ldap_user = self.search_ldap_user()

        if not status:
            return status, ldap_user

        # If dedicated user is configured
        if self.dedicated_user:
            # Get the user DN from the user ldap entry
            self.bind_user = ldap_user.entry_dn
            self.bind_pass = self.password
            self.anonymous_bind = False
            status, msg = self.connect()

            if not status:
                return status, msg

        if 'mail' in ldap_user:
            mail = ldap_user['mail'].value
            if isinstance(mail, list) and len(mail) > 0:
                user_email = mail[0]
            else:
                user_email = ldap_user['mail'].value

        return self.__auto_create_user(user_email)

    def connect(self):
        """Setup the connection to the LDAP server and authenticate the user.
        """
        status, server = self._configure_server()

        if not status:
            return status, server

        auto_bind = AUTO_BIND_TLS_BEFORE_BIND if self.start_tls \
            else AUTO_BIND_NO_TLS

        # Create the connection
        try:
            if self.anonymous_bind:
                self.conn = Connection(server,
                                       auto_bind=auto_bind,
                                       authentication=ANONYMOUS
                                       )
            else:
                self.conn = Connection(server,
                                       user=self.bind_user,
                                       password=self.bind_pass,
                                       auto_bind=auto_bind,
                                       authentication=SIMPLE
                                       )

        except LDAPSocketOpenError as e:
            current_app.logger.exception(
                ERROR_CONNECTING_LDAP_SERVER.format(e))
            return False, ERROR_CONNECTING_LDAP_SERVER.format(e.args[0])
        except LDAPBindError as e:
            current_app.logger.exception(
                "Error binding to the LDAP server.")
            return False, gettext("Error binding to the LDAP server: {}\n".
                                  format(e.args[0]))
        except LDAPStartTLSError as e:
            current_app.logger.exception(
                "Error starting TLS: {}\n".format(e))
            return False, gettext("Error starting TLS: {}\n"
                                  ).format(e.args[0])
        except Exception as e:
            current_app.logger.exception(
                ERROR_CONNECTING_LDAP_SERVER.format(e))
            return False, ERROR_CONNECTING_LDAP_SERVER.format(e.args[0])

        return True, None

    def login(self, form):
        user = getattr(form, 'user', None)
        if user is None:
            if config.LDAP_DN_CASE_SENSITIVE:
                user = User.query.filter_by(username=self.username).first()
            else:
                user = User.query.filter(
                    func.lower(User.username) == func.lower(
                        self.username)).first()

        if user is None:
            current_app.logger.exception(
                self.messages('USER_DOES_NOT_EXIST'))
            return False, self.messages('USER_DOES_NOT_EXIST')

        # Login user through flask_security
        status = login_user(user)
        if not status:
            current_app.logger.exception(self.messages('LOGIN_FAILED'))
            return False, self.messages('LOGIN_FAILED')
        current_app.logger.info(
            "LDAP user {0} logged in.".format(user))
        return True, None

    def __auto_create_user(self, user_email):
        """Add the ldap user to the internal SQLite database."""
        if config.LDAP_AUTO_CREATE_USER:
            if config.LDAP_DN_CASE_SENSITIVE:
                user = User.query.filter_by(username=self.username).first()
            else:
                user = User.query.filter(
                    func.lower(User.username) == func.lower(
                        self.username)).first()

            if user is None:
                create_msg = ("Creating user {0} with email {1} "
                              "from auth source LDAP.")
                current_app.logger.info(create_msg.format(self.username,
                                                          user_email))
                return create_user({
                    'username': self.username,
                    'email': user_email,
                    'role': 2,
                    'active': True,
                    'auth_source': LDAP
                })

        return True, None

    def __configure_tls(self):
        ca_cert_file = getattr(config, 'LDAP_CA_CERT_FILE', None)
        cert_file = getattr(config, 'LDAP_CERT_FILE', None)
        key_file = getattr(config, 'LDAP_KEY_FILE', None)
        cert_validate = ssl.CERT_NONE

        if ca_cert_file and cert_file and key_file:
            cert_validate = ssl.CERT_REQUIRED

        try:
            tls = Tls(
                local_private_key_file=key_file,
                local_certificate_file=cert_file,
                validate=cert_validate,
                version=ssl.PROTOCOL_TLSv1_2,
                ca_certs_file=ca_cert_file)
        except LDAPSSLConfigurationError as e:
            current_app.logger.exception(
                "LDAP configuration error: {}\n".format(e))
            return False, gettext("LDAP configuration error: {}\n").format(
                e.args[0])
        return True, tls

    def _configure_server(self):
        # Parse the server URI
        uri = getattr(config, 'LDAP_SERVER_URI', None)

        if uri:
            uri = urlparse(uri)

        # Create the TLS configuration object if required
        tls = None

        if isinstance(uri, str):
            return False, gettext(
                "LDAP configuration error: Set the proper LDAP URI.")

        if uri.scheme == 'ldaps' or config.LDAP_USE_STARTTLS:
            status, tls = self.__configure_tls()
            if not status:
                return status, tls

        if uri.scheme != 'ldaps' and config.LDAP_USE_STARTTLS:
            self.start_tls = True

        try:
            # Create the server object
            server = Server(uri.hostname,
                            port=uri.port,
                            use_ssl=(uri.scheme == 'ldaps'),
                            get_info=ALL,
                            tls=tls,
                            connect_timeout=config.LDAP_CONNECTION_TIMEOUT)
        except ValueError as e:
            return False, "LDAP configuration error: {}.".format(e)

        return True, server

    def search_ldap_user(self):
        """Get a list of users from the LDAP server based on config
         search criteria."""
        try:
            search_base_dn = config.LDAP_SEARCH_BASE_DN
            if (not search_base_dn or search_base_dn == '<Search-Base-DN>')\
                    and (self.anonymous_bind or self.dedicated_user):
                return False, gettext("LDAP configuration error: "
                                      "Set the Search Domain.")
            elif not search_base_dn or search_base_dn == '<Search-Base-DN>':
                search_base_dn = config.LDAP_BASE_DN

            search_filter = "({0}={1})".format(config.LDAP_USERNAME_ATTRIBUTE,
                                               self.username)
            if config.LDAP_SEARCH_FILTER:
                search_filter = "(&{0}{1})".format(search_filter,
                                                   config.LDAP_SEARCH_FILTER)

            self.conn.search(search_base=search_base_dn,
                             search_filter=search_filter,
                             search_scope=config.LDAP_SEARCH_SCOPE,
                             attributes=ALL_ATTRIBUTES
                             )

        except LDAPInvalidScopeError as e:
            current_app.logger.exception(
                ERROR_SEARCHING_LDAP_DIRECTORY.format(e.args[0])
            )
            return False, ERROR_SEARCHING_LDAP_DIRECTORY.format(e.args[0])
        except LDAPAttributeError as e:
            current_app.logger.exception(
                ERROR_SEARCHING_LDAP_DIRECTORY.format(e)
            )
            return False, ERROR_SEARCHING_LDAP_DIRECTORY.format(e.args[0])
        except LDAPInvalidFilterError as e:
            current_app.logger.exception(
                ERROR_SEARCHING_LDAP_DIRECTORY.format(e)
            )
            return False, ERROR_SEARCHING_LDAP_DIRECTORY.format(e.args[0])

        results = len(self.conn.entries)
        if results > 1:
            return False, ERROR_SEARCHING_LDAP_DIRECTORY.format(
                gettext("More than one result found."))
        elif results < 1:
            return False, ERROR_SEARCHING_LDAP_DIRECTORY.format(
                gettext("Could not find the specified user."))
        return True, self.conn.entries[0]
