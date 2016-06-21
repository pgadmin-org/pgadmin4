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

MODULE_NAME = 'depends'


class DependsModule(PgAdminModule):
    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.browser.object_depends',
            'path': url_for('depends.static', filename='js/depends'),
            'when': None
        }]


# Initialise the module
blueprint = DependsModule(MODULE_NAME, __name__, url_prefix='/misc/depends')
