##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Token authentication of servers.

Every server authentication method other than ``password`` pairs a token
provider with a token delivery:

* A token provider is a callable that, given the server's connection
  parameters (and the current request's OAuth2 login), returns an access
  token or raises an ``OAuthTokenError``.
* A token delivery is how that token reaches the server: through the
  libpq 18 OAUTHBEARER hook, or in place of a password.

The registry maps each method to its pair, and the connection class asks
it at every point that opens a physical connection (connect, async connect,
reset and cancel). A new identity provider plugs in as one new token
provider registered with an existing delivery.
"""

from collections import namedtuple
from contextlib import contextmanager

from pgadmin.utils import pg_oauth2
from pgadmin.utils.ajax import make_json_response
from pgadmin.utils.auth_method import AUTH_METHOD_ENTRA, \
    AUTH_METHOD_OAUTH_DIRECT, AUTH_METHOD_OAUTH_EXCHANGE, \
    AUTH_METHOD_PASSWORD, ENTRA_SSL_ERROR, is_entra_ssl_valid

# check is optional: a callable taking the server's connection parameters
# that returns an error message when the server must not be sent a token.
TokenAuthMethod = namedtuple(
    'TokenAuthMethod', ['provider', 'delivery', 'check'])


class OAuthBearerDelivery:
    """Deliver the token through PostgreSQL's OAUTHBEARER mechanism.

    The libpq 18 auth-data hook takes the token from the context set around
    the connection call, so the token is only visible to that call. This is
    the only delivery that needs libpq 18 and a supported psycopg
    implementation, and the hook installation checks both.
    """

    utility_password = False

    def prepare(self):
        try:
            pg_oauth2.install_oauth_hook()
        except RuntimeError as exc:
            raise pg_oauth2.OAuthTokenError(str(exc)) from None

    def scope(self, token):
        return pg_oauth2.oauth_token_context(token)

    def password(self, token, password):
        # OAUTHBEARER carries the credential; no password is sent.
        return None


class PasswordDelivery:
    """Deliver the token in place of a password.

    The token is the password of that one physical connection and is never
    stored. It works with any libpq and psycopg implementation, so it has
    no version checks.
    """

    utility_password = True

    def prepare(self):
        pass

    @contextmanager
    def scope(self, token):
        yield

    def password(self, token, password):
        return token


def _direct_provider(connection_params):
    """The pgAdmin login token itself."""
    return pg_oauth2.get_postgres_oauth_token(
        AUTH_METHOD_OAUTH_DIRECT,
        connection_params.get('oauth_client_id'),
        connection_params.get('oauth_scope'),
        connection_params.get('oauth_issuer'),
    )


def _exchange_provider(connection_params):
    """A token exchange (RFC 8693) for a token scoped to the database."""
    return pg_oauth2.get_postgres_oauth_token(
        AUTH_METHOD_OAUTH_EXCHANGE,
        connection_params.get('oauth_client_id'),
        connection_params.get('oauth_scope'),
        connection_params.get('oauth_issuer'),
    )


def _entra_provider(connection_params):
    """A token for Azure Database for PostgreSQL, obtained On-Behalf-Of
    the pgAdmin login."""
    return pg_oauth2.get_entra_obo_token()


def _entra_check(connection_params):
    return None if is_entra_ssl_valid(connection_params) else ENTRA_SSL_ERROR


_REGISTRY = {}


def register_token_auth_method(name, provider, delivery, check=None):
    _REGISTRY[name] = TokenAuthMethod(provider, delivery, check)


def unregister_token_auth_method(name):
    _REGISTRY.pop(name, None)


def get_token_auth_method(name):
    """Return the registered TokenAuthMethod of a method, else None."""
    return _REGISTRY.get(name)


register_token_auth_method(
    AUTH_METHOD_OAUTH_DIRECT, _direct_provider, OAuthBearerDelivery())
register_token_auth_method(
    AUTH_METHOD_OAUTH_EXCHANGE, _exchange_provider, OAuthBearerDelivery())
register_token_auth_method(
    AUTH_METHOD_ENTRA, _entra_provider, PasswordDelivery(), _entra_check)


@contextmanager
def token_connection(auth_method, connection_params, password=None):
    """Scope the credentials of one physical connection.

    Use it around the code that builds the connection string and opens the
    connection. It yields the password to put in the connection string: the
    given one for a password server, the token for password delivery and
    nothing for OAUTHBEARER, which gets the token through the libpq hook
    while the block runs. A fresh token is requested on every call and is
    gone when the block ends.

    Raises OAuthTokenError when the token cannot be obtained.
    """
    if not auth_method or auth_method == AUTH_METHOD_PASSWORD:
        # Never let a token scoped by an outer caller reach this connection.
        with pg_oauth2.oauth_token_context(None):
            yield password
        return

    method = get_token_auth_method(auth_method)
    if method is None:
        raise pg_oauth2.OAuthTokenError(
            'Unsupported server authentication method: {0}.'.format(
                auth_method))

    method.delivery.prepare()
    token = _fresh_token(method, connection_params)
    with method.delivery.scope(token):
        yield method.delivery.password(token, password)


def _fresh_token(method, connection_params):
    """Ask the token provider of a method for a new token."""
    # Refuse before asking for a token, so that no token is requested for a
    # server it must not be sent to.
    error = method.check(connection_params or {}) if method.check else None
    if error:
        raise pg_oauth2.OAuthTokenError(error)

    token = method.provider(connection_params or {})
    if not isinstance(token, str) or not token.strip() or '\0' in token:
        raise pg_oauth2.OAuthTokenError(
            'No access token is available for this server.')
    return token


def utility_password(auth_method, connection_params):
    """The password for a utility process (backup, restore, maintenance,
    psql) that connects to a server with a token method, else None.

    A utility is a separate process, so only a token delivered as the
    password reaches it: a new token for each process, in the environment of
    that process alone. The OAUTHBEARER token reaches a connection through a
    libpq hook of the process that opens it, which a utility cannot have.
    Raises OAuthTokenError when the token cannot be obtained.
    """
    method = get_token_auth_method(auth_method)
    if method is None or not method.delivery.utility_password:
        return None
    return _fresh_token(method, connection_params)


def sign_in_again_response(server, errmsg):
    """The connect response for a token that only a new sign-in can get.

    The connect dialogs show it as "Sign in again", which renews the
    pgAdmin login through the same OAuth2 provider, instead of asking for
    a database password. It uses the status of a request for credentials,
    which every connect dialog already treats as one.
    """
    return make_json_response(
        success=0, status=428,
        result={
            'sid': server.id,
            'server_label': server.name,
            'username': server.username,
            'errmsg': errmsg,
            'sign_in_again': True,
        })
