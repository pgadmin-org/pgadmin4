##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing LLM/AI configuration."""

import json
import ssl
from flask import Response, request
from flask_babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.ajax import make_json_response, internal_server_error
from pgadmin.user_login_check import pga_login_required
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.utils.csrf import pgCSRFProtect
import config

# Try to use certifi for proper SSL certificate handling
try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()


MODULE_NAME = 'llm'

# Valid LLM providers
LLM_PROVIDERS = ['anthropic', 'openai', 'ollama', 'docker']


class LLMModule(PgAdminModule):
    """LLM configuration module for pgAdmin."""

    def register_preferences(self):
        """
        Register preferences for LLM providers.
        """
        self.preference = Preferences('ai', gettext('AI'))

        # Default Provider Setting
        provider_options = [
            {'label': gettext('None (Disabled)'), 'value': ''},
            {'label': gettext('Anthropic'), 'value': 'anthropic'},
            {'label': gettext('OpenAI'), 'value': 'openai'},
            {'label': gettext('Ollama'), 'value': 'ollama'},
            {'label': gettext('Docker Model Runner'), 'value': 'docker'},
        ]

        # Get default provider from config
        default_provider_value = getattr(config, 'DEFAULT_LLM_PROVIDER', '')

        self.default_provider = self.preference.register(
            'general', 'default_provider',
            gettext("Default Provider"), 'options',
            default_provider_value,
            category_label=gettext('AI Configuration'),
            options=provider_options,
            help_str=gettext(
                'The LLM provider to use for AI features. '
                'Select "None (Disabled)" to disable AI features. '
                'Note: AI features must also be enabled in the server '
                'configuration (LLM_ENABLED) for this setting to take effect.'
            ),
            control_props={'allowClear': False}
        )

        # Maximum Tool Iterations
        max_tool_iterations_default = getattr(
            config, 'MAX_LLM_TOOL_ITERATIONS', 20
        )
        self.max_tool_iterations = self.preference.register(
            'general', 'max_tool_iterations',
            gettext("Max Tool Iterations"), 'integer',
            max_tool_iterations_default,
            category_label=gettext('AI Configuration'),
            min_val=1,
            max_val=100,
            help_str=gettext(
                'Maximum number of tool call iterations allowed during an AI '
                'conversation. Higher values allow more complex queries but '
                'may consume more resources. Default is 20.'
            )
        )

        # Anthropic Settings
        # Get defaults from config
        anthropic_key_file_default = getattr(
            config, 'ANTHROPIC_API_KEY_FILE', ''
        )
        anthropic_model_default = getattr(config, 'ANTHROPIC_API_MODEL', '')

        self.anthropic_api_key_file = self.preference.register(
            'anthropic', 'anthropic_api_key_file',
            gettext("API Key File"), 'text',
            anthropic_key_file_default,
            category_label=gettext('Anthropic'),
            help_str=gettext(
                'Path to a file containing your Anthropic API key. '
                'The file should contain only the API key.'
            )
        )

        # Fallback Anthropic models (used if API fetch fails)
        anthropic_model_options = []

        self.anthropic_api_model = self.preference.register(
            'anthropic', 'anthropic_api_model',
            gettext("Model"), 'options',
            anthropic_model_default,
            category_label=gettext('Anthropic'),
            options=anthropic_model_options,
            help_str=gettext(
                'The Anthropic model to use. Models are loaded dynamically '
                'from your API key. You can also type a custom model name. '
                'Leave empty to use the default (Claude Sonnet 4).'
            ),
            control_props={
                'allowClear': True,
                'creatable': True,
                'tags': True,
                'placeholder': gettext('Select or type a model name...'),
                'optionsUrl': 'llm.models_anthropic',
                'optionsRefreshUrl': 'llm.refresh_models_anthropic',
                'refreshDepNames': {
                    'api_key_file': 'anthropic_api_key_file'
                }
            }
        )

        # OpenAI Settings
        # Get defaults from config
        openai_key_file_default = getattr(config, 'OPENAI_API_KEY_FILE', '')
        openai_model_default = getattr(config, 'OPENAI_API_MODEL', '')

        self.openai_api_key_file = self.preference.register(
            'openai', 'openai_api_key_file',
            gettext("API Key File"), 'text',
            openai_key_file_default,
            category_label=gettext('OpenAI'),
            help_str=gettext(
                'Path to a file containing your OpenAI API key. '
                'The file should contain only the API key.'
            )
        )

        # Fallback OpenAI models (used if API fetch fails)
        openai_model_options = []

        self.openai_api_model = self.preference.register(
            'openai', 'openai_api_model',
            gettext("Model"), 'options',
            openai_model_default,
            category_label=gettext('OpenAI'),
            options=openai_model_options,
            help_str=gettext(
                'The OpenAI model to use. Models are loaded dynamically '
                'from your API key. You can also type a custom model name. '
                'Leave empty to use the default (GPT-4o).'
            ),
            control_props={
                'allowClear': True,
                'creatable': True,
                'tags': True,
                'placeholder': gettext('Select or type a model name...'),
                'optionsUrl': 'llm.models_openai',
                'optionsRefreshUrl': 'llm.refresh_models_openai',
                'refreshDepNames': {
                    'api_key_file': 'openai_api_key_file'
                }
            }
        )

        # Ollama Settings
        # Get defaults from config
        ollama_url_default = getattr(config, 'OLLAMA_API_URL', '')
        ollama_model_default = getattr(config, 'OLLAMA_API_MODEL', '')

        self.ollama_api_url = self.preference.register(
            'ollama', 'ollama_api_url',
            gettext("API URL"), 'text',
            ollama_url_default,
            category_label=gettext('Ollama'),
            help_str=gettext(
                'URL for the Ollama API endpoint '
                '(e.g., http://localhost:11434).'
            )
        )

        # Fallback Ollama models (used if API fetch fails)
        ollama_model_options = []

        self.ollama_api_model = self.preference.register(
            'ollama', 'ollama_api_model',
            gettext("Model"), 'options',
            ollama_model_default,
            category_label=gettext('Ollama'),
            options=ollama_model_options,
            help_str=gettext(
                'The Ollama model to use. Models are loaded dynamically '
                'from your Ollama server. You can also type a custom model name.'
            ),
            control_props={
                'allowClear': True,
                'creatable': True,
                'tags': True,
                'placeholder': gettext('Select or type a model name...'),
                'optionsUrl': 'llm.models_ollama',
                'optionsRefreshUrl': 'llm.refresh_models_ollama',
                'refreshDepNames': {
                    'api_url': 'ollama_api_url'
                }
            }
        )

        # Docker Model Runner Settings
        # Get defaults from config
        docker_url_default = getattr(config, 'DOCKER_API_URL', '')
        docker_model_default = getattr(config, 'DOCKER_API_MODEL', '')

        self.docker_api_url = self.preference.register(
            'docker', 'docker_api_url',
            gettext("API URL"), 'text',
            docker_url_default,
            category_label=gettext('Docker Model Runner'),
            help_str=gettext(
                'URL for the Docker Model Runner API endpoint '
                '(e.g., http://localhost:12434). Available in Docker Desktop '
                '4.40 and later.'
            )
        )

        # Fallback Docker models (used if API fetch fails)
        docker_model_options = []

        self.docker_api_model = self.preference.register(
            'docker', 'docker_api_model',
            gettext("Model"), 'options',
            docker_model_default,
            category_label=gettext('Docker Model Runner'),
            options=docker_model_options,
            help_str=gettext(
                'The Docker model to use. Models are loaded dynamically '
                'from your Docker Model Runner. You can also type a custom '
                'model name.'
            ),
            control_props={
                'allowClear': True,
                'creatable': True,
                'tags': True,
                'placeholder': gettext('Select or type a model name...'),
                'optionsUrl': 'llm.models_docker',
                'optionsRefreshUrl': 'llm.refresh_models_docker',
                'refreshDepNames': {
                    'api_url': 'docker_api_url'
                }
            }
        )

    def get_exposed_url_endpoints(self):
        """
        Returns the list of URLs exposed to the client.
        """
        return [
            'llm.models_anthropic',
            'llm.models_openai',
            'llm.models_ollama',
            'llm.models_docker',
            'llm.refresh_models_anthropic',
            'llm.refresh_models_openai',
            'llm.refresh_models_ollama',
            'llm.refresh_models_docker',
            'llm.status',
        ]


