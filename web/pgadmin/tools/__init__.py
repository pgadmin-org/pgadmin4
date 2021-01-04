##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module container for keeping all submodule of type tool."""

from flask import render_template, Response
from flask import url_for
from flask_babelex import Domain, gettext

from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request
from pgadmin.utils.constants import MIMETYPE_APP_JS

MODULE_NAME = 'tools'


class ToolsModule(PgAdminModule):
    def get_own_javascripts(self):
        return [{
            'name': 'translations',
            'path': url_for('tools.index') + "translations",
            'when': None
        }, {
            'name': 'pgadmin-sqlfoldcode',
            'path': url_for(
                'static',
                filename='js/codemirror/addon/fold/pgadmin-sqlfoldcode'
            ),
            'when': 'debugger'
        }, {
            'name': 'slick.pgadmin.editors',
            'path': url_for(
                'static',
                filename='js/slickgrid/slick.pgadmin.editors'
            ),
            'when': 'debugger'
        }, {
            'name': 'slick.pgadmin.formatters',
            'path': url_for(
                'static',
                filename='js/slickgrid/slick.pgadmin.formatters'
            ),
            'when': 'debugger'
        }]


# Initialise the module
blueprint = ToolsModule(MODULE_NAME, __name__)


@blueprint.route("/")
def index():
    """Calling tools index URL directly is not allowed."""
    return bad_request(gettext('This URL cannot be requested directly.'))


@blueprint.route("/translations.js")
def translations():
    """Return a js file that will handle translations so Flask interpolation
    can be isolated
    """
    domain = Domain()
    translations = domain.get_translations()
    template = render_template(
        "js/translations.js",
        translations=translations._catalog
    )
    return Response(
        response=template,
        status=200,
        mimetype=MIMETYPE_APP_JS
    )
