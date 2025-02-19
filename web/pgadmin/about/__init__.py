##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the about box."""

from flask import Response, render_template, request
from flask_babel import gettext
from flask_security import current_user
from pgadmin.user_login_check import pga_login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.utils.ajax import make_json_response
import config
from pgadmin.model import User
from user_agents import parse
import platform
import re
import sys

MODULE_NAME = 'about'


class AboutModule(PgAdminModule):
    def get_own_menuitems(self):
        appname = config.APP_NAME

        return {
            'help_items': [
                MenuItem(
                    name='mnu_about',
                    priority=999,
                    module="pgAdmin.About",
                    callback='about_show',
                    icon='fa fa-info-circle',
                    label=gettext('About %(appname)s', appname=appname)
                )
            ]
        }

    def get_exposed_url_endpoints(self):
        return ['about.index']


blueprint = AboutModule(MODULE_NAME, __name__, static_url_path='')


##########################################################################
# A test page
##########################################################################
@blueprint.route("/", endpoint='index')
@pga_login_required
def index():
    """Render the about box."""
    info = {}
    # Get OS , NW.js, Browser details
    browser, os_details, electron_version = detect_browser(request)
    admin = is_admin(current_user.email)

    if electron_version:
        info['electron'] = electron_version

    if config.SERVER_MODE:
        info['app_mode'] = gettext('Server')
    else:
        info['app_mode'] = gettext('Desktop')

    info['commit_hash'] = getattr(config, 'COMMIT_HASH', None)
    info['browser_details'] = browser
    info['version'] = config.APP_VERSION
    info['admin'] = admin
    info['current_user'] = current_user.email
    info['python_version'] = sys.version.split(" ", maxsplit=1)[0]

    if admin:
        settings = ""
        info['os_details'] = os_details
        info['log_file'] = config.LOG_FILE

        # If external datbase is used do not display SQLITE_PATH
        if not config.CONFIG_DATABASE_URI:
            info['config_db'] = config.SQLITE_PATH

        for setting in dir(config):
            if not setting.startswith('_') and setting.isupper() and \
                setting not in ['CSRF_SESSION_KEY',
                                'SECRET_KEY',
                                'SECURITY_PASSWORD_SALT',
                                'SECURITY_PASSWORD_HASH',
                                'ALLOWED_HOSTS',
                                'MAIL_PASSWORD',
                                'LDAP_BIND_PASSWORD',
                                'SECURITY_PASSWORD_HASH']:
                if isinstance(getattr(config, setting), str):
                    settings = \
                        settings + '{} = "{}"\n'.format(
                            setting, getattr(config, setting))
                else:
                    settings = \
                        settings + '{} = {}\n'.format(
                            setting, getattr(config, setting))

        info['settings'] = settings

    return make_json_response(
        data=info,
        status=200
    )


def is_admin(load_user):
    user = User.query.filter_by(email=load_user).first()
    return user.has_role("Administrator")


def detect_browser(request):
    """This function returns the browser and os details"""
    electron_version = None
    agent = request.environ.get('HTTP_USER_AGENT')

    try:
        # available only for python 3.10 and above
        os_release = platform.freedesktop_os_release()
        os_details = os_release.get('PRETTY_NAME', '')
        if os_details:
            os_details += ', '
    except Exception as _:
        os_details = ''

    os_details += parse(platform.platform()).ua_string

    if 'Electron' in agent:
        electron_version = re.findall('Electron/([\\d.]+\\d+)', agent)[0]

    browser = re.findall(
        '(opera|chrome|safari|firefox|msie|trident(?=/))/?\\s*([\\d.]+\\d+)',
        agent, re.IGNORECASE)
    if not browser:
        browser = agent.split('/')[0]
    else:
        browser = " ".join(browser[0])

    return browser, os_details, electron_version
