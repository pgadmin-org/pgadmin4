##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the about box."""
MODULE_NAME = 'about'

from pgadmin.utils import PgAdminModule
from pgadmin.utils.menu import MenuItem
from flask import Response, current_app, render_template, __version__, url_for
from flask.ext.babel import gettext
from flask.ext.security import current_user, login_required

import sys

import config


class AboutModule(PgAdminModule):
    def get_own_menuitems(self):
        return {
            'help_items': [
                MenuItem(name='mnu_about',
                         priority=999,
                         module="pgAdmin.About",
                         callback='about_show',
                         icon='fa fa-info-circle',
                         label=gettext('About %(appname)s',
                                       appname=config.APP_NAME))
            ]
        }

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.about',
            'path': url_for('about.index') + 'about',
            'when': None
        }]


blueprint = AboutModule(MODULE_NAME, __name__,
                        static_url_path='')

##########################################################################
# A test page
##########################################################################
@blueprint.route("/")
@login_required
def index():
    """Render the about box."""
    info = {}
    info['python_version'] = sys.version
    info['flask_version'] = __version__
    if config.SERVER_MODE is True:
        info['app_mode'] = gettext('Server')
    else:
        info['app_mode'] = gettext('Desktop')
    info['current_user'] = current_user.email

    return render_template(MODULE_NAME + '/index.html', info=info)


@blueprint.route("/about.js")
@login_required
def script():
    """render the required javascript"""
    return Response(response=render_template("about/about.js"),
                    status=200,
                    mimetype="application/javascript")
