##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Kerberos Environment Locker class
"""

from threading import Lock
from os import environ
from flask import session, current_app
from flask_babel import gettext
from psycopg.conninfo import conninfo_to_dict

import config
from pgadmin.utils import NO_CLIENT_FILE
from pgadmin.utils.constants import KERBEROS

# In server mode, the Kerberos environment for a connection that must not
# use any Kerberos credentials: a credential cache and a client keytab that
# cannot exist or be created (see NO_CLIENT_FILE). Without KRB5CCNAME, the
# Kerberos library uses the default credential cache of the account pgAdmin
# runs as, and libpq answers a server's request for GSSAPI authentication
# with that account's ticket, whatever user name the pgAdmin user gave;
# gssencmode=disable does not prevent that. A cache that does not exist but
# could be created is not enough either, as the library fills it from the
# account's client keytab, if it has one, so that is disabled too.
NO_KERBEROS_CREDENTIALS = {
    'KRB5CCNAME': 'FILE:' + NO_CLIENT_FILE,
    'KRB5_CLIENT_KTNAME': 'FILE:' + NO_CLIENT_FILE,
}


# The first libpq versions to know the require_auth and gssencmode
# connection parameters.
REQUIRE_AUTH_MIN_LIBPQ = 160000
GSSENCMODE_MIN_LIBPQ = 120000


class KerberosNotAllowed(PermissionError):
    """The server's require_auth setting would allow only GSSAPI or SSPI
    authentication, which this connection may not use."""


def libpq_version():
    """
    Return the version of the libpq that pgAdmin's own connections use.
    This is deliberately not cached.
    """
    # Imported here as modules of pgAdmin are imported where libpq is
    # not installed.
    import psycopg
    return psycopg.pq.version()


def kerberos_allowed(is_kerberos_conn):
    """
    Return True if, in server mode, the current user may use Kerberos for a
    connection: they logged in to pgAdmin with Kerberos, and have delegated
    credentials, and the connection is to a server with Kerberos
    authentication enabled.
    """
    if not (config.SERVER_MODE and is_kerberos_conn):
        return False
    try:
        source = session.get('auth_source_manager', {}).get(
            'current_source')
        return source == KERBEROS and 'KRB5CCNAME' in session
    except RuntimeError:
        # No request context: no user, so no credentials.
        return False


def kerberos_environ(is_kerberos_conn=False):
    """
    Return the Kerberos environment variables for a connection, or for a
    process that connects, on behalf of the current user.

    In server mode only a user who logged in to pgAdmin with Kerberos has
    credentials, the ones delegated at login, and they are used only for a
    connection that is to use Kerberos. Otherwise, and when there is no
    request context, no credentials are available at all. Desktop mode
    leaves the environment alone, so the user's own credentials are used.
    """
    if not config.SERVER_MODE:
        return {}

    env = dict(NO_KERBEROS_CREDENTIALS)
    if kerberos_allowed(is_kerberos_conn):
        env['KRB5CCNAME'] = session['KRB5CCNAME']
    return env


def refused_auth_methods(is_kerberos_conn):
    """
    Return the authentication methods libpq must refuse for a connection.

    The environment variables above do not stop libpq on Windows using
    SSPI, with the logon of the account pgAdmin runs as, or a gssproxy
    service supplying credentials, so in server mode libpq is also told to
    refuse them. SSPI is never wanted, as it cannot use a user's delegated
    credentials.
    """
    if not config.SERVER_MODE:
        return ()
    if kerberos_allowed(is_kerberos_conn):
        return ('sspi',)
    return ('gss', 'sspi')


def merge_require_auth(value, refused):
    """
    Return the require_auth value to use in place of the server's own,
    so that the authentication methods in refused are not accepted.

    A value that lists methods to refuse, each starting with '!', has
    those added to. A value that lists methods to accept has the refused
    ones removed from it, and the connection is not allowed if none are
    left. A value mixing the two is returned unchanged, as libpq rejects
    it.
    """
    if not refused:
        return value

    tokens = [t.strip() for t in str(value or '').split(',')]
    tokens = [t for t in tokens if t]

    if not tokens:
        return ','.join('!' + m for m in refused)

    negated = [t.startswith('!') for t in tokens]
    if all(negated):
        present = {t[1:].strip().lower() for t in tokens}
        return ','.join(
            tokens + ['!' + m for m in refused if m not in present])

    if any(negated):
        return value

    kept = [t for t in tokens if t.lower() not in refused]
    if not kept:
        raise KerberosNotAllowed(gettext(
            'The "Require authentication" (require_auth) parameter of the '
            'server allows only GSSAPI or SSPI authentication. In server '
            'mode, a server that allows only GSSAPI can be used only by a '
            'user who logged in with Kerberos, connecting to a server with '
            'Kerberos authentication enabled, and a server that allows '
            'only SSPI cannot be used. Change require_auth in the '
            'properties of the server.'))
    return ','.join(kept)


def apply_kerberos_conn_params(params, is_kerberos_conn, add_missing=True,
                               names=None):
    """
    In server mode, update the libpq connection parameters in params, in
    place, so that libpq refuses GSSAPI and SSPI authentication and GSSAPI
    encryption for a connection that may not use Kerberos, and SSPI always,
    and so that a connection that may use Kerberos does it with GSSAPI.

    :param params: a dict of connection parameters, or of environment
        variables if names is given.
    :param is_kerberos_conn: whether the server has Kerberos enabled.
    :param add_missing: add a parameter that is not in params only if
        pgAdmin's own libpq knows it, as a libpq that does not fails to
        parse a connection string containing it. It does not apply to the
        environment, as a utility with an older libpq ignores the variable
        and one with a newer libpq does not depend on pgAdmin's.
    :param names: maps 'require_auth', 'gssencmode' and 'gsslib' to the
        keys to use instead, for environment variables.
    """
    if not config.SERVER_MODE:
        return

    names = names or {}
    in_env = bool(names)
    require_auth = names.get('require_auth', 'require_auth')
    gssencmode = names.get('gssencmode', 'gssencmode')
    gsslib = names.get('gsslib', 'gsslib')
    ver = libpq_version() if add_missing and not in_env else None
    allowed = kerberos_allowed(is_kerberos_conn)

    # Each forced parameter is popped before it is set, so it is re-inserted
    # at the end of params. make_conninfo() does not escape keys, so a
    # crafted key such as 'application_name=c require_auth' serialises its
    # own require_auth=; libpq takes the last of a duplicated keyword, so
    # the forced value must come last to win over any such smuggled value,
    # whatever position the user's own require_auth/gssencmode/gsslib held.
    #
    # A parameter the user left empty is as good as unset. It is dropped
    # where it is not replaced, as an empty value is invalid for a libpq
    # that does not know the parameter.
    #
    # GSSAPI encryption is left as the user set it only where Kerberos is
    # allowed.
    if not allowed and (
            in_env or params.get(gssencmode) or
            (ver is not None and ver >= GSSENCMODE_MIN_LIBPQ)):
        params.pop(gssencmode, None)
        params[gssencmode] = 'disable'
    elif not params.get(gssencmode):
        params.pop(gssencmode, None)

    # A libpq built with both GSSAPI and SSPI answers a server's GSS
    # request with SSPI, the Windows logon of the account pgAdmin runs
    # as, which ignores KRB5CCNAME and which require_auth does not stop.
    # So where Kerberos is allowed, GSSAPI is forced, whatever the user set.
    # Every libpq that pgAdmin supports knows gsslib. Where Kerberos is not
    # allowed GSS is refused, so it is not needed.
    if allowed and (in_env or gsslib in params or ver is not None):
        params.pop(gsslib, None)
        params[gsslib] = 'gssapi'

    refused = refused_auth_methods(is_kerberos_conn)
    if in_env or params.get(require_auth) or \
            (ver is not None and ver >= REQUIRE_AUTH_MIN_LIBPQ):
        merged = merge_require_auth(params.get(require_auth), refused)
        params.pop(require_auth, None)
        params[require_auth] = merged
    else:
        params.pop(require_auth, None)


# The connection parameters that decide whether libpq attempts Kerberos.
KERBEROS_CONN_PARAMS = ('require_auth', 'gssencmode', 'gsslib')


def check_kerberos_conn_params_unchanged(conn_string, expected):
    """
    Raise KerberosNotAllowed if the final connection string, as libpq will
    parse it, carries a require_auth, gssencmode or gsslib that differs from
    the value apply_kerberos_conn_params() forced into expected (or from its
    absence).

    make_conninfo() does not escape parameter keys, so a crafted key such as
    'application_name=c require_auth' serialises its own value for one of
    these, which libpq, or the PSQL tool whose conninfo outranks
    PGREQUIREAUTH/PGGSSENCMODE, would honour. Checking the parsed string
    makes the guarantee independent of how the parameters were serialised.
    """
    if not config.SERVER_MODE:
        return
    parsed = conninfo_to_dict(conn_string)
    for key in KERBEROS_CONN_PARAMS:
        if parsed.get(key) != expected.get(key):
            raise KerberosNotAllowed(gettext(
                'The connection parameters contain a {0} that is not '
                'allowed in server mode.').format(key))


def kerberos_libpq_env(env, is_kerberos_conn):
    """
    Add the libpq environment variables that stop a utility using
    Kerberos where it may not, to env, and return it. Only a utility with
    a libpq that knows them is affected.
    """
    apply_kerberos_conn_params(
        env, is_kerberos_conn,
        names={'require_auth': 'PGREQUIREAUTH',
               'gssencmode': 'PGGSSENCMODE',
               'gsslib': 'PGGSSLIB'})
    return env


def isolate_kerberos_credentials():
    """
    In server mode, stop libpq in pgAdmin's own process, and the processes
    it starts, from using the Kerberos credentials of the account pgAdmin
    runs as, except where kerberos_environ() provides a user's own.
    """
    if config.SERVER_MODE:
        environ.update(NO_KERBEROS_CREDENTIALS)


def warn_if_no_auth_refusal(logger):
    """
    In server mode, warn if pgAdmin's libpq cannot refuse SSPI and
    gssproxy, which it needs require_auth for. Never raises.
    """
    if not config.SERVER_MODE:
        return
    try:
        if libpq_version() < REQUIRE_AUTH_MIN_LIBPQ:
            logger.warning(
                'The libpq used by pgAdmin is older than version 16, so '
                'it cannot refuse SSPI (Windows) or gssproxy '
                'authentication for connections that may not use '
                'Kerberos. Only the environment-based isolation of '
                'Kerberos credentials applies; use libpq 16 or later.')
    except Exception as e:
        logger.debug('Unable to check the libpq version: %s', e)


class ConnectionLocker:
    """Implementing lock while setting/unsetting
     the Kerberos environ variables."""
    lock = Lock()

    def __init__(self, _is_kerberos_conn=False):
        self.is_kerberos_conn = _is_kerberos_conn

    def __enter__(self):
        if config.SERVER_MODE:
            current_app.logger.info("Waiting for a lock.")
            self.lock.acquire()
            current_app.logger.info("Acquired a lock.")

            # kerberos_environ() handles the lack of a request context
            # itself; an exception here would leak the lock, since
            # __exit__ is not called when __enter__ raises.
            environ.update(kerberos_environ(self.is_kerberos_conn))

        return self

    def __exit__(self, type, value, traceback):
        if config.SERVER_MODE:
            environ.update(NO_KERBEROS_CREDENTIALS)
            if self.lock.locked():
                current_app.logger.info("Released a lock.")
                self.lock.release()
