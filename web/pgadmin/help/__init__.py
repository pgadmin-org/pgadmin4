##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the pgAdmin help system."""
MODULE_NAME = 'help'

from pgadmin.utils.preferences import Preferences
from pgadmin.utils import PgAdminModule
from pgadmin.utils.menu import MenuItem, Panel
from flask.ext.babel import gettext
from flask import url_for
import config


class HelpModule(PgAdminModule):

    def get_own_menuitems(self):
        """Return a (set) of dicts of help menu items, with name, priority, URL,
        target and onclick code."""
        return { 'help_items': [
            MenuItem(name='mnu_online_help',
                     label=gettext('Online Help'),
                     priority=100,
                     target='_blank',
                     url=url_for('help.static', filename='index.html')),

            MenuItem(name='mnu_pgadmin_website',
                     label= gettext('pgAdmin Website'),
                     priority= 200,
                     target= '_blank',
                     url= 'http://www.pgadmin.org/' ),

            MenuItem(name= 'mnu_postgresql_website',
                     label= gettext('PostgreSQL Website'),
                     priority= 300,
                     target= '_blank',
                     url= 'http://www.postgresql.org/' )]}

    def get_panels(self):
        return [
            Panel(
                name='pnl_online_help',
                priority=100,
                title=gettext('Online Help'),
                content=url_for('help.static', filename='index.html')),

            Panel(name='pnl_pgadmin_website',
                  priority=200,
                  title=gettext('pgAdmin Website'),
                  content='http://www.pgadmin.org/'),

            Panel(name='pnl_postgresql_website',
                  priority=300,
                  title=gettext('PostgreSQL Website'),
                  content='http://www.postgresql.org/'),

            Panel(name='pnl_sql_help',
                  priority=400,
                  isPrivate=True,
                  title=gettext('SQL Help'))]

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
            'http://www.postgresql.org/docs/$VERSION$/static/',
            category_label=gettext('Help'),
            help_str=gettext('Path to the PostgreSQL documentation. $VERSION$ will be replaced with the major.minor version number.')
            )

        self.edbas_help_path = self.help_preference.register(
            'help', 'edbas_help_path',
            gettext("EDB Advanced Server Help Path"), 'text',
            'http://www.enterprisedb.com/docs/en/$VERSION$/pg/',
            category_label=gettext('Help'),
            help_str=gettext('Path to the EDB Advanced Server documentation. $VERSION$ will be replaced with the major.minor version number.')
            )

# Initialise the module
blueprint = HelpModule(MODULE_NAME, __name__, static_url_path='/help',
                       static_folder=config.HELP_PATH)
