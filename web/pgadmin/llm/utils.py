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


def validate_api_url(url):
    """
    Validate that a URL is in the allowed LLM API URL list.

    Compares the scheme://host:port portion of the URL against
    config.ALLOWED_LLM_API_URLS. Path is not checked — different
    providers use different paths.

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

    request_origin = f'{scheme}://{hostname}:{port}'

    for allowed in allowed_urls:
        a_parsed = urlparse(allowed)
        a_scheme = a_parsed.scheme.lower()
        a_hostname = a_parsed.hostname
        if a_hostname:
            a_hostname = a_hostname.lower()
        try:
            a_port = a_parsed.port
        except ValueError:
            continue
        if a_port is None:
            if a_scheme in ('https', 'http'):
                a_port = 443 if a_scheme == 'https' else 80
            else:
                continue

        allowed_origin = f'{a_scheme}://{a_hostname}:{a_port}'

        if request_origin == allowed_origin:
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


def get_anthropic_api_url():
    """
    Get the Anthropic API URL.

    Checks user preferences first, then falls back to system configuration.
    User-preference URLs are validated against the SSRF allowlist.

    Returns:
        The URL string, or empty string if not configured.
    """
    # Check user preference first
    pref_url = _get_preference_value('anthropic_api_url')
    if pref_url:
        if validate_api_url(pref_url):
            return pref_url
        # Preference URL not in allowlist — fall through to config

    # Fall back to system configuration (trusted admin URL)
    return config.ANTHROPIC_API_URL or ''


def get_anthropic_api_key():
    """
    Get the Anthropic API key.

    Checks user preferences first, then falls back to system configuration.

    Returns:
        The API key string, or None if not configured or file doesn't exist.
    """
    # Check user preference first
    pref_file = _get_preference_value('anthropic_api_key_file')
    if pref_file:
        if validate_api_key_path(pref_file) is not None:
            key = _read_api_key_from_file(pref_file)
            if key:
                return key

    # Fall back to system configuration (trusted admin path)
    return _read_api_key_from_file(
        config.ANTHROPIC_API_KEY_FILE, _trusted=True
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
    Get the OpenAI API URL.

    Checks user preferences first, then falls back to system configuration.
    User-preference URLs are validated against the SSRF allowlist.

    Returns:
        The URL string, or empty string if not configured.
    """
    # Check user preference first
    pref_url = _get_preference_value('openai_api_url')
    if pref_url:
        if validate_api_url(pref_url):
            return pref_url
        # Preference URL not in allowlist — fall through to config

    # Fall back to system configuration (trusted admin URL)
    return config.OPENAI_API_URL or ''


def get_openai_api_key():
    """
    Get the OpenAI API key.

    Checks user preferences first, then falls back to system configuration.

    Returns:
        The API key string, or None if not configured or file doesn't exist.
    """
    # Check user preference first
    pref_file = _get_preference_value('openai_api_key_file')
    if pref_file:
        if validate_api_key_path(pref_file) is not None:
            key = _read_api_key_from_file(pref_file)
            if key:
                return key

    # Fall back to system configuration (trusted admin path)
    return _read_api_key_from_file(
        config.OPENAI_API_KEY_FILE, _trusted=True
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
    Get the Ollama API URL.

    Checks user preferences first, then falls back to system configuration.
    User-preference URLs are validated against the SSRF allowlist.

    Returns:
        The URL string, or empty string if not configured.
    """
    # Check user preference first
    pref_url = _get_preference_value('ollama_api_url')
    if pref_url:
        if validate_api_url(pref_url):
            return pref_url
        # Preference URL not in allowlist — fall through to config

    # Fall back to system configuration (trusted admin URL)
    return config.OLLAMA_API_URL or ''


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
    Get the Docker Model Runner API URL.

    Checks user preferences first, then falls back to system configuration.
    User-preference URLs are validated against the SSRF allowlist.

    Returns:
        The URL string, or empty string if not configured.
    """
    # Check user preference first
    pref_url = _get_preference_value('docker_api_url')
    if pref_url:
        if validate_api_url(pref_url):
            return pref_url
        # Preference URL not in allowlist — fall through to config

    # Fall back to system configuration (trusted admin URL)
    return config.DOCKER_API_URL or ''


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
