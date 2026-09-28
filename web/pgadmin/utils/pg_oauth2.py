##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
PostgreSQL 18 libpq OAuth bearer-token integration for pgAdmin.

The libpq OAuth hook is process-global. The OAuth access token is therefore
not obtained from Flask's request/session context inside the C callback.

Instead, connection.py establishes the token in a ContextVar immediately
before creating a Psycopg connection. The libpq callback reads that
ContextVar when authentication requests a bearer token.
"""

import base64
import ctypes
import ctypes.util
import json
import logging
import re
import threading
import time
from collections.abc import Mapping
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator, Optional
from urllib.parse import urlsplit

import requests
from flask import has_request_context, session
from requests.auth import AuthBase

_install_lock = threading.Lock()
logger = logging.getLogger(__name__)


# PostgreSQL 18:
#
# typedef enum
# {
#     PQAUTHDATA_PROMPT_OAUTH_DEVICE,
#     PQAUTHDATA_OAUTH_BEARER_TOKEN
# } PGauthData;
PQAUTHDATA_OAUTH_BEARER_TOKEN = 1

_OAUTH_REFRESH_LEEWAY_SECONDS = 30


class PGoauthBearerRequest(ctypes.Structure):
    """
    PostgreSQL 18 PGoauthBearerRequest.

    The async and cleanup members are function pointers in C. They are
    represented as c_void_p here because we assign the corresponding
    ctypes callbacks explicitly below.
    """

    _fields_ = [
        ("openid_configuration", ctypes.c_char_p),
        ("scope", ctypes.c_char_p),
        ("async_", ctypes.c_void_p),
        ("cleanup", ctypes.c_void_p),
        ("token", ctypes.c_char_p),
        ("user", ctypes.c_void_p),
    ]


_AUTH_HOOK = ctypes.CFUNCTYPE(
    ctypes.c_int,
    ctypes.c_int,  # PGauthData
    ctypes.c_void_p,  # PGconn *
    ctypes.c_void_p,  # void *
)


_CLEANUP_HOOK = ctypes.CFUNCTYPE(
    None,
    ctypes.c_void_p,  # PGconn *
    ctypes.c_void_p,  # PGoauthBearerRequest *
)


# The token is established by connection.py while a connection is being
# created. ContextVar is preferable to Flask's session here because the
# libpq callback is process-global and may be invoked from C code.
_oauth_token: ContextVar[Optional[str]] = ContextVar(
    "pgadmin_oauth_token",
    default=None,
)


# Keep native objects alive for as long as libpq can call them.
_libpq = None
_hook = None
_cleanup_hook = None
_previous_hook = None

# PGoauthBearerRequest pointer -> token buffer.
#
# libpq owns the request structure and calls cleanup() when it no longer
# needs request->token.
_token_buffers = {}


def _delegate_to_previous(authdata_type, conn, data):
    """Delegate auth-data requests not handled by pgAdmin."""
    if _previous_hook is None:
        return 0

    try:
        return _previous_hook(authdata_type, conn, data)
    except Exception:
        # Never allow an exception to escape through a C callback.
        logger.exception("Previous libpq auth-data hook failed.")
        return -1


def _get_libpq() -> ctypes.CDLL:
    """
    Load the system libpq and configure the PostgreSQL OAuth hook API.

    pgAdmin's source installation uses psycopg[c], which links against
    the system libpq. PostgreSQL 18 or newer is required.
    """
    global _libpq

    if _libpq is not None:
        return _libpq

    path = ctypes.util.find_library("pq")

    if not path:
        raise RuntimeError(
            "Could not find libpq. PostgreSQL 18 or newer is required "
            "for pgAdmin PostgreSQL OAuth bearer-token support."
        )

    libpq = ctypes.CDLL(path)

    try:
        pq_lib_version = libpq.PQlibVersion
    except AttributeError:
        raise RuntimeError("Loaded libpq does not expose PQlibVersion().")

    pq_lib_version.argtypes = []
    pq_lib_version.restype = ctypes.c_int

    version = pq_lib_version()

    if version < 180000:
        raise RuntimeError(
            "PostgreSQL 18 or newer libpq is required for OAuth "
            "bearer-token authentication; found libpq version {0}.".format(
                version)
        )

    try:
        pq_set_auth_data_hook = libpq.PQsetAuthDataHook
        pq_get_auth_data_hook = libpq.PQgetAuthDataHook
    except AttributeError:
        raise RuntimeError(
            "The loaded libpq does not provide the PostgreSQL 18 "
            "OAuth auth-data hook API."
        )

    pq_set_auth_data_hook.argtypes = [_AUTH_HOOK]
    pq_set_auth_data_hook.restype = None

    pq_get_auth_data_hook.argtypes = []
    pq_get_auth_data_hook.restype = ctypes.c_void_p

    _libpq = libpq

    logger.info(
        "Using libpq version %d for"
        "PostgreSQL OAuth support.", version
    )

    return _libpq


@_CLEANUP_HOOK
def _oauth_cleanup(conn, request):
    """
    Release native memory associated with a libpq OAuth request.

    libpq calls this after it no longer needs request->token.
    """
    try:
        request_key = int(ctypes.cast(request, ctypes.c_void_p).value)

        _token_buffers.pop(request_key, None)

        logger.debug(
            "Released PostgreSQL OAuth bearer-token"
            "buffer for request %s.", request_key
        )
    except Exception:
        # Never allow an exception to escape a C callback.
        pass


@_AUTH_HOOK
def _oauth_hook(authdata_type, conn, data):
    """
    Supply the pgAdmin OAuth access token when libpq requests one.
    """
    if authdata_type != PQAUTHDATA_OAUTH_BEARER_TOKEN:
        return _delegate_to_previous(authdata_type, conn, data)

    try:
        token = _oauth_token.get()

        if not token:
            # This may be an unrelated OAuth connection made after the
            # process-global pgAdmin hook was installed.
            return _delegate_to_previous(authdata_type, conn, data)

        request = ctypes.cast(data, ctypes.POINTER(
            PGoauthBearerRequest)).contents

        token_buffer = ctypes.create_string_buffer(token.encode("utf-8"))

        request_key = int(ctypes.cast(data, ctypes.c_void_p).value)

        # Keep the token memory alive until libpq invokes cleanup().
        _token_buffers[request_key] = token_buffer

        request.token = ctypes.cast(token_buffer, ctypes.c_char_p)

        # The token is supplied synchronously. No async callback is needed.
        request.async_ = None

        # Tell libpq when it is safe to release the token buffer.
        request.cleanup = ctypes.cast(_oauth_cleanup, ctypes.c_void_p)

        logger.debug(
            "Supplying OAuth bearer token to "
            "PostgreSQL libpq (token length=%d).",
            len(token),
        )

        return 1

    except Exception:
        # Never allow an exception to cross the C callback boundary.
        logger.exception(
            "Exception while supplying OAuth bearer token to libpq.")
        return -1


@contextmanager
def oauth_token_context(token: str) -> Iterator[None]:
    """
    Associate an OAuth access token with the current connection operation.

    The token is available to the libpq callback through ContextVar and is
    automatically restored after the connection attempt.
    """
    token_handle = _oauth_token.set(token)

    try:
        yield
    finally:
        _oauth_token.reset(token_handle)


def install_oauth_hook() -> None:
    """
    Install the pgAdmin OAuth bearer-token hook into libpq.

    This should be called once during application initialization, after
    Psycopg has been imported/initialised.
    """
    global _hook
    global _cleanup_hook
    global _previous_hook

    if _hook is not None:
        return

    with _install_lock:
        if _hook is not None:
            return

        libpq = _get_libpq()

        previous_hook_ptr = libpq.PQgetAuthDataHook()
        _previous_hook = _AUTH_HOOK(
            previous_hook_ptr) if previous_hook_ptr else None

        _hook = _oauth_hook
        _cleanup_hook = _oauth_cleanup

        libpq.PQsetAuthDataHook(_hook)

        logger.info("Installed PostgreSQL libpq OAuth bearer-token hook.")


def _get_token_expiry(token_data: Mapping[str, Any]) -> Optional[float]:
    """
    Return the access-token expiration timestamp.

    Authlib normally stores expires_at. Fall back to the JWT exp claim
    because some providers omit expires_at from their token response.
    """
    expires_at = token_data.get("expires_at")

    if expires_at is not None:
        try:
            return float(expires_at)
        except (TypeError, ValueError):
            logger.warning("Invalid expires_at value in pgAdmin OAuth token.")

    access_token = token_data.get("access_token")

    if not isinstance(access_token, str) or not access_token:
        return None

    try:
        parts = access_token.split(".")

        if len(parts) != 3:
            # Opaque access token: expiration cannot be decoded locally.
            return None

        payload = parts[1]
        payload += "=" * (-len(payload) % 4)

        claims = json.loads(base64.urlsafe_b64decode(payload.encode("ascii")))

        if not isinstance(claims, dict):
            return None

        expires_at = claims.get("exp")

        if expires_at is not None:
            return float(expires_at)

    except (ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        logger.warning(
            "Could not decode expiration from pgAdmin OAuth access token.")

    return None


class OAuthTokenError(RuntimeError):
    """Unable to obtain a PostgreSQL OAuth bearer token."""


class OAuthTokenExchangeError(OAuthTokenError):
    """Token exchange failed; the connection must not proceed."""


class _TokenExchangeNoAuth(AuthBase):
    """Prevent implicit HTTP Basic authentication from a .netrc file."""

    def __call__(
        self,
        request: requests.PreparedRequest,
    ) -> requests.PreparedRequest:
        return request


def _get_current_oauth_client() -> Any:
    """Return the OAuth client used for the current pgAdmin login."""
    if not has_request_context():
        raise OAuthTokenError(
            "OAuth authentication requires a pgAdmin login session."
        )

    provider_name = session.get("oauth2_provider")

    if not isinstance(provider_name, str) or not provider_name:
        raise OAuthTokenError(
            "The OAuth provider is not recorded in this pgAdmin "
            "session. Sign in to pgAdmin again."
        )

    # Import lazily to avoid an import cycle during pgAdmin startup.
    from pgadmin.authenticate import get_auth_sources
    from pgadmin.utils.constants import OAUTH2

    oauth_source = get_auth_sources(OAUTH2)

    if oauth_source is None:
        raise OAuthTokenError(
            "The pgAdmin OAuth authentication source is unavailable."
        )

    oauth_client = oauth_source.oauth2_clients.get(provider_name)

    if oauth_client is None:
        raise OAuthTokenError(
            "The OAuth provider recorded in this pgAdmin session "
            "is not registered."
        )

    return oauth_client


def _refresh_pgadmin_oauth_token(
    token_data: Mapping[str, Any],
) -> Optional[str]:
    """
    Refresh the pgAdmin OAuth access token.

    Return the refreshed access token, or None when refreshing is not
    possible.
    """
    refresh_token = token_data.get("refresh_token")

    if not isinstance(refresh_token, str) or not refresh_token:
        logger.warning(
            "The pgAdmin OAuth access token has expired, but no "
            "refresh token is available."
        )
        return None

    try:
        oauth_client = _get_current_oauth_client()

        refreshed_token = oauth_client.fetch_access_token(
            grant_type="refresh_token",
            refresh_token=refresh_token,
        )

        if not isinstance(refreshed_token, dict):
            logger.warning(
                "The OAuth provider returned an invalid token "
                "response while refreshing the pgAdmin access token."
            )
            return None

        access_token = refreshed_token.get("access_token")

        if not isinstance(access_token, str) or not access_token:
            logger.warning(
                "The OAuth provider did not return a valid access "
                "token while refreshing the pgAdmin access token."
            )
            return None

        # Refresh responses may omit unchanged fields such as id_token,
        # scope, token_type, or refresh_token.
        updated_token = dict(token_data)
        updated_token.update(refreshed_token)

        # Some providers do not return another refresh token.
        # Keep the existing token in that case.
        if not updated_token.get("refresh_token"):
            updated_token["refresh_token"] = refresh_token

        session["oauth2_token"] = updated_token
        session.modified = True

        logger.info("Refreshed pgAdmin OAuth access token.")

        return access_token

    except OAuthTokenError as exc:
        logger.warning(
            "Cannot refresh the pgAdmin OAuth access token: %s",
            exc,
        )
        return None
    except Exception:
        logger.exception(
            "Failed to refresh the pgAdmin OAuth access token."
        )
        return None


def _get_pgadmin_oauth_token() -> Optional[str]:
    """
    Return the current pgAdmin OAuth access token.

    Refresh the token when it is expired or close to expiration.
    Return None when no usable token is available.
    """
    try:
        token_data = session.get("oauth2_token")
    except RuntimeError:
        # No Flask request context.
        return None

    if not isinstance(token_data, dict):
        return None

    access_token = token_data.get("access_token")

    if not isinstance(access_token, str) or not access_token:
        return None

    expires_at = _get_token_expiry(token_data)

    if expires_at is None:
        return access_token

    now = time.time()

    # Refresh slightly early to avoid the token expiring during the
    # PostgreSQL authentication handshake.
    if now >= expires_at - _OAUTH_REFRESH_LEEWAY_SECONDS:
        logger.info(
            "pgAdmin OAuth access token is expired or close to "
            "expiration: expires_at=%s now=%s.",
            expires_at,
            now,
        )

        return _refresh_pgadmin_oauth_token(token_data)

    return access_token


def _exchange_oauth_access_token(client_id: str) -> str:
    """
    Exchange the current pgAdmin access token for a cluster access token.

    client_id is the cluster's OAuth client identifier, obtained from
    the server registration's oauth_client_id connection parameter.

    The token endpoint is obtained from the OAuth provider used for the
    current pgAdmin login. An explicitly configured token URL takes
    precedence over the token_endpoint discovered through the provider
    metadata.

    The current pgAdmin token is refreshed first when necessary.

    Return the exchanged bearer token. Raise OAuthTokenExchangeError
    on failure.

    The exchanged token is not stored in the Flask session or cached.
    """
    if not has_request_context():
        raise OAuthTokenExchangeError(
            "Token exchange requires a pgAdmin login session."
        )

    if (
        not isinstance(client_id, str) or
        not client_id.strip() or
        "\0" in client_id
    ):
        raise OAuthTokenExchangeError(
            "Set the server connection parameter oauth_client_id "
            "to the target cluster identifier."
        )

    subject_token = _get_pgadmin_oauth_token()

    if (
        not isinstance(subject_token, str) or
        not subject_token.strip() or
        "\0" in subject_token
    ):
        raise OAuthTokenExchangeError(
            "No current pgAdmin OAuth access token is available. "
            "Sign in to pgAdmin again."
        )

    try:
        oauth_client = _get_current_oauth_client()
    except OAuthTokenError as exc:
        raise OAuthTokenExchangeError(str(exc)) from None

    try:
        metadata = oauth_client.load_server_metadata()
    except requests.exceptions.SSLError:
        raise OAuthTokenExchangeError(
            "TLS verification failed while loading OAuth provider "
            "metadata."
        ) from None
    except requests.exceptions.Timeout:
        raise OAuthTokenExchangeError(
            "The request for OAuth provider metadata timed out."
        ) from None
    except requests.exceptions.RequestException:
        raise OAuthTokenExchangeError(
            "Could not load OAuth provider metadata."
        ) from None
    except Exception:
        raise OAuthTokenExchangeError(
            "Could not load OAuth provider metadata."
        ) from None

    endpoint = (
        oauth_client.access_token_url or
        metadata.get("token_endpoint")
    )

    if not isinstance(endpoint, str) or not endpoint:
        raise OAuthTokenExchangeError(
            "The OAuth provider has no token endpoint configured "
            "or advertised in its metadata."
        )

    try:
        parsed_endpoint = urlsplit(endpoint)
        valid_endpoint = (
            parsed_endpoint.scheme == "https" and
            bool(parsed_endpoint.hostname) and
            parsed_endpoint.username is None and
            parsed_endpoint.password is None and
            not parsed_endpoint.fragment
        )
    except ValueError:
        valid_endpoint = False

    if not valid_endpoint:
        raise OAuthTokenExchangeError(
            "The OAuth provider token endpoint must be an HTTPS URL "
            "without embedded credentials or a fragment."
        )

    verify_tls = oauth_client.client_kwargs.get("verify", True)

    try:
        response = requests.post(
            endpoint,
            data={
                "client_id": client_id,
                "grant_type": (
                    "urn:ietf:params:oauth:grant-type:token-exchange"
                ),
                "subject_token": subject_token,
                "subject_token_type": (
                    "urn:ietf:params:oauth:token-type:access_token"
                ),
                "scope": "openid",
            },
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            auth=_TokenExchangeNoAuth(),
            verify=verify_tls,
            timeout=(5, 30),
            allow_redirects=False,
        )
    except requests.exceptions.SSLError:
        raise OAuthTokenExchangeError(
            "TLS verification failed when contacting the OAuth "
            "token endpoint."
        ) from None
    except requests.exceptions.Timeout:
        raise OAuthTokenExchangeError(
            "The request to the OAuth token endpoint timed out."
        ) from None
    except requests.exceptions.RequestException:
        raise OAuthTokenExchangeError(
            "Could not contact the OAuth token endpoint."
        ) from None

    with response:
        status_code = response.status_code

        try:
            token_data = response.json()
        except ValueError:
            token_data = None

    has_oauth_error = (
        isinstance(token_data, dict) and
        "error" in token_data
    )

    if status_code != 200 or has_oauth_error:
        error_code = (
            token_data.get("error")
            if isinstance(token_data, dict)
            else None
        )

        # Include only a short error identifier. Never expose the
        # provider response, descriptions, or token values.
        if (
            not isinstance(error_code, str) or
            re.fullmatch(
                r"[A-Za-z0-9_-]{1,64}",
                error_code,
            ) is None
        ):
            error_code = "unknown_error"

        raise OAuthTokenExchangeError(
            "OAuth token exchange failed "
            "(HTTP {0}, error={1}).".format(
                status_code,
                error_code,
            )
        )

    if not isinstance(token_data, dict):
        raise OAuthTokenExchangeError(
            "The OAuth provider returned an invalid token exchange "
            "response."
        )

    access_token = token_data.get("access_token")
    token_type = token_data.get("token_type")

    if (
        not isinstance(access_token, str) or
        not access_token.strip() or
        "\0" in access_token
    ):
        raise OAuthTokenExchangeError(
            "The OAuth token exchange response contains no valid "
            "access token."
        )

    if (
        not isinstance(token_type, str) or
        token_type.lower() != "bearer"
    ):
        raise OAuthTokenExchangeError(
            "The OAuth token exchange response is not a bearer token."
        )

    return access_token


def get_postgres_oauth_token(
    mode: str,
    client_id: Optional[str],
) -> str:
    """
    Return a PostgreSQL OAuth token using the selected pgAdmin token mode.
    """
    if mode == "direct":
        token = _get_pgadmin_oauth_token()

        if not isinstance(token, str) or not token:
            raise OAuthTokenError(
                "No current pgAdmin OAuth access token is available. "
                "Sign in to pgAdmin again."
            )

        return token

    if mode == "exchange":
        if (
            not isinstance(client_id, str) or
            not client_id.strip() or
            "\0" in client_id
        ):
            raise OAuthTokenError(
                "Set the server connection parameter oauth_client_id "
                "when using OAuth token exchange."
            )

        return _exchange_oauth_access_token(client_id)

    raise OAuthTokenError(
        'Invalid pgAdmin OAuth token mode "{0}".'.format(mode)
    )
