##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Utility functions for LLM configuration access."""

import os
from pgadmin.utils.preferences import Preferences
import config


class LLMApiError(Exception):
    """User-facing error from LLM API operations.

    Only messages explicitly constructed for user display should be
    wrapped in this exception. Endpoints catch LLMApiError to show
    the message; all other exceptions get a generic error.
    """
    pass


def _get_user_storage_dirs():
    """
    Compute possible storage directory paths for the current user
    WITHOUT creating them. Returns a list of candidate directories
    (new-style first, then old-style if different).

    Returns an empty list if not in server mode or if the user
    cannot be determined.
    """
    from flask_security import current_user
    from pgadmin.utils.paths import preprocess_username

    if not config.SERVER_MODE:
        return []

    storage_dir = getattr(config, 'STORAGE_DIR', None)
    if not storage_dir:
        return []

    base = (storage_dir.decode('utf-8')
            if hasattr(storage_dir, 'decode') else storage_dir)

    try:
        # New-style: full username
        username_new = preprocess_username(current_user.username)
        # Old-style: username split at @
        username_old = preprocess_username(
            current_user.username.split('@')[0]
        )
    except Exception:
        return []

    dirs = [os.path.join(base, username_new)]
    if username_old != username_new:
        dirs.append(os.path.join(base, username_old))
    return dirs


def _is_within(expanded, allowed):
    """Return True if expanded equals allowed or is a subpath of it."""
    return expanded == allowed or expanded.startswith(allowed + os.sep)


def validate_api_key_path(file_path):
    """
    Validate that a file path is within the allowed directory.

    In server mode, the file must be within the current user's private
    storage directory (checks both new-style and old-style naming).
    Shared storage (config.SHARED_STORAGE) is intentionally excluded:
    API keys are per-user secrets and must not live in directories
    visible to other users.

    In desktop mode, the file must be within the user's home directory.

    Returns the resolved canonical path if valid, None otherwise.
    """
    if not file_path:
        return None

    try:
        expanded = os.path.realpath(os.path.expanduser(file_path))
    except (ValueError, TypeError):
        # Reject paths with embedded null bytes or non-string types
        return None

    if config.SERVER_MODE:
        for storage_dir in _get_user_storage_dirs():
            if _is_within(expanded, os.path.realpath(storage_dir)):
                return expanded
        return None

    # Desktop mode: home directory
    allowed = os.path.realpath(os.path.expanduser('~'))
    if _is_within(expanded, allowed):
        return expanded
    return None


def _parse_allowlist_entry(entry):
    """
    Parse an allowlist entry into (scheme, hostname, port).

    ``port`` is the literal string ``'*'`` if the entry uses the
    port wildcard (e.g. ``http://localhost:*``), otherwise an int.

    Returns None if the entry is malformed.
    """
    from urllib.parse import urlparse

    port_wildcard = False
    raw = entry
    if raw.endswith(':*'):
        port_wildcard = True
        raw = raw[:-2]

    parsed = urlparse(raw)
    scheme = parsed.scheme.lower()
    hostname = parsed.hostname
    if hostname:
        hostname = hostname.lower()

    if not scheme or not hostname or scheme not in ('http', 'https'):
        return None

    if port_wildcard:
        return scheme, hostname, '*'

    try:
        port = parsed.port
    except ValueError:
        return None
    if port is None:
        port = 443 if scheme == 'https' else 80
    return scheme, hostname, port


def validate_api_url(url):
    """
    Validate that a URL is in the allowed LLM API URL list.

    Compares the scheme://host:port portion of the URL against
    config.ALLOWED_LLM_API_URLS. Path is not checked — different
    providers use different paths.

    Allowlist entries may use ``:*`` for the port to match any port
    on that host (e.g. ``http://localhost:*`` matches localhost on
    every port). This is useful for local self-hosting where the
    user picks the port (LiteLLM, vLLM, LM Studio, etc.) — the
    same host check still blocks link-local cloud metadata
    endpoints like 169.254.169.254.

    Returns True if the URL is allowed, False otherwise.
    An empty allowlist means no restriction (admin opt-out).
    """
    from urllib.parse import urlparse

    if not url:
        return False

    allowed_urls = getattr(config, 'ALLOWED_LLM_API_URLS', [])
    if not allowed_urls:
        return True

    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    hostname = parsed.hostname
    if hostname:
        hostname = hostname.lower()

    if not scheme or not hostname:
        return False

    # Only allow http and https schemes
    if scheme not in ('http', 'https'):
        return False

    # Infer default port from scheme if not specified
    try:
        port = parsed.port
    except ValueError:
        return False
    if port is None:
        port = 443 if scheme == 'https' else 80

    for allowed in allowed_urls:
        parsed_entry = _parse_allowlist_entry(allowed)
        if parsed_entry is None:
            continue
        a_scheme, a_hostname, a_port = parsed_entry

        if a_scheme != scheme or a_hostname != hostname:
            continue
        if a_port == '*' or a_port == port:
            return True

    return False


def _read_api_key_from_file(file_path, _trusted=False):
    """
    Read an API key from a file.

    Args:
        file_path: Path to the file containing the API key.
        _trusted: If True, skip path validation. Use ONLY for
            admin-configured paths from config.py, never for
            user-supplied input.

    Returns:
        The API key string, or None if the file doesn't exist, is empty,
        or doesn't look like a valid API key file.
    """
    if not file_path:
        return None

    if _trusted:
        # Admin-configured path: resolve but skip directory check
        try:
            expanded_path = os.path.realpath(
                os.path.expanduser(file_path)
            )
        except (ValueError, TypeError):
            return None
    else:
        # User-supplied path: reject paths outside allowed directory.
        # validate_api_key_path resolves symlinks and relative
        # components via realpath, so use its result directly.
        expanded_path = validate_api_key_path(file_path)
        if expanded_path is None:
            return None

    if not os.path.isfile(expanded_path):
        return None

    try:
        with open(expanded_path, 'r') as f:
            raw = f.read(1025)
            if len(raw) > 1024:
                return None
            key = raw.strip()
            if not key:
                return None
            # An API key should be printable ASCII with no
            # whitespace. Reject anything else to prevent misuse
            # as an arbitrary file reader.
            if not all(c.isascii() and c.isprintable() and
                       not c.isspace() for c in key):
                return None
            return key
    except (IOError, OSError):
        return None


# Public alias for use by refresh endpoints
read_api_key_file = _read_api_key_from_file


def _get_preference_value(name):
    """
    Get a preference value, returning None if empty or not set.

    Args:
        name: The preference name (e.g., 'anthropic_api_key_file')

    Returns:
        The preference value or None if empty/not set.
    """
    try:
        pref_module = Preferences.module('ai')
        if pref_module:
            pref = pref_module.preference(name)
            if pref:
                value = pref.get()
                if value and str(value).strip():
                    return str(value).strip()
    except Exception:
        pass
    return None


def _resolve_pref_url(pref_name, config_default):
    """
    Resolve an API URL preference against the allowlist.

    - User preference set and allowed: return it.
    - User preference set but rejected: log a warning and return ''
      WITHOUT falling back to the admin default. Silent substitution
      hides the rejection and routes the user's request to a
      different provider (issue #9936).
    - No user preference: return the admin's trusted config URL.
    """
    pref_url = _get_preference_value(pref_name)
    if pref_url:
        if validate_api_url(pref_url):
            return pref_url
        try:
            from flask import current_app
            current_app.logger.warning(
                "LLM API URL preference '%s'=%r is not in "
                "ALLOWED_LLM_API_URLS; ignoring. Add it to the "
                "allowlist in config_local.py to permit this URL.",
                pref_name, pref_url
            )
        except Exception:
            pass
        return ''
    return config_default or ''


def is_pref_api_url_rejected(pref_name):
    """
    Return True if the user has set a preference URL for ``pref_name``
    but it failed the allowlist check. Callers use this to distinguish
    'URL not configured' from 'URL configured but blocked' so the chat
    path can surface a clear error instead of a generic one.
    """
    pref_url = _get_preference_value(pref_name)
    return bool(pref_url) and not validate_api_url(pref_url)


