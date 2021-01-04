##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the about box."""

import sys
from flask import Response, render_template, __version__, url_for
from flask_babelex import gettext
from flask_security import current_user, login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.menu import MenuItem
from pgadmin.utils.constants import MIMETYPE_APP_JS
import config

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

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.about',
            'path': url_for('about.index') + 'about',
            'when': None
        }]

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
    info = {
        'python_version': sys.version,
        'flask_version': __version__
    }

    if config.SERVER_MODE:
        info['app_mode'] = gettext('Server')
    else:
        info['app_mode'] = gettext('Desktop')

    info['current_user'] = current_user.email

    return render_template(
        MODULE_NAME + '/index.html', info=info, _=gettext
    )


@blueprint.route("/about.js")
@login_required
def script():
    """render the required javascript"""
    return Response(
        response=render_template("about/about.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )
