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
from flask import render_template, Response, request, current_app
from flask.helpers import url_for
from flask_babel import gettext
from flask_security import login_required
from pgadmin.utils import PgAdminModule, replace_binary_path, \
    get_binary_path_versions
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.session import cleanup_session_files
from pgadmin.misc.themes import get_all_themes
from pgadmin.utils.constants import MIMETYPE_APP_JS, UTILITIES_ARRAY
from pgadmin.utils.ajax import precondition_required, make_json_response, \
    internal_server_error
from pgadmin.utils.heartbeat import log_server_heartbeat, \
    get_server_heartbeat, stop_server_heartbeat
import config
import time
import json
import os
from urllib.request import urlopen
from pgadmin.settings import get_setting, store_setting

MODULE_NAME = 'misc'


class MiscModule(PgAdminModule):
    LABEL = gettext('Miscellaneous')

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
                'misc.stop_heartbeat', 'misc.get_heartbeat',
                'misc.upgrade_check']

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
        binary_versions = get_binary_path_versions(data['utility_path'])
        for utility, version in binary_versions.items():
            if version is None:
                version_str += "<b>" + utility + ":</b> " + \
                               "not found on the specified binary path.<br/>"
            else:
                version_str += "<b>" + utility + ":</b> " + version + "<br/>"
    else:
        return precondition_required(gettext('Invalid binary path.'))

    return make_json_response(data=gettext(version_str), status=200)


@blueprint.route("/upgrade_check", endpoint="upgrade_check", methods=['GET'])
@login_required
def upgrade_check():
    # Get the current version info from the website, and flash a message if
    # the user is out of date, and the check is enabled.
    ret = {
        "outdated": False,
    }
    if config.UPGRADE_CHECK_ENABLED:
        last_check = get_setting('LastUpdateCheck', default='0')
        today = time.strftime('%Y%m%d')
        if int(last_check) < int(today):
            data = None
            url = '%s?version=%s' % (
                config.UPGRADE_CHECK_URL, config.APP_VERSION)
            current_app.logger.debug('Checking version data at: %s' % url)
            try:
                # Do not wait for more than 5 seconds.
                # It stuck on rendering the browser.html, while working in the
                # broken network.
                if os.path.exists(config.CA_FILE):
                    response = urlopen(url, data, 5, cafile=config.CA_FILE)
                else:
                    response = urlopen(url, data, 5)
                current_app.logger.debug(
                    'Version check HTTP response code: %d' % response.getcode()
                )

                if response.getcode() == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    current_app.logger.debug('Response data: %s' % data)
            except Exception:
                current_app.logger.exception(
                    'Exception when checking for update')
                return internal_server_error('Failed to check for update')

            if data is not None and \
                data[config.UPGRADE_CHECK_KEY]['version_int'] > \
                    config.APP_VERSION_INT:
                ret = {
                    "outdated": True,
                    "current_version": config.APP_VERSION,
                    "upgrade_version": data[config.UPGRADE_CHECK_KEY][
                        'version'],
                    "product_name": config.APP_NAME,
                    "download_url": data[config.UPGRADE_CHECK_KEY][
                        'download_url']
                }

        store_setting('LastUpdateCheck', today)
    return make_json_response(data=ret)
