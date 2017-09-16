##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

from pgadmin.utils import PgAdminModule

MODULE_NAME = 'statistics'


# Initialise the module
blueprint = PgAdminModule(MODULE_NAME, __name__, url_prefix='/misc/statistics')
