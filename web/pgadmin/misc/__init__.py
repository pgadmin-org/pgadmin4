##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""
MODULE_NAME = 'misc'

from pgadmin.utils import PgAdminModule

# Initialise the module
blueprint = PgAdminModule(MODULE_NAME, __name__,
                          url_prefix='')

##########################################################################
# A special URL used to "ping" the server
##########################################################################
@blueprint.route("/ping")
def ping():
    """Generate a "PING" response to indicate that the server is alive."""
    return "PING"
