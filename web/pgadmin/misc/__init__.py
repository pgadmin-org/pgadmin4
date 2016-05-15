##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

from pgadmin.utils import PgAdminModule
import pgadmin.utils.driver as driver

MODULE_NAME = 'misc'

# Initialise the module
blueprint = PgAdminModule(
    MODULE_NAME, __name__, url_prefix=''
)

##########################################################################
# A special URL used to "ping" the server
##########################################################################


@blueprint.route("/ping", methods=('get', 'post'))
def ping():
    """Generate a "PING" response to indicate that the server is alive."""
    driver.ping()

    return "PING"
