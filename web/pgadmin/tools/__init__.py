##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module container for keeping all submodule of type tool."""

from flask import render_template, Response
from flask_babel import get_translations, gettext

from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request

MODULE_NAME = 'tools'

# Initialise the module
blueprint = PgAdminModule(MODULE_NAME, __name__)


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
