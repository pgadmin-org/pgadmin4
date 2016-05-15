##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

from flask import url_for, render_template

import config
from pgadmin.utils import PgAdminModule
import pgadmin.utils.driver as driver

MODULE_NAME = 'misc'


class MiscModule(PgAdminModule):

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.misc.explain',
            'path': url_for('misc.index') + 'explain/explain',
            'preloaded': False
        }, {
            'name': 'snap.svg',
            'path': url_for(
                'misc.static', filename='explain/js/' + (
                    'snap.svg' if config.DEBUG else 'snap.svg-min'
                )),
            'preloaded': False
        }]

    def get_own_stylesheets(self):
        stylesheets = []
        stylesheets.append(
            url_for('misc.static', filename='explain/css/explain.css')
        )
        return stylesheets


# Initialise the module
blueprint = MiscModule(MODULE_NAME, __name__)


##########################################################################
# A special URL used to "ping" the server
##########################################################################
@blueprint.route("/")
def index():
    return ''


##########################################################################
# A special URL used to "ping" the server
##########################################################################
@blueprint.route("/ping", methods=('get', 'post'))
def ping():
    """Generate a "PING" response to indicate that the server is alive."""
    driver.ping()

    return "PING"


@blueprint.route("/explain/explain.js")
def explain_js():
    """
    explain_js()

    Returns:
        javascript for the explain module
    """
    return render_template("explain/js/explain.js")
