##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the about box."""

from flask import Response, render_template, request
from flask_babel import gettext
from flask_security import current_user, login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.utils.ajax import make_json_response
import config
import httpagentparser
from pgadmin.model import User
from user_agents import parse
import platform

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
@login_required
def index():
    """Render the about box."""
    info = {}
    # Get OS , NW.js, Browser details
    browser, os_details, nwjs_version = detect_browser(request)
    admin = is_admin(current_user.email)

    if nwjs_version:
        info['nwjs'] = nwjs_version

    if config.SERVER_MODE:
        info['app_mode'] = gettext('Server')
    else:
        info['app_mode'] = gettext('Desktop')

    info['browser_details'] = browser
    info['version'] = config.APP_VERSION
    info['admin'] = admin
    info['current_user'] = current_user.email

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
    nwjs_version = None
    agent = request.environ.get('HTTP_USER_AGENT')
    os_details = parse(platform.platform()).ua_string

    if 'Nwjs' in agent:
        agent = agent.split('-')
        nwjs_version = agent[0].split(':')[1]
        browser = 'Chromium' + ' ' + agent[2]

    else:
        browser = httpagentparser.detect(agent)
        if not browser:
            browser = agent.split('/')[0]
        else:
            browser = browser['browser']['name'] + ' ' + browser['browser'][
                'version']

    return browser, os_details, nwjs_version


@blueprint.route("/about.js")
@login_required
def script():
    """render the required javascript"""
    return Response(
        response=render_template("about/about.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )
