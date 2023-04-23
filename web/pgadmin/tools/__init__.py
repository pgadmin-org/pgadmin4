##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module container for keeping all submodule of type tool."""

from flask import render_template, Response
from flask import url_for
from flask_babel import Domain, gettext

from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request, make_json_response
from pgadmin.utils.constants import MIMETYPE_APP_JS

MODULE_NAME = 'tools'


class ToolsModule(PgAdminModule):
    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        super().register(app, options)

        from .backup import blueprint as module
        app.register_blueprint(module)

        from .debugger import blueprint as module
        app.register_blueprint(module)

        from .erd import blueprint as module
        app.register_blueprint(module)

        from .grant_wizard import blueprint as module
        app.register_blueprint(module)

        from .import_export import blueprint as module
        app.register_blueprint(module)

        from .import_export_servers import blueprint as module
        app.register_blueprint(module)

        from .maintenance import blueprint as module
        app.register_blueprint(module)

        from .psql import blueprint as module
        app.register_blueprint(module)

        from .restore import blueprint as module
        app.register_blueprint(module)

        from .schema_diff import blueprint as module
        app.register_blueprint(module)

        from .search_objects import blueprint as module
        app.register_blueprint(module)

        from .sqleditor import blueprint as module
        app.register_blueprint(module)

        from .user_management import blueprint as module
        app.register_blueprint(module)

    def get_exposed_url_endpoints(self):
        """
        Returns:
        list: URL endpoints for tools module
        """
        return [
            'tools.initialize',
        ]


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


@blueprint.route(
    '/initialize/',
    methods=["GET"],
    endpoint='initialize'
)
def initialize():
    return make_json_response(
        data={}
    )
