##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module container for keeping all submodule of type tool."""

from flask_babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import bad_request

MODULE_NAME = 'tools'

class ToolsModule(PgAdminModule):
    def get_own_javascripts(self):
        from flask import url_for
        return [{
            'name': 'pgadmin-sqlfoldcode',
            'path': url_for(
                'static',
                filename='js/codemirror/addon/fold/pgadmin-sqlfoldcode'
            ),
            'when': 'debugger'
        },{
            'name': 'slick.pgadmin.editors',
            'path': url_for(
                'static',
                filename='js/slickgrid/slick.pgadmin.editors'
            ),
            'when': 'debugger'
        },{
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