# Initialise the module
blueprint = LLMModule(MODULE_NAME, __name__)


@blueprint.route("/status", methods=["GET"], endpoint='status')
@pga_login_required
def get_llm_status():
    """
    Get the LLM configuration status.
    Returns whether LLM is enabled at system and user level,
    and the configured provider and model.
    """
    from pgadmin.llm.utils import (
        is_llm_enabled, is_llm_enabled_system, get_default_provider,
        get_anthropic_model, get_openai_model, get_ollama_model,
        get_docker_model
    )

    provider = get_default_provider()
    model = None
    if provider == 'anthropic':
        model = get_anthropic_model()
    elif provider == 'openai':
        model = get_openai_model()
    elif provider == 'ollama':
        model = get_ollama_model()
    elif provider == 'docker':
        model = get_docker_model()

    return make_json_response(
        success=1,
        data={
            'enabled': is_llm_enabled(),
            'system_enabled': is_llm_enabled_system(),
            'provider': provider,
            'model': model
        }
    )


@blueprint.route("/models/anthropic", methods=["GET"], endpoint='models_anthropic')
@pga_login_required
def get_anthropic_models():
    """
    Fetch available Anthropic models.
    Returns models that support tool use.
    """
    from pgadmin.llm.utils import get_anthropic_api_key

    api_key = get_anthropic_api_key()
    if not api_key:
        return make_json_response(
            data={'models': [], 'error': 'No API key configured'},
            status=200
        )

    try:
        models = _fetch_anthropic_models(api_key)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


