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


def _expand_path(path):
    """Expand user home directory in path."""
    if path:
        return os.path.expanduser(path)
    return path


def _read_api_key_from_file(file_path):
    """
    Read an API key from a file.

    Args:
        file_path: Path to the file containing the API key.

    Returns:
        The API key string, or None if the file doesn't exist or is empty.
    """
    if not file_path:
        return None

    expanded_path = _expand_path(file_path)

    if not os.path.isfile(expanded_path):
        return None

    try:
        with open(expanded_path, 'r') as f:
            key = f.read().strip()
            return key if key else None
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
        key = _read_api_key_from_file(pref_file)
        if key:
            return key

    # Fall back to system configuration
    return _read_api_key_from_file(config.ANTHROPIC_API_KEY_FILE)


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
        key = _read_api_key_from_file(pref_file)
        if key:
            return key

    # Fall back to system configuration
    return _read_api_key_from_file(config.OPENAI_API_KEY_FILE)


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

    Returns:
        The URL string, or empty string if not configured.
    """
    # Check user preference first
    pref_url = _get_preference_value('ollama_api_url')
    if pref_url:
        return pref_url

    # Fall back to system configuration
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

    Returns:
        The URL string, or empty string if not configured.
    """
    # Check user preference first
    pref_url = _get_preference_value('docker_api_url')
    if pref_url:
        return pref_url

    # Fall back to system configuration
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
            'api_key': get_anthropic_api_key(),
            'model': get_anthropic_model()
        },
        'openai': {
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
