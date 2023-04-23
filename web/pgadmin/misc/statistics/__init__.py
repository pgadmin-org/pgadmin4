##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

from flask import url_for
from pgadmin.utils import PgAdminModule

MODULE_NAME = 'statistics'


class StatisticsModule(PgAdminModule):
    """
    StatisticsModule

    This module will render the statistics of the browser nodes on selection
    when statistics panel is active.
    """
    pass


# Initialise the module
blueprint = StatisticsModule(
    MODULE_NAME, __name__, url_prefix='/misc/statistics'
)