@blueprint.route(
    "/models/anthropic/refresh",
    methods=["POST"],
    endpoint='refresh_models_anthropic'
)
@pga_login_required
def refresh_anthropic_models():
    """
    Fetch available Anthropic models using a provided API key file path.
    Used by the preferences refresh button to load models before saving.
    """
    from pgadmin.llm.utils import read_api_key_file

    data = request.get_json(force=True, silent=True) or {}
    api_key_file = data.get('api_key_file', '')

    if not api_key_file:
        return make_json_response(
            data={'models': [], 'error': 'No API key file provided'},
            status=200
        )

    api_key = read_api_key_file(api_key_file)
    if not api_key:
        return make_json_response(
            data={'models': [], 'error': 'Could not read API key from file'},
            status=200
        )

    try:
        models = _fetch_anthropic_models(api_key)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


@blueprint.route("/models/openai", methods=["GET"], endpoint='models_openai')
@pga_login_required
def get_openai_models():
    """
    Fetch available OpenAI models.
    Returns models that support function calling.
    """
    from pgadmin.llm.utils import get_openai_api_key

    api_key = get_openai_api_key()
    if not api_key:
        return make_json_response(
            data={'models': [], 'error': 'No API key configured'},
            status=200
        )

    try:
        models = _fetch_openai_models(api_key)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


@blueprint.route(
    "/models/openai/refresh",
    methods=["POST"],
    endpoint='refresh_models_openai'
)
@pga_login_required
def refresh_openai_models():
    """
    Fetch available OpenAI models using a provided API key file path.
    Used by the preferences refresh button to load models before saving.
    """
    from pgadmin.llm.utils import read_api_key_file

    data = request.get_json(force=True, silent=True) or {}
    api_key_file = data.get('api_key_file', '')

    if not api_key_file:
        return make_json_response(
            data={'models': [], 'error': 'No API key file provided'},
            status=200
        )

    api_key = read_api_key_file(api_key_file)
    if not api_key:
        return make_json_response(
            data={'models': [], 'error': 'Could not read API key from file'},
            status=200
        )

    try:
        models = _fetch_openai_models(api_key)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


@blueprint.route("/models/ollama", methods=["GET"], endpoint='models_ollama')
@pga_login_required
def get_ollama_models():
    """
    Fetch available Ollama models.
    """
    from pgadmin.llm.utils import get_ollama_api_url

    api_url = get_ollama_api_url()
    if not api_url:
        return make_json_response(
            data={'models': [], 'error': 'No API URL configured'},
            status=200
        )

    try:
        models = _fetch_ollama_models(api_url)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


@blueprint.route(
    "/models/ollama/refresh",
    methods=["POST"],
    endpoint='refresh_models_ollama'
)
@pga_login_required
def refresh_ollama_models():
    """
    Fetch available Ollama models using a provided API URL.
    Used by the preferences refresh button to load models before saving.
    """
    data = request.get_json(force=True, silent=True) or {}
    api_url = data.get('api_url', '')

    if not api_url:
        return make_json_response(
            data={'models': [], 'error': 'No API URL provided'},
            status=200
        )

    try:
        models = _fetch_ollama_models(api_url)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


@blueprint.route("/models/docker", methods=["GET"], endpoint='models_docker')
@pga_login_required
def get_docker_models():
    """
    Fetch available Docker Model Runner models.
    """
    from pgadmin.llm.utils import get_docker_api_url

    api_url = get_docker_api_url()
    if not api_url:
        return make_json_response(
            data={'models': [], 'error': 'No API URL configured'},
            status=200
        )

    try:
        models = _fetch_docker_models(api_url)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


