##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the pg_timetable Jobs Node"""

from flask_babelex import gettext
from pgadmin.browser.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response, internal_server_error


class PGTimetableModule(PgAdminModule):
    def __init__(self, *args, **kwargs):
        super(PGTimetableModule, self).__init__(*args, **kwargs)
        self.submodules = []

    def get_own_all_modules(self):
        """Dynamically loads and initializes submodules like chains."""
        if not self.submodules:
            from .chains import blueprint as chains_blueprint
            self.submodules.append(chains_blueprint)
        return self.submodules

    @property
    def node_type(self):
        return 'pg_timetable'

    @property
    def label(self):
        return gettext('pg_timetable')

    def get_own_stylesheets(self):
        """Registers the custom CSS node icons."""
        return [
            'pg_timetable/css/pg_timetable.css'
        ]

    def get_own_javascripts(self):
        """
        Registers the front-end JS files. This tells pgAdmin's script loader
        to pull in your node definition file automatically on application load.
        """
        return [{
            'name': 'pg_timetable',
            'path': 'pg_timetable/js/pg_timetable',
            'when': None # Loads unconditionally during application boot
        }]

# Initialize the main extension blueprint
blueprint = PGTimetableModule('pg_timetable', __name__, static_folder='static')
