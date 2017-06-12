##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

import pgadmin.utils.driver as driver
from flask import url_for, render_template, Response
from flask_babel import gettext as _
from pgadmin.utils import PgAdminModule
from pgadmin.utils.preferences import Preferences

import config

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
                'misc.static', filename='explain/vendor/snap.svg/' + (
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

    def register_preferences(self):
        """
        Register preferences for this module.
        """
        self.misc_preference = Preferences('miscellaneous', _('Miscellaneous'))

        lang_options = []
        for lang in config.LANGUAGES:
            lang_options.append({'label': config.LANGUAGES[lang],
                                 'value': lang})

        # Register options for the User language settings
        self.misc_preference.register(
            'miscellaneous', 'user_language',
            _("User language"), 'options', 'en',
            category_label=_('User language'),
            options=lang_options
        )

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return ['misc.ping']


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
    return Response(
        response=render_template(
            "explain/js/explain.js", _=_
        ),
        status=200,
        mimetype="application/javascript"
    )
