##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing Explain PostgreSQL configuration."""

import json
import urllib.request
from urllib.parse import urlparse
from flask import request, current_app
from flask_babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.ajax import make_json_response
from pgadmin.user_login_check import pga_login_required

MODULE_NAME = 'expl_pgsql'


class ExplPgsqlModule(PgAdminModule):
    """Explain PostgreSQL configuration module for pgAdmin."""

    LABEL = gettext('Explain PostgreSQL')

    def register_preferences(self):
        """
        Register preferences for Explain PostgreSQL.
        """

        self.explain_module = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql',
            gettext("Explain Plan"), 'boolean', False,
            category_label=gettext('Configuration'),
            help_str=gettext('Analyze query plan via Explain PostgreSQL API')
        )

        self.explain_postgresql_api = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql_api',
            gettext("Explain PostgreSQL API"), 'text',
            'https://explain.tensor.ru',
            category_label=gettext('Configuration'),
            help_str=gettext(
                'Explain PostgreSQL API endpoint '
                '(e.g. https://explain.tensor.ru)'
            ),
            allow_blanks=False
        )

        self.explain_postgresql_private = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql_private',
            gettext("Private Plans"), 'boolean', False,
            category_label=gettext('Configuration'),
            help_str=gettext(
                'Hide plans from public access on Explain PostgreSQL'
            )
        )

        self.explain_postgresql_format = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql_format',
            gettext("Format SQL"), 'boolean', False,
            category_label=gettext('Configuration'),
            help_str=gettext('Format SQL using Explain PostgreSQL API')
        )

    def get_exposed_url_endpoints(self):
        """
        Returns the list of URLs exposed to the client.
        """
        return [
            'expl_pgsql.status',
            'expl_pgsql.explain',
            'expl_pgsql.formatSQL',
        ]


# Initialise the module
blueprint = ExplPgsqlModule(MODULE_NAME, __name__, static_url_path='/static')


@blueprint.route("/status", methods=["GET"], endpoint='status')
@pga_login_required
def get_status():
    """
    Get the status of the Explain PostgreSQL configuration.
    Indicates whether the analysis of query plans
    via the Explain PostgreSQL API is currently enabled
    """

    return make_json_response(
        success=1,
        data={
            'enabled': get_preference_value('explain_postgresql'),
        }
    )


@blueprint.route(
    '/formatSQL',
    methods=["POST"], endpoint='formatSQL'
)
@pga_login_required
def formatSQL():
    """
    This method is used to send sql to explain postgresql beatifier api.
    """

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return make_json_response(
            success=0,
            errormsg="Invalid JSON payload. Expected an object/dictionary.",
            info=gettext(
                'JSON payload must be an object,'
                ' not null, array, or scalar value'
            ),
        )

    explain_postgresql_api = get_preference_value('explain_postgresql_api')

    # Validate the API URL to prevent SSRF
    if not is_valid_url(explain_postgresql_api):
        return make_json_response(
            success=0,
            errormsg=gettext(
                'Invalid API endpoint URL. Only HTTP/HTTPS URLs are allowed.'
            ),
            info=gettext(
                'The provided API endpoint is not valid. '
                'Only HTTP/HTTPS URLs are permitted.'
            )
        )

    api_url = explain_postgresql_api + '/beautifier-api'
    is_error, data = send_post_request(api_url, data)
    if is_error:
        return make_json_response(
            success=0,
            errormsg=data,
            info=gettext('Failed to post data to the Explain PostgreSQL API'),
        )

    return make_json_response(success=1, data=data)


@blueprint.route(
    '/explain',
    methods=["POST"], endpoint='explain'
)
@pga_login_required
def explain():
    """
    This method is used to send plan to explain postgresql api.
    """

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return make_json_response(
            success=0,
            errormsg="Invalid JSON payload. Expected an object/dictionary.",
            info=gettext(
                'JSON payload must be an object, '
                'not null, array, or scalar value'
            ),
        )

    explain_postgresql_api = get_preference_value('explain_postgresql_api')

    # Validate the API URL to prevent SSRF
    if not is_valid_url(explain_postgresql_api):
        return make_json_response(
            success=0,
            errormsg=gettext(
                'Invalid API endpoint URL. Only HTTP/HTTPS URLs are allowed.'
            ),
            info=gettext(
                'The provided API endpoint is not valid. '
                'Only HTTP/HTTPS URLs are permitted.'
            )
        )

    pref_name = 'explain_postgresql_private'
    explain_postgresql_private = get_preference_value(pref_name)
    data['private'] = explain_postgresql_private

    api_url = explain_postgresql_api + '/explain'
    is_error, response_data = send_post_request(api_url, data)
    if is_error:
        return make_json_response(
            success=0,
            errormsg=response_data,
            info=gettext('Failed to post data to the Explain PostgreSQL API'),
        )

    # response_data should be a relative path from 302 Location header
    if not response_data.startswith('/'):
        return make_json_response(
            success=0,
            errormsg='Unexpected response format from API'
        )
    res_data = explain_postgresql_api + response_data
    return make_json_response(success=1, data=res_data)


def is_valid_url(url):
    """
    Validate that a URL is safe to use (HTTP/HTTPS only).

    Args:
        url: The URL to validate

    Returns:
        bool: True if URL is valid, False otherwise
    """
    if not url:
        return False

    try:
        parsed = urlparse(url)

        # Only allow http and https schemes
        if parsed.scheme not in ('http', 'https'):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        return True
    except Exception:
        return False


def send_post_request(url_api, data):
    data = json.dumps(data).encode('utf-8')
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "pgAdmin4/ExplainModule",
        "Method": "POST"
    }
    try:
        req = urllib.request.Request(url_api, data, headers)
        with no302opener.open(req, timeout=10) as response:
            if (response.code == 302):
                return False, response.headers["Location"]
            response_data = response.read().decode('utf-8')
            return False, response_data
    except Exception as e:
        return True, str(e)


class No302HTTPErrorProcessor(urllib.request.HTTPErrorProcessor):

    def http_response(self, request, response):
        code, msg, hdrs = response.code, response.msg, response.info()

        if (code == 302):
            return response

        # According to RFC 2616, "2xx" code indicates that the client's
        # request was successfully received, understood, and accepted.
        if not (200 <= code < 300):
            response = self.parent.error(
                'http', request, response, code, msg, hdrs)

        return response

    https_response = http_response


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """
    A redirect handler that prevents automatic redirects by returning None
    from redirect_request, allowing 302 responses to be handled properly.
    """
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        """
        Return None to disable automatic redirects.
        """
        return None


# Build opener without HTTPRedirectHandler
#  so No302HTTPErrorProcessor can handle 302 responses
no302opener = urllib.request.build_opener(
    No302HTTPErrorProcessor(),
    # Explicitly add NoRedirectHandler to prevent automatic redirects
    NoRedirectHandler(),
    urllib.request.HTTPHandler(),
    urllib.request.HTTPSHandler()
)


def get_preference_value(name):
    """
    Get a preference value, returning None if empty or not set.

    Args:
        name: The preference name (e.g., 'explain_postgresql_api')

    Returns:
        The preference value or None if empty/not set.
    """
    try:
        pref_module = Preferences.module(MODULE_NAME)
        if pref_module:
            pref = pref_module.preference(name)
            if pref:
                value = pref.get()
                if isinstance(value, str):
                    value = value.strip()
                    return value or None
                return value
    except Exception as e:
        current_app.logger.debug(
            f"Failed to retrieve preference '{name}': {e}"
        )
    return None
