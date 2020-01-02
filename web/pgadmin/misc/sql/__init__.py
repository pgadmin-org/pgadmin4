##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

from flask import url_for
from pgadmin.utils import PgAdminModule

MODULE_NAME = 'sql'


class SQLModule(PgAdminModule):
    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.browser.object_sql',
            'path': url_for('sql.static', filename='js/sql'),
            'when': None
        }]


# Initialise the module
blueprint = SQLModule(MODULE_NAME, __name__, url_prefix='/misc/sql')
