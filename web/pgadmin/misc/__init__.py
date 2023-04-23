##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

from pgadmin.utils import driver
from flask import url_for, render_template, Response, request, current_app
from flask_babel import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule, replace_binary_path
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.session import cleanup_session_files
from pgadmin.misc.themes import get_all_themes
from pgadmin.utils.constants import MIMETYPE_APP_JS, UTILITIES_ARRAY
from pgadmin.utils.ajax import precondition_required, make_json_response
from pgadmin.utils.heartbeat import log_server_heartbeat,\
    get_server_heartbeat, stop_server_heartbeat
import config
import subprocess
import os
import json

MODULE_NAME = 'misc'


class MiscModule(PgAdminModule):
    LABEL = gettext('Miscellaneous')

    def get_own_stylesheets(self):
        stylesheets = []
        return stylesheets

    def register_preferences(self):
        """
        Register preferences for this module.
        """
        lang_options = []
        for lang in config.LANGUAGES:
            lang_options.append(
                {
                    'label': config.LANGUAGES[lang],
                    'value': lang
                }
            )

        # Register options for the User language settings
        self.preference.register(
            'user_language', 'user_language',
            gettext("User language"), 'options', 'en',
            category_label=gettext('User language'),
            options=lang_options,
            control_props={
                'allowClear': False,
            }
        )

        theme_options = []

        for theme, theme_data in (get_all_themes()).items():
            theme_options.append({
                'label': theme_data['disp_name']
                .replace('_', ' ')
                .replace('-', ' ')
                .title(),
                'value': theme,
                'preview_src': url_for(
                    'static', filename='js/generated/img/' +
                    theme_data['preview_img']
                )
            })

        self.preference.register(
            'themes', 'theme',
            gettext("Theme"), 'options', 'standard',
            category_label=gettext('Themes'),
            options=theme_options,
            control_props={
                'allowClear': False,
            },
            help_str=gettext(
                'A refresh is required to apply the theme. Above is the '
                'preview of the theme'
            )
        )

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return ['misc.ping', 'misc.index', 'misc.cleanup',
                'misc.validate_binary_path', 'misc.log_heartbeat',
                'misc.stop_heartbeat', 'misc.get_heartbeat']

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        from .bgprocess import blueprint as module
        self.submodules.append(module)

        from .cloud import blueprint as module
        self.submodules.append(module)

        from .dependencies import blueprint as module
        self.submodules.append(module)

        from .dependents import blueprint as module
        self.submodules.append(module)

        from .file_manager import blueprint as module
        self.submodules.append(module)

        from .sql import blueprint as module
        self.submodules.append(module)

        from .statistics import blueprint as module
        self.submodules.append(module)

        super().register(app, options)


# Initialise the module
blueprint = MiscModule(MODULE_NAME, __name__)


##########################################################################
# A special URL used to "ping" the server
##########################################################################
@blueprint.route("/", endpoint='index')
def index():
    return ''


##########################################################################
# A special URL used to "ping" the server
##########################################################################
@blueprint.route("/ping")
@pgCSRFProtect.exempt
def ping():
    """Generate a "PING" response to indicate that the server is alive."""
    return "PING"


# For Garbage Collecting closed connections
@blueprint.route("/cleanup", methods=['POST'])
@pgCSRFProtect.exempt
def cleanup():
    driver.ping()
    # Cleanup session files.
    cleanup_session_files()
    return ""


@blueprint.route("/heartbeat/log", methods=['POST'])
@pgCSRFProtect.exempt
def log_heartbeat():
    data = None
    if hasattr(request.data, 'decode'):
        data = request.data.decode('utf-8')

    if data != '':
        data = json.loads(data)

    status, msg = log_server_heartbeat(data)
    if status:
        return make_json_response(data=msg, status=200)
    else:
        return make_json_response(data=msg, status=404)


@blueprint.route("/heartbeat/stop", methods=['POST'])
@pgCSRFProtect.exempt
def stop_heartbeat():
    data = None
    if hasattr(request.data, 'decode'):
        data = request.data.decode('utf-8')

    if data != '':
        data = json.loads(data)

    status, msg = stop_server_heartbeat(data)
    return make_json_response(data=msg,
                              status=200)


@blueprint.route("/get_heartbeat/<int:sid>", methods=['GET'])
@pgCSRFProtect.exempt
def get_heartbeat(sid):
    heartbeat_data = get_server_heartbeat(sid)
    return make_json_response(data=heartbeat_data,
                              status=200)


@blueprint.route("/explain/explain.js")
def explain_js():
    """
    explain_js()

    Returns:
        javascript for the explain module
    """
    return Response(
        response=render_template(
            "explain/js/explain.js",
            _=gettext
        ),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


##########################################################################
# A special URL used to shut down the server
##########################################################################
@blueprint.route("/shutdown", methods=('get', 'post'))
@pgCSRFProtect.exempt
def shutdown():
    if config.SERVER_MODE is not True:
        func = request.environ.get('werkzeug.server.shutdown')
        if func is None:
            raise RuntimeError('Not running with the Werkzeug Server')
        func()
        return 'SHUTDOWN'
    else:
        return ''


##########################################################################
# A special URL used to validate the binary path
##########################################################################
@blueprint.route("/validate_binary_path",
                 endpoint="validate_binary_path",
                 methods=["POST"])
@login_required
def validate_binary_path():
    """
    This function is used to validate the specified utilities path by
    running the utilities with their versions.
    """
    data = None
    if hasattr(request.data, 'decode'):
        data = request.data.decode('utf-8')

    if data != '':
        data = json.loads(data)

    version_str = ''
    if 'utility_path' in data and data['utility_path'] is not None:
        # Check if "$DIR" present in binary path
        binary_path = replace_binary_path(data['utility_path'])

        for utility in UTILITIES_ARRAY:
            full_path = os.path.abspath(
                os.path.join(binary_path,
                             (utility if os.name != 'nt' else
                              (utility + '.exe'))))

            try:
                # if path doesn't exist raise exception
                if not os.path.exists(binary_path):
                    current_app.logger.warning('Invalid binary path.')
                    raise Exception()
                # Get the output of the '--version' command
                version_string = \
                    subprocess.getoutput('"{0}" --version'.format(full_path))
                # Get the version number by splitting the result string
                version_string.split(") ", 1)[1].split('.', 1)[0]
            except Exception:
                version_str += "<b>" + utility + ":</b> " + \
                               "not found on the specified binary path.<br/>"
                continue

            # Replace the name of the utility from the result to avoid
            # duplicate name.
            result_str = version_string.replace(utility, '')

            version_str += "<b>" + utility + ":</b> " + result_str + "<br/>"
    else:
        return precondition_required(gettext('Invalid binary path.'))

    return make_json_response(data=gettext(version_str), status=200)
