##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Per-user Microsoft sign-in for Azure Database for PostgreSQL.

The Microsoft device sign-in uses Azure Identity's public development client.
Its encrypted cache holds refresh credentials; the pgAdmin session holds only
the non-secret authentication record that selects the signed-in account.
"""

import re

from azure.identity import (
    AuthenticationRecord, DeviceCodeCredential, InteractiveBrowserCredential,
    TokenCachePersistenceOptions)
from flask import current_app, session
from flask_security import current_user

import config

POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default'
AZURE_POSTGRES_HOST = re.compile(
    r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
    r'\.postgres\.database\.azure\.com', re.IGNORECASE)


class EntraAuthenticationError(Exception):
    """A safe, non-secret-bearing error for the connection UI."""


def _check_enabled():
    if not getattr(config, 'ENTRA_DB_AUTH_ENABLED', False):
        raise EntraAuthenticationError(
            'Microsoft Entra database authentication is not enabled.')
    if not current_user.is_authenticated:
        raise EntraAuthenticationError('Sign in to pgAdmin first.')


def _tenant():
    return getattr(config, 'ENTRA_DB_TENANT_ID', None) or 'organizations'


def _sign_in_method():
    method = getattr(config, 'ENTRA_DB_SIGNIN_METHOD', 'device_code')
    if method not in ('browser', 'device_code'):
        raise EntraAuthenticationError(
            'Invalid Microsoft Entra sign-in method configuration.')
    return method


def _cache_options():
    # A distinct encrypted OS cache for each pgAdmin user and tenant.
    name = 'pgadmin-entra-db-{}-{}'.format(current_user.id, _tenant())
    return TokenCachePersistenceOptions(name=name)


def start_sign_in():
    """Start Microsoft device sign-in in the request handling this call."""
    _check_enabled()
    session.pop('entra_db_auth', None)
    session.pop('entra_db_code', None)

    def on_code(verification_uri, user_code, expires_at):
        session['entra_db_code'] = {
            'verification_uri': verification_uri,
            'user_code': user_code,
            'expires_at': expires_at.isoformat(),
        }
        session.modified = True
        session.force_write = True
        # The authentication request remains open while Microsoft waits for
        # the user. Make the code visible to a concurrent polling request.
        current_app.session_interface.manager.put(session)

    method = _sign_in_method()
    credential = None
    try:
        options = {
            'tenant_id': _tenant(), 'timeout': 180,
            'cache_persistence_options': _cache_options(),
        }
        if method == 'browser':
            credential = InteractiveBrowserCredential(**options)
        else:
            credential = DeviceCodeCredential(
                prompt_callback=on_code, **options)
        record = credential.authenticate(scopes=[POSTGRES_SCOPE])
    except Exception:
        raise EntraAuthenticationError(
            'Microsoft sign-in did not complete. Try signing in again.') \
            from None
    finally:
        if credential is not None:
            credential.close()
        session.pop('entra_db_code', None)
        session.modified = True
        session.force_write = True
    session['entra_db_auth'] = {
        'record': record.serialize(),
        'method': method,
    }
    session.force_write = True
    return record.username


class EntraPassword:
    """Supply a fresh PostgreSQL token when a physical connection opens."""

    def __init__(self, host, service, connection_params):
        self.host = host
        self.service = service
        self.connection_params = connection_params or {}

    def get(self):
        if not self.host or not AZURE_POSTGRES_HOST.fullmatch(
                self.host) or self.service:
            raise EntraAuthenticationError(
                'Microsoft Entra authentication requires an Azure Database '
                'for PostgreSQL host and no service override.')
        if any(name in self.connection_params for name in
               ('host', 'hostaddr', 'port', 'dbname', 'user', 'password',
                'service', 'passfile')):
            raise EntraAuthenticationError(
                'Connection parameters cannot override the destination '
                'or user for Microsoft Entra authentication.')
        _check_enabled()
        saved = session.get('entra_db_auth')
        if not saved or not isinstance(saved, dict):
            raise EntraAuthenticationError(
                'Sign in to Microsoft to connect this server.')
        try:
            record = AuthenticationRecord.deserialize(saved['record'])
            credential_class = InteractiveBrowserCredential if \
                saved['method'] == 'browser' else DeviceCodeCredential
            credential = credential_class(
                tenant_id=_tenant(), authentication_record=record,
                disable_automatic_authentication=True,
                cache_persistence_options=_cache_options())
            try:
                return credential.get_token(POSTGRES_SCOPE).token
            finally:
                credential.close()
        except Exception as error:
            current_app.logger.error(
                'Entra database token acquisition failed: %s',
                type(error).__name__)
            raise EntraAuthenticationError(
                'The Microsoft sign-in has expired. Sign in again to '
                'reconnect.') from None
