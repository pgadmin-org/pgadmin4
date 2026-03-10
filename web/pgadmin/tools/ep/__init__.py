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
from flask import request
from flask_babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.ajax import make_json_response
from pgadmin.user_login_check import pga_login_required

MODULE_NAME = 'ep'

class EPModule(PgAdminModule):
    """Explain PostgreSQL configuration module for pgAdmin."""

    LABEL = gettext('Explain PostgreSQL')
    
    def register_preferences(self):
        """
        Register preferences for Explain PostgreSQL.
        """

        self.explain_postgresql_api = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql_api',
            gettext("Explain PostgreSQL API"), 'text', 'https://explain.tensor.ru',
            category_label=gettext('Configuration'),
            help_str=gettext('Explain PostgreSQL API endpoint (e.g. https://explain-postgresql.com)'),
            allow_blanks=False
        )

        self.explain_postgresql_private = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql_private',
            gettext("Private Plans"), 'boolean', False,
            category_label=gettext('Configuration'),
            help_str=gettext('Hide plans from public access on Explain PostgreSQL')
        )

        self.explain_module = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql',
            gettext("Explain Plan"), 'boolean', True,
            category_label=gettext('Configuration'),
            help_str=gettext('Analyze query plan via Explain PostgreSQL API')
        )

        self.explain_postgresql_format = self.preference.register(
            'Explain PostgreSQL', 'explain_postgresql_format',
            gettext("Format SQL"), 'boolean', True,
            category_label=gettext('Configuration'),
            help_str=gettext('Format SQL using Explain PostgreSQL API')
        )

    def get_exposed_url_endpoints(self):
        """
        Returns the list of URLs exposed to the client.
        """
        return [
            'ep.explain_postgresql',
            'ep.explain_postgresql_format',
        ]


# Initialise the module
blueprint = EPModule(MODULE_NAME, __name__, static_url_path='/static')

@blueprint.route(
    '/explain_postgresql_format',
    methods=["POST"], endpoint='explain_postgresql_format'
)
@pga_login_required
def explain_postgresql_format():
    """
    This method is used to send sql to explain postgresql beatifier api.

    """

    data = request.get_json()
    explain_postgresql_api = get_preference_value('explain_postgresql_api')

    is_error, data = send_post_request(explain_postgresql_api + '/beautifier-api', data)
    if is_error:
        return make_json_response(success=0, errormsg=data,
                                  info=gettext('Failed to post data to the Explain Postgresql API'),
                                  )

    return make_json_response(success=1, data=data)


@blueprint.route(
    '/explain_postgresql',
    methods=["POST"], endpoint='explain_postgresql'
)
@pga_login_required
def explain_postgresql():
    """
    This method is used to send plan to explain postgresql api.

    """

    data = request.get_json()
    explain_postgresql_api = get_preference_value('explain_postgresql_api')
    explain_postgresql_private = get_preference_value('explain_postgresql_private')
    data['private'] = explain_postgresql_private

    is_error, data = send_post_request(explain_postgresql_api + '/explain', data)
    if is_error:
        return make_json_response(success=0, errormsg=data,
                                  info=gettext('Failed to post data to the Explain Postgresql API'),
                                  )

    return make_json_response(success=1, data=explain_postgresql_api + data)


def send_post_request(url_api, data, parse=False):
  data = json.dumps(data).encode('utf-8')
  headers = {
    "Content-Type": "application/json; charset=utf-8",
    "User-Agent": "pgAdmin4/ExplainModule",
    "Method": "POST"
  }
  try:
    req = urllib.request.Request(url_api, data, headers)
    with no302opener.open(req) as response:
      if (response.code == 302):
        return False, response.headers["Location"]
      response_data = response.read().decode('utf-8')
      if (parse):
        return False, json.loads(response_data)
      else:
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

# opener = urllib.request.build_opener(No302HTTPErrorProcessor)
# urllib.request.install_opener(opener)
no302opener = urllib.request.build_opener(No302HTTPErrorProcessor)

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
                if value and str(value).strip():
                    return str(value).strip()
    except Exception:
        pass
    return None
