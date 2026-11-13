##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Server authentication methods.

A server authentication method says how pgAdmin proves a database username's
identity to a server. Every method other than ``password`` is a token method:
it pairs a token provider with a token delivery (see pgadmin.utils.token_auth).
Kerberos is a separate setting on the server, not a server authentication
method.
"""

import config
from flask_babel import gettext

AUTH_METHOD_PASSWORD = 'password'
AUTH_METHOD_OAUTH_DIRECT = 'oauth_direct'
AUTH_METHOD_OAUTH_EXCHANGE = 'oauth_exchange'
AUTH_METHOD_ENTRA = 'entra'

# The values the application accepts. They are stored as plain strings and
# checked here rather than by a SQL enum, so a new method needs no migration.
AUTH_METHODS = (
    AUTH_METHOD_PASSWORD,
    AUTH_METHOD_OAUTH_DIRECT,
    AUTH_METHOD_OAUTH_EXCHANGE,
    AUTH_METHOD_ENTRA,
)


def is_valid_auth_method(auth_method):
    """True when auth_method is one of the accepted server authentication
    methods."""
    return auth_method in AUTH_METHODS


def is_token_auth_method(auth_method):
    """True for a method that authenticates with an access token."""
    return auth_method in AUTH_METHODS and \
        auth_method != AUTH_METHOD_PASSWORD


def check_kerberos_exclusive(auth_method, kerberos_conn):
    """Return an error message when Kerberos is combined with a token
    method, else None. A server never has two conflicting ways to
    authenticate."""
    if kerberos_conn and is_token_auth_method(auth_method):
        return gettext(
            'Kerberos authentication cannot be combined with the {0} '
            'authentication method.'
        ).format(auth_method)
    return None


def is_entra_ssl_valid(connection_params):
    """True when the connection parameters make the server verify its
    identity: the token is only sent to a server whose certificate and
    host name are verified. The host name itself is not restricted, so
    private endpoints with custom DNS work."""
    return (connection_params or {}).get('sslmode') == 'verify-full'


def check_entra_ssl(auth_method, connection_params):
    """Return an error message when an ``entra`` server does not verify the
    identity of the server it sends the token to, else None."""
    if auth_method == AUTH_METHOD_ENTRA and \
            not is_entra_ssl_valid(connection_params):
        return gettext(
            'The entra authentication method requires the connection '
            'parameter sslmode to be set to verify-full, so that the '
            'access token is only sent to a server whose identity is '
            'verified.')
    return None


def check_entra_available(auth_method):
    """Return an error message when the ``entra`` method is not available to
    the current user, else None. It needs server mode and a login through an
    OAuth2 provider that has On-Behalf-Of enabled."""
    if auth_method != AUTH_METHOD_ENTRA:
        return None
    # Import here: pg_oauth2 needs a Flask request to answer.
    from pgadmin.utils.pg_oauth2 import is_entra_obo_enabled
    if not config.SERVER_MODE:
        return gettext(
            'The entra authentication method is only available in server '
            'mode.')
    if not is_entra_obo_enabled():
        return gettext(
            'The entra authentication method is only available when you '
            'are logged in through an OAuth2 provider that has '
            'OAUTH2_ENTRA_OBO_ENABLED set.')
    return None


def check_auth_method(auth_method):
    """Return an error message for an unknown method, else None."""
    if is_valid_auth_method(auth_method):
        return None
    return gettext(
        'Invalid server authentication method: {0}. It must be one of: {1}.'
    ).format(auth_method, ', '.join(AUTH_METHODS))
