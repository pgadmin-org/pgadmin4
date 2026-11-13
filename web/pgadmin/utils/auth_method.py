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

from flask_babel import gettext

AUTH_METHOD_PASSWORD = 'password'
AUTH_METHOD_OAUTH_DIRECT = 'oauth_direct'
AUTH_METHOD_OAUTH_EXCHANGE = 'oauth_exchange'

# The values the application accepts. They are stored as plain strings and
# checked here rather than by a SQL enum, so a new method needs no migration.
AUTH_METHODS = (
    AUTH_METHOD_PASSWORD,
    AUTH_METHOD_OAUTH_DIRECT,
    AUTH_METHOD_OAUTH_EXCHANGE,
)


def is_valid_auth_method(auth_method):
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


def check_auth_method(auth_method):
    """Return an error message for an unknown method, else None."""
    if is_valid_auth_method(auth_method):
        return None
    return gettext(
        'Invalid server authentication method: {0}. It must be one of: {1}.'
    ).format(auth_method, ', '.join(AUTH_METHODS))
