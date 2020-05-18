##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the ldap authentication."""

import ssl
import config
from ldap3 import Connection, Server, Tls, ALL, ALL_ATTRIBUTES
from ldap3.core.exceptions import LDAPSocketOpenError, LDAPBindError,\
    LDAPInvalidScopeError, LDAPAttributeError, LDAPInvalidFilterError,\
    LDAPStartTLSError, LDAPSSLConfigurationError
from flask_babelex import gettext
from urllib.parse import urlparse

from .internal import BaseAuthentication
from pgadmin.model import User, ServerGroup, db, Role
from flask import current_app
from pgadmin.tools.user_management import create_user


ERROR_SEARCHING_LDAP_DIRECTORY = "Error searching the LDAP directory: {}"


class LDAPAuthentication(BaseAuthentication):
    """Ldap Authentication Class"""

    def get_friendly_name(self):
        return gettext("ldap")

    def authenticate(self, form):
        self.username = form.data['email']
        self.password = form.data['password']

        status, msg = self.connect()

        if not status:
            return status, msg

        status, user_email = self.search_ldap_user()

        if not status:
            return status, user_email

        return self.__auto_create_user(user_email)

    def connect(self):
        """Setup the connection to the LDAP server and authenticate the user.
        """

        # Parse the server URI
        uri = getattr(config, 'LDAP_SERVER_URI', None)

        if uri:
            uri = urlparse(uri)

        # Create the TLS configuration object if required
        tls = None

        if type(uri) == str:
            return False, "LDAP configuration error: Set the proper LDAP URI."

        if uri.scheme == 'ldaps' or config.LDAP_USE_STARTTLS:

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
                return False, "LDAP configuration error: {}\n".format(
                    e.args[0])

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

        # Create the connection
        try:
            user_dn = "{0}={1},{2}".format(config.LDAP_USERNAME_ATTRIBUTE,
                                           self.username,
                                           config.LDAP_BASE_DN
                                           )
            self.conn = Connection(server,
                                   user=user_dn,
                                   password=self.password,
                                   auto_bind=True
                                   )

        except LDAPSocketOpenError as e:
            current_app.logger.exception(
                "Error connecting to the LDAP server: {}\n".format(e))
            return False, "Error connecting to the LDAP server:" \
                          " {}\n".format(e.args[0])
        except LDAPBindError as e:
            current_app.logger.exception(
                "Error binding to the LDAP server.")
            return False, "Error binding to the LDAP server."
        except Exception as e:
            current_app.logger.exception(
                "Error connecting to the LDAP server: {}\n".format(e))
            return False, "Error connecting to the LDAP server:" \
                          " {}\n".format(e.args[0])

        # Enable TLS if STARTTLS is configured
        if not uri.scheme == 'ldaps' and config.LDAP_USE_STARTTLS:
            try:
                self.conn.start_tls()
            except LDAPStartTLSError as e:
                current_app.logger.exception(
                    "Error starting TLS: {}\n".format(e))
                return False, "Error starting TLS: {}\n".format(e.args[0])

        return True, None

    def __auto_create_user(self, user_email):
        """Add the ldap user to the internal SQLite database."""
        if config.LDAP_AUTO_CREATE_USER:
            user = User.query.filter_by(
                username=self.username).first()
            if user is None:
                return create_user({
                    'username': self.username,
                    'email': user_email,
                    'role': 2,
                    'active': True,
                    'auth_source': 'ldap'
                })

        return True, None

    def search_ldap_user(self):
        """Get a list of users from the LDAP server based on config
         search criteria."""
        try:
            search_base_dn = config.LDAP_SEARCH_BASE_DN
            if search_base_dn is None or search_base_dn == '' or\
                    search_base_dn == '<Search-Base-DN>':
                search_base_dn = config.LDAP_BASE_DN
            self.conn.search(search_base=search_base_dn,
                             search_filter=config.LDAP_SEARCH_FILTER,
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

        for entry in self.conn.entries:
            user_email = None
            if config.LDAP_USERNAME_ATTRIBUTE in entry and self.username == \
                    entry[config.LDAP_USERNAME_ATTRIBUTE].value:
                if 'mail' in entry:
                    user_email = entry['mail'].value
                return True, user_email
        return False, ERROR_SEARCHING_LDAP_DIRECTORY.format(
            "Could not find the specified user.")
