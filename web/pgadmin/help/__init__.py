##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the pgAdmin help system."""
from flask import url_for
from flask_babel import gettext
from pgadmin.utils import PgAdminModule
from pgadmin.utils.menu import MenuItem, Panel
from pgadmin.utils.preferences import Preferences
import config

MODULE_NAME = 'help'


class HelpModule(PgAdminModule):
    def get_own_menuitems(self):
        """Return a (set) of dicts of help menu items, with name, priority,
        URL, target and onclick code."""
        return {'help_items': [
            MenuItem(name='mnu_quick_search_help',
                     label=gettext('Quick Search'),
                     priority=99,
                     target='pgadmin_quick_search_help',
                     icon='fa fa-question',
                     url='#'),
            MenuItem(name='mnu_online_help',
                     label=gettext('Online Help'),
                     priority=100,
                     target='pgadmin_help',
                     icon='fa fa-question',
                     url=url_for('help.static', filename='index.html')),

            MenuItem(name='mnu_pgadmin_website',
                     label=gettext('pgAdmin Website'),
                     priority=200,
                     target='pgadmin_website',
                     icon='fa fa-external-link-alt',
                     url='https://www.pgadmin.org/'),

            MenuItem(name='mnu_postgresql_website',
                     label=gettext('PostgreSQL Website'),
                     priority=300,
                     target='postgres_website',
                     icon='fa fa-external-link-alt',
                     url='https://www.postgresql.org/')]}

    def register_preferences(self):
        """
        register_preferences
        Register preferences for this module.
        """
        # Register options for the PG and PPAS help paths
        self.help_preference = Preferences('paths', gettext('Paths'))

        self.pg_help_path = self.help_preference.register(
            'help', 'pg_help_path',
            gettext("PostgreSQL Help Path"), 'text',
            'https://www.postgresql.org/docs/$VERSION$/',
            category_label=gettext('Help'),
            help_str=gettext(
                'Path to the PostgreSQL documentation. $VERSION$ will be '
                'replaced with the major.minor version number.'
            )
        )

    def get_exposed_url_endpoints(self):
        """
        Returns the list of URLs exposed to the client.
        """
        return ['help.static']


# Initialise the module
blueprint = HelpModule(
    MODULE_NAME, __name__,
    static_url_path='/help',
    static_folder=config.HELP_PATH
)
