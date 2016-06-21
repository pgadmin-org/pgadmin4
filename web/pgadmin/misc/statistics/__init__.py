##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
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

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.browser.object_statistics',
            'path': url_for('statistics.static', filename='js/statistics'),
            'when': None
        }]


# Initialise the module
blueprint = StatisticsModule(
    MODULE_NAME, __name__, url_prefix='/misc/statistics'
)
