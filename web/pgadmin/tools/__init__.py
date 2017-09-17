##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module container for keeping all submodule of type tool."""

from flask import render_template, Response
from flask import url_for
from flask_babel import get_translations, gettext

from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request

MODULE_NAME = 'tools'


class ToolsModule(PgAdminModule):
    def get_addon_javascripts(self, _for):
        res = []

        if _for == 'browser':
            res += [{
                'name': 'tools, and nodes',
                'url': url_for(
                    'static', filename='js/generated/tools_nodes.js'
                )
            }]

        res += PgAdminModule.get_addon_javascripts(self, _for)

        return res

# Initialise the module
blueprint = ToolsModule(MODULE_NAME, __name__)


@blueprint.route("/")
def index():
    """Calling tools index URL directly is not allowed."""
    return bad_request(gettext('This URL cannot be requested directly.'))

@blueprint.route("/translations.js")
def translations():
    """Return a js file that will handle translations so Flask interpolation can be isolated"""
    template = render_template("js/translations.js", translations=get_translations()._catalog)
    return Response(
        response=template,
        status=200,
        mimetype="application/javascript"
    )