@blueprint.route(
    "/models/docker/refresh",
    methods=["POST"],
    endpoint='refresh_models_docker'
)
@pga_login_required
def refresh_docker_models():
    """
    Fetch available Docker models using a provided API URL.
    Used by the preferences refresh button to load models before saving.
    """
    data = request.get_json(force=True, silent=True) or {}
    api_url = data.get('api_url', '')

    if not api_url:
        return make_json_response(
            data={'models': [], 'error': 'No API URL provided'},
            status=200
        )

    try:
        models = _fetch_docker_models(api_url)
        return make_json_response(data={'models': models}, status=200)
    except Exception as e:
        return make_json_response(
            data={'models': [], 'error': str(e)},
            status=200
        )


def _fetch_anthropic_models(api_key):
    """
    Fetch models from Anthropic API.
    Returns a list of model options with label and value.
    """
    import urllib.request
    import urllib.error

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/models',
        headers={
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01'
        }
    )

    try:
        with urllib.request.urlopen(
            req, timeout=30, context=SSL_CONTEXT
        ) as response:
            data = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise Exception('Invalid API key')
        raise Exception(f'API error: {e.code}')

    models = []
    seen = set()

    for model in data.get('data', []):
        model_id = model.get('id', '')
        display_name = model.get('display_name', model_id)

        # Skip if already seen or empty
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)

        # Create a user-friendly label
        if display_name and display_name != model_id:
            label = f"{display_name} ({model_id})"
        else:
            label = model_id

        models.append({
            'label': label,
            'value': model_id
        })

    # Sort alphabetically by model ID
    models.sort(key=lambda x: x['value'])

    return models


def _fetch_openai_models(api_key):
    """
    Fetch models from OpenAI API.
    Returns a list of model options with label and value.
    """
    import urllib.request
    import urllib.error

    req = urllib.request.Request(
        'https://api.openai.com/v1/models',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    )

    try:
        with urllib.request.urlopen(
            req, timeout=30, context=SSL_CONTEXT
        ) as response:
            data = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise Exception('Invalid API key')
        raise Exception(f'API error: {e.code}')

    models = []
    seen = set()

    for model in data.get('data', []):
        model_id = model.get('id', '')

        # Skip if already seen or empty
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)

        models.append({
            'label': model_id,
            'value': model_id
        })

    # Sort alphabetically
    models.sort(key=lambda x: x['value'])

    return models


def _fetch_ollama_models(api_url):
    """
    Fetch models from Ollama API.
    Returns a list of model options with label and value.
    """
    import urllib.request
    import urllib.error

    # Normalize URL
    api_url = api_url.rstrip('/')
    url = f'{api_url}/api/tags'

    req = urllib.request.Request(url)

    try:
        with urllib.request.urlopen(
            req, timeout=30, context=SSL_CONTEXT
        ) as response:
            data = json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        raise Exception(f'Cannot connect to Ollama: {e.reason}')
    except Exception as e:
        raise Exception(f'Error fetching models: {str(e)}')

    models = []
    for model in data.get('models', []):
        name = model.get('name', '')
        if name:
            # Format size if available
            size = model.get('size', 0)
            if size:
                size_gb = size / (1024 ** 3)
                label = f"{name} ({size_gb:.1f} GB)"
            else:
                label = name

            models.append({
                'label': label,
                'value': name
            })

    # Sort alphabetically
    models.sort(key=lambda x: x['value'])

    return models


def _fetch_docker_models(api_url):
    """
    Fetch models from Docker Model Runner API.
    Returns a list of model options with label and value.

    Docker Model Runner uses an OpenAI-compatible API at /engines/v1/models
    """
    import urllib.request
    import urllib.error

    # Normalize URL
    api_url = api_url.rstrip('/')
    url = f'{api_url}/engines/v1/models'

    req = urllib.request.Request(url)

    try:
        with urllib.request.urlopen(
            req, timeout=30, context=SSL_CONTEXT
        ) as response:
            data = json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        raise Exception(
            f'Cannot connect to Docker Model Runner: {e.reason}. '
            f'Is Docker Desktop running with model runner enabled?'
        )
    except Exception as e:
        raise Exception(f'Error fetching models: {str(e)}')

    models = []
    seen = set()

    for model in data.get('data', []):
        model_id = model.get('id', '')

        # Skip if already seen or empty
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)

        models.append({
            'label': model_id,
            'value': model_id
        })

    # Sort alphabetically
    models.sort(key=lambda x: x['value'])

    return models


