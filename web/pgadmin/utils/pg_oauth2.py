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
import os
import re
import sys
import threading
import time
from authlib.integrations.requests_client import OAuth2Session
from collections.abc import Mapping
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator, Optional
from urllib.parse import urlsplit

import requests
from flask import has_request_context, session

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

    # This ctypes structure follows PostgreSQL 18's public libpq ABI.
    # Review its layout and callback signatures before enabling another
    # major version.

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
_token_buffers_lock = threading.Lock()
_token_buffers = {}


def _check_oauth_libpq_version(version: int) -> None:
    if not 180000 <= version < 190000:
        raise RuntimeError(
            "This PostgreSQL OAuth adapter supports libpq 18.x; "
            f"found libpq version {version}."
        )


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


_LIBPQ_FILENAME_RE = re.compile(
    r"^libpq(?:[-_][A-Za-z0-9_-]+)?"
    r"(?:\.so(?:\..*)?|(?:\.\d+)*\.dylib|\.dll)$",
    re.IGNORECASE,
)


def _is_libpq_path(path: str) -> bool:
    """Return whether the filename matches a recognized libpq name."""
    return bool(
        _LIBPQ_FILENAME_RE.fullmatch(os.path.basename(path))
    )


def _get_loaded_libpq_paths() -> list[str]:
    """
    Return distinct recognized libpq paths from loaded-library listings.

    Use ctypes.util.dllist() when available. On Linux, also inspect
    /proc/self/maps, combining results from both sources.

    Reject recognized libpq entries with deleted mappings or relative
    paths. No library is loaded by this function.

    Results are candidates identified by filename; they do not prove
    which library Psycopg uses or detect arbitrarily renamed libraries.
    """
    paths = []

    dllist = getattr(ctypes.util, "dllist", None)

    if callable(dllist):
        try:
            paths.extend(path for path in dllist() if path)
        except OSError:
            pass

    # Inspect Linux mappings even when dllist() returned entries.
    if sys.platform.startswith("linux"):
        try:
            with open(
                "/proc/self/maps",
                "r",
                encoding="utf-8",
            ) as maps:
                for line in maps:
                    parts = line.rstrip().split(None, 5)

                    if len(parts) == 6:
                        paths.append(parts[5])

        except OSError:
            pass

    result = []
    seen = set()

    for path in paths:
        deleted = path.endswith(" (deleted)")
        candidate = path[:-10] if deleted else path

        if not _is_libpq_path(candidate):
            continue

        if deleted:
            raise RuntimeError(
                "A loaded libpq library has a deleted mapping. "
                "Restart pgAdmin before using PostgreSQL OAuth."
            )

        if not os.path.isabs(candidate):
            raise RuntimeError(
                "A loaded libpq candidate has a relative path: "
                "'{0}'. Refusing to resolve it through another "
                "library search.".format(candidate)
            )

        candidate = os.path.realpath(candidate)

        if candidate not in seen:
            seen.add(candidate)
            result.append(candidate)

    return result


