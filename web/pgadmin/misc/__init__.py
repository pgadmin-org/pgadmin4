##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

import pgadmin.utils.driver as driver
from flask import url_for, render_template, Response, request
from flask_babelex import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.preferences import Preferences

import config

MODULE_NAME = 'misc'


class MiscModule(PgAdminModule):
    def get_own_javascripts(self):
        return [
            {
                'name': 'pgadmin.misc.explain',
                'path': url_for('misc.index') + 'explain/explain',
                'preloaded': False
            }, {
                'name': 'snap.svg',
                'path': url_for(
                    'misc.static', filename='explain/vendor/snap.svg/' + (
                        'snap.svg' if config.DEBUG else 'snap.svg-min'
                    )),
                'preloaded': False
            }
        ]

    def get_own_stylesheets(self):
        stylesheets = []
        stylesheets.append(
            url_for('misc.static', filename='explain/css/explain.css')
        )
        return stylesheets

    def register_preferences(self):
        """
        Register preferences for this module.
        """
        self.misc_preference = Preferences(
            'miscellaneous', gettext('Miscellaneous')
        )

        lang_options = []
        for lang in config.LANGUAGES:
            lang_options.append(
                {
                    'label': config.LANGUAGES[lang],
                    'value': lang
                }
            )

        # Register options for the User language settings
        self.misc_preference.register(
            'miscellaneous', 'user_language',
            gettext("User language"), 'options', 'en',
            category_label=gettext('User language'),
            options=lang_options
        )

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return ['misc.ping', 'misc.index', 'misc.cleanup']


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
def ping():
    """Generate a "PING" response to indicate that the server is alive."""
    return "PING"


# For Garbage Collecting closed connections
@blueprint.route("/cleanup", methods=['POST'])
def cleanup():
    driver.ping()
    return ""


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
        mimetype="application/javascript"
    )


##########################################################################
# A special URL used to shut down the server
##########################################################################
@blueprint.route("/shutdown", methods=('get', 'post'))
def shutdown():
    if config.SERVER_MODE is not True:
        func = request.environ.get('werkzeug.server.shutdown')
        if func is None:
            raise RuntimeError('Not running with the Werkzeug Server')
        func()
        return 'SHUTDOWN'
    else:
        return ''