def _resolve_pref_key_file(pref_name, config_default):
    """
    Resolve an API key file preference against the path allowlist.

    - User preference set and path allowed: read and return the key.
    - User preference set but path rejected: log a warning and return
      None WITHOUT falling back to the admin default. Silent
      substitution would make the user's request go through using
      a different key than they expected (the symptom in jbro90's
      comment on issue #9936).
    - No user preference: read from the admin's trusted config path.

    Returns the key string, or None.
    """
    pref_file = _get_preference_value(pref_name)
    if pref_file:
        safe_path = validate_api_key_path(pref_file)
        if safe_path is None:
            try:
                from flask import current_app
                current_app.logger.warning(
                    "LLM API key file preference '%s'=%r is not "
                    "within the allowed user storage directory; "
                    "ignoring. Place the key file in your private "
                    "user storage to use it.",
                    pref_name, pref_file
                )
            except Exception:
                pass
            return None
        return _read_api_key_from_file(safe_path)
    return _read_api_key_from_file(config_default, _trusted=True)


def is_pref_api_key_path_rejected(pref_name):
    """
    Return True if the user has set an API key file preference for
    ``pref_name`` but the path failed the directory allowlist check.

    Used by client.py to distinguish 'no key configured' from 'key
    path is rejected' when surfacing an error to the user.
    """
    pref_file = _get_preference_value(pref_name)
    return bool(pref_file) and validate_api_key_path(pref_file) is None


def get_anthropic_api_url():
    """
    Get the Anthropic API URL.

    Checks the user preference first, then falls back to system
    configuration ONLY when no preference is set. A preference URL
    that fails the SSRF allowlist check is dropped (and a warning is
    logged) — it is NOT silently substituted with the admin default.

    Returns:
        The URL string, or empty string if not configured or rejected.
    """
    return _resolve_pref_url(
        'anthropic_api_url', config.ANTHROPIC_API_URL
    )


def get_anthropic_api_key():
    """
    Get the Anthropic API key. See :func:`_resolve_pref_key_file`
    for resolution and rejection rules.
    """
    return _resolve_pref_key_file(
        'anthropic_api_key_file', config.ANTHROPIC_API_KEY_FILE
    )


def get_anthropic_model():
    """
    Get the Anthropic model to use.

    Checks user preferences first, then falls back to system configuration.

    Returns:
        The model name string, or empty string if not configured.
    """
    # Check user preference first
    pref_model = _get_preference_value('anthropic_api_model')
    if pref_model:
        return pref_model

    # Fall back to system configuration
    return config.ANTHROPIC_API_MODEL or ''


def get_openai_api_url():
    """
    Get the OpenAI API URL. See :func:`get_anthropic_api_url` for
    the resolution and rejection rules.
    """
    return _resolve_pref_url('openai_api_url', config.OPENAI_API_URL)


def get_openai_api_key():
    """
    Get the OpenAI API key. See :func:`_resolve_pref_key_file` for
    resolution and rejection rules.
    """
    return _resolve_pref_key_file(
        'openai_api_key_file', config.OPENAI_API_KEY_FILE
    )


def get_openai_model():
    """
    Get the OpenAI model to use.

    Checks user preferences first, then falls back to system configuration.

    Returns:
        The model name string, or empty string if not configured.
    """
    # Check user preference first
    pref_model = _get_preference_value('openai_api_model')
    if pref_model:
        return pref_model

    # Fall back to system configuration
    return config.OPENAI_API_MODEL or ''


def get_ollama_api_url():
    """
    Get the Ollama API URL. See :func:`get_anthropic_api_url` for
    the resolution and rejection rules.
    """
    return _resolve_pref_url('ollama_api_url', config.OLLAMA_API_URL)