def _get_libpq() -> ctypes.CDLL:
    """
    Obtain a libpq handle and configure the OAuth auth-data hook API.

    Requires libpq 18.x. This function configures the ctypes function
    signatures; install_oauth_hook() registers the callback.

    Psycopg implementations:

      * "python":
        Reuse Psycopg's existing ctypes.CDLL handle directly, targeting
        the same library instance used for its connections. This relies
        on Psycopg's private _pq_ctypes module.

      * "c":
        Supported on Linux only. Select the sole recognized libpq
        library already loaded in the process and obtain its handle
        without loading a new library. Reject missing or ambiguous
        candidates.

        This assumes a normal dynamically linked Psycopg installation.
        Library discovery is a conservative heuristic, not proof of
        Psycopg's actual symbol bindings. Unrecognized library names
        or unusual linking arrangements may invalidate this assumption.

      * "binary":
        Unsupported by this adapter because it cannot reliably obtain
        the bundled libpq instance used by Psycopg.

    Runtime versions must match, but matching PQlibVersion() values
    are only a consistency check and do not establish library identity.

    This is a temporary integration pending usable native OAuth hook
    support in the Psycopg version supported by pgAdmin. Replace it
    with that API when available.

    Related Psycopg work:
    https://github.com/psycopg/psycopg/pull/1190
    """
    global _libpq

    if _libpq is not None:
        return _libpq

    from psycopg import pq

    implementation = pq.__impl__

    if implementation == "binary":
        raise RuntimeError(
            "PostgreSQL OAuth bearer-token support cannot currently "
            "install the authentication hook when Psycopg uses its "
            "bundled 'binary' implementation. Use Psycopg's 'c' or "
            "'python' implementation instead."
        )

    if implementation not in ("c", "python"):
        raise RuntimeError(
            "Unsupported Psycopg pq implementation '{0}' for PostgreSQL "
            "OAuth bearer-token support.".format(implementation)
        )

    psycopg_version = pq.version()
    _check_oauth_libpq_version(psycopg_version)

    libpq = None
    libpq_identity = None

    if implementation == "c" and not sys.platform.startswith("linux"):
        raise RuntimeError(
            "This PostgreSQL OAuth adapter currently supports "
            "Psycopg's 'c' implementation only on Linux. "
            "Use the 'python' implementation with libpq 18.x."
        )

    if implementation == "python":
        # Psycopg's pure-Python implementation itself uses ctypes.
        #
        # Reuse its existing CDLL object instead of rediscovering or
        # reopening libpq. This guarantees that the hook is installed
        # into the exact library through which Psycopg makes connections.
        try:
            from psycopg.pq import _pq_ctypes
        except ImportError as exc:
            raise RuntimeError(
                "Could not access the libpq handle used by Psycopg's "
                "'python' implementation."
            ) from exc

        libpq = _pq_ctypes.pq
        libpq_identity = getattr(
            libpq,
            "_name",
            "<Psycopg ctypes libpq>",
        )

    elif implementation == "c":
        # Importing psycopg.pq has initialized Psycopg's C implementation.
        #
        # Select the sole recognized libpq already loaded in this process.
        # Under normal dynamic-linking assumptions, this is Psycopg's libpq.
        # Reject missing or ambiguous candidates rather than guessing.
        loaded_libpq = _get_loaded_libpq_paths()

        if not loaded_libpq:
            raise RuntimeError(
                "Psycopg is using its 'c' implementation, but the libpq "
                "loaded by that implementation could not be identified. "
                "Refusing to install the PostgreSQL OAuth hook into an "
                "unverified libpq library."
            )

        if len(loaded_libpq) > 1:
            raise RuntimeError(
                "Psycopg is using its 'c' implementation, but multiple "
                "libpq libraries are loaded in the current process. "
                "Cannot safely determine which library Psycopg uses: "
                "{0}".format(", ".join(loaded_libpq))
            )

        libpq_identity = loaded_libpq[0]

        try:
            no_load = getattr(os, "RTLD_NOLOAD", None)
            if no_load is None:
                raise RuntimeError(
                    "Cannot obtain an already-loaded libpq handle "
                    "on this platform."
                )

            libpq = ctypes.CDLL(
                libpq_identity,
                mode=os.RTLD_NOW | no_load,
            )
        except OSError as exc:
            raise RuntimeError(
                "Could not obtain an existing handle to the selected "
                "libpq at '{0}': {1}".format(libpq_identity, exc)
            ) from exc

    # Validate the actual library behind the handle.
    try:
        pq_lib_version = libpq.PQlibVersion
    except AttributeError as exc:
        raise RuntimeError(
            "The selected libpq does not expose PQlibVersion()."
        ) from exc

    pq_lib_version.argtypes = []
    pq_lib_version.restype = ctypes.c_int

    version = pq_lib_version()

    # Check runtime-version consistency.
    # For the C implementation, selecting the sole recognized loaded
    # libpq is a conservative heuristic, not proof of Psycopg's binding.
    if version != psycopg_version:
        raise RuntimeError(
            "The identified libpq reports version {0}, but Psycopg "
            "reports version {1}.".format(
                version,
                psycopg_version,
            )
        )

    _check_oauth_libpq_version(version)

    try:
        pq_set_auth_data_hook = libpq.PQsetAuthDataHook
        pq_get_auth_data_hook = libpq.PQgetAuthDataHook
    except AttributeError as exc:
        raise RuntimeError(
            "The selected libpq does not provide the "
            "PostgreSQL 18 OAuth auth-data hook API."
        ) from exc

    pq_set_auth_data_hook.argtypes = [_AUTH_HOOK]
    pq_set_auth_data_hook.restype = None

    pq_get_auth_data_hook.argtypes = []
    pq_get_auth_data_hook.restype = ctypes.c_void_p

    _libpq = libpq

    logger.info(
        "Using Psycopg %s libpq '%s' version %d for PostgreSQL "
        "OAuth support.",
        implementation,
        libpq_identity,
        version,
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

        with _token_buffers_lock:
            _token_buffers.pop(request_key, None)

        logger.debug(
            "Released PostgreSQL OAuth bearer-token "
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
        with _token_buffers_lock:
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
    Install the process-wide pgAdmin OAuth bearer-token hook.

    Called lazily before the first PostgreSQL OAuth connection.
    Repeated calls are safe; installation is serialized per process.
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

        libpq.PQsetAuthDataHook(_oauth_hook)

        _cleanup_hook = _oauth_cleanup
        _hook = _oauth_hook

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


class OAuthRequestContextRequired(OAuthTokenError):
    """OAuth credentials require an authenticated request."""


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
        updated_token.pop("expires_at", None)
        updated_token.pop("expires_in", None)
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
        logger.warning(
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


def _get_validated_oauth_client(oauth_issuer: Optional[str]):
    """Return the login client, issuer-checked metadata and TLS setting."""
    if (
        not isinstance(oauth_issuer, str) or
        not oauth_issuer.strip() or
        "\0" in oauth_issuer
    ):
        raise OAuthTokenError(
            "Set oauth_issuer to the issuer of the pgAdmin login "
            "OIDC provider."
        )

    oauth_client = _get_current_oauth_client()
    client_kwargs = oauth_client.client_kwargs or {}
    verify_tls = client_kwargs.get("verify", True)

    if verify_tls is not True and not (
        isinstance(verify_tls, str) and verify_tls.strip()
    ):
        raise OAuthTokenError(
            "PostgreSQL OAuth requires TLS verification for the login "
            "OIDC provider. Enable verification or configure a trusted "
            "CA bundle."
        )

    try:
        metadata = oauth_client.load_server_metadata()
    except Exception:
        # Do not expose provider responses or exception text.
        raise OAuthTokenError(
            "Could not load the pgAdmin login OIDC provider metadata."
        ) from None

    if not isinstance(metadata, dict):
        raise OAuthTokenError(
            "The pgAdmin login OIDC provider returned invalid metadata."
        )

    issuer = metadata.get("issuer")
    if not isinstance(issuer, str) or not issuer.strip():
        raise OAuthTokenError(
            "The pgAdmin login OIDC provider metadata contains no issuer."
        )

    # Issuer identifiers must match exactly. Do not normalize slashes,
    # case or URL encoding, and do not use unverified JWT claims.
    if oauth_issuer != issuer:
        raise OAuthTokenError(
            "The server's oauth_issuer does not match the pgAdmin "
            "login OIDC provider issuer."
        )

    return oauth_client, metadata, verify_tls


def _get_token_exchange_auth(oauth_client, metadata):
    """Authenticate exchange using the pgAdmin login client's credentials."""
    client_id = oauth_client.client_id
    client_secret = oauth_client.client_secret

    if (
        not isinstance(client_id, str) or
        not client_id.strip() or
        "\0" in client_id or
        not isinstance(client_secret, str) or
        not client_secret.strip() or
        "\0" in client_secret
    ):
        raise OAuthTokenExchangeError(
            "PostgreSQL token exchange requires the pgAdmin login "
            "OIDC client to have a client ID and client secret."
        )

    client_kwargs = oauth_client.client_kwargs or {}
    auth_method = client_kwargs.get(
        "token_endpoint_auth_method",
        metadata.get("token_endpoint_auth_method"),
    )
    if auth_method is None:
        auth_method = "client_secret_basic"

    if auth_method not in ("client_secret_basic", "client_secret_post"):
        raise OAuthTokenExchangeError(
            "PostgreSQL token exchange supports client_secret_basic "
            "or client_secret_post authentication. Configure a "
            "supported method for the pgAdmin login OIDC client."
        )

    # Only construct the Requests authentication object here. No token
    # request is made and no login scopes or token callbacks are copied.
    with OAuth2Session(
        client_id=client_id,
        client_secret=client_secret,
        token_endpoint_auth_method=auth_method,
    ) as client:
        return client.client_auth(auth_method)


def _exchange_oauth_access_token(
    client_id: str,
    oauth_scope: Optional[str],
    oauth_issuer: Optional[str],
) -> str:
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

    try:
        oauth_client, metadata, verify_tls = _get_validated_oauth_client(
            oauth_issuer,
        )
    except OAuthTokenError as exc:
        raise OAuthTokenExchangeError(str(exc)) from None

    exchange_auth = _get_token_exchange_auth(oauth_client, metadata)

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
        request_data = {
            "audience": client_id,
            "grant_type": (
                "urn:ietf:params:oauth:grant-type:token-exchange"
            ),
            "subject_token": subject_token,
            "subject_token_type": (
                "urn:ietf:params:oauth:token-type:access_token"
            ),
        }

        scope = (oauth_scope or "").strip()
        if scope:
            request_data["scope"] = scope

        response = requests.post(
            endpoint,
            data=request_data,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            auth=exchange_auth,
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
    oauth_scope: Optional[str],
    oauth_issuer: Optional[str],
) -> str:
    """Return a PostgreSQL OAuth token using the selected token mode."""
    if not has_request_context():
        logger.debug(
            "PostgreSQL OAuth token retrieval outside a request context.",
            stack_info=True,
        )
        raise OAuthRequestContextRequired(
            "PostgreSQL OAuth reconnect requires an authenticated "
            "pgAdmin request. Reconnect through pgAdmin."
        )

    if mode == "direct":
        _get_validated_oauth_client(oauth_issuer)
        token = _get_pgadmin_oauth_token()

        if (
            not isinstance(token, str) or
            not token.strip() or
            "\0" in token
        ):
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

        return _exchange_oauth_access_token(
            client_id, oauth_scope, oauth_issuer,
        )

    raise OAuthTokenError(
        'Invalid pgAdmin OAuth token mode "{0}".'.format(mode)
    )
