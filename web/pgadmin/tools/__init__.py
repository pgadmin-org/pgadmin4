##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module container for keeping all submodule of type tool."""

from flask_babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request

MODULE_NAME = 'tools'

# Initialise the module
blueprint = PgAdminModule(MODULE_NAME, __name__)


@blueprint.route("/")
def index():
    """Calling tools index URL directly is not allowed."""
    return bad_request(gettext('This URL cannot be requested directly.'))