def get_ollama_model():
    """
    Get the Ollama model to use.

    Checks user preferences first, then falls back to system configuration.

    Returns:
        The model name string, or empty string if not configured.
    """
    # Check user preference first
    pref_model = _get_preference_value('ollama_api_model')
    if pref_model:
        return pref_model

    # Fall back to system configuration
    return config.OLLAMA_API_MODEL or ''


def get_docker_api_url():
    """
    Get the Docker Model Runner API URL. See
    :func:`get_anthropic_api_url` for resolution and rejection rules.
    """
    return _resolve_pref_url('docker_api_url', config.DOCKER_API_URL)


def get_docker_model():
    """
    Get the Docker Model Runner model to use.

    Checks user preferences first, then falls back to system configuration.

    Returns:
        The model name string, or empty string if not configured.
    """
    # Check user preference first
    pref_model = _get_preference_value('docker_api_model')
    if pref_model:
        return pref_model

    # Fall back to system configuration
    return config.DOCKER_API_MODEL or ''


def get_default_provider():
    """
    Get the default LLM provider.

    First checks if LLM is enabled at the system level (config.LLM_ENABLED).
    If enabled, reads from user preferences (which default to system config).
    Returns None if disabled at system level or user preference is empty.

    Returns:
        The provider name ('anthropic', 'openai', 'ollama', 'docker')
        or None if disabled.
    """
    # Check master switch first - cannot be overridden by user
    if not getattr(config, 'LLM_ENABLED', False):
        return None

    # Valid provider values
    valid_providers = {'anthropic', 'openai', 'ollama', 'docker'}

    # Get preference value (includes config default if not set by user)
    try:
        pref_module = Preferences.module('ai')
        if pref_module:
            pref = pref_module.preference('default_provider')
            if pref:
                value = pref.get()
                # Check if it's a valid provider
                if value and str(value).strip() in valid_providers:
                    return str(value).strip()
    except Exception:
        pass

    # No valid provider configured
    return None


def is_llm_enabled_system():
    """
    Check if LLM features are enabled at the system level.

    This checks the config.LLM_ENABLED setting which cannot be
    overridden by user preferences.

    Returns:
        True if LLM is enabled in system config, False otherwise.
    """
    return getattr(config, 'LLM_ENABLED', False)


def is_llm_enabled():
    """
    Check if LLM features are enabled for the current user.

    This checks both the system-level config (LLM_ENABLED) and
    whether a valid provider is configured in user preferences.

    Returns:
        True if LLM is enabled and a provider is configured, False otherwise.
    """
    return get_default_provider() is not None


def get_max_tool_iterations():
    """
    Get the maximum number of tool iterations for AI conversations.

    Checks user preferences first, then falls back to system configuration.

    Returns:
        The maximum tool iterations (default 20).
    """
    try:
        pref_module = Preferences.module('ai')
        if pref_module:
            pref = pref_module.preference('max_tool_iterations')
            if pref:
                value = pref.get()
                if value is not None:
                    return int(value)
    except Exception:
        pass

    # Fall back to system configuration
    return getattr(config, 'MAX_LLM_TOOL_ITERATIONS', 20)


def get_llm_config():
    """
    Get complete LLM configuration for all providers.

    Returns:
        A dictionary containing configuration for all providers:
        {
            'default_provider': str or None,
            'enabled': bool,
            'anthropic': {
                'api_key': str or None,
                'model': str
            },
            'openai': {
                'api_key': str or None,
                'model': str
            },
            'ollama': {
                'api_url': str,
                'model': str
            },
            'docker': {
                'api_url': str,
                'model': str
            }
        }
    """
    return {
        'default_provider': get_default_provider(),
        'enabled': is_llm_enabled(),
        'anthropic': {
            'api_url': get_anthropic_api_url(),
            'api_key': get_anthropic_api_key(),
            'model': get_anthropic_model()
        },
        'openai': {
            'api_url': get_openai_api_url(),
            'api_key': get_openai_api_key(),
            'model': get_openai_model()
        },
        'ollama': {
            'api_url': get_ollama_api_url(),
            'model': get_ollama_model()
        },
        'docker': {
            'api_url': get_docker_api_url(),
            'model': get_docker_model()
        }
    }
