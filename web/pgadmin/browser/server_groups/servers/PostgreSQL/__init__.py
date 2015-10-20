##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.browser.server_groups.servers import ServerTypeModule
from pgadmin.browser.utils import PGChildModule


class PGServer(ServerTypeModule, PGChildModule):
    NODE_TYPE = "pg"

    @property
    def node_type(self):
        return self.NODE_TYPE

    @property
    def jssnippets(self):
        return []

    @property
    def type(self):
        return "PG"

    @property
    def description(self):
        return "PostgreSQL"

    @property
    def driver(self):
        return "psycopg2"

    @property
    def priority(self):
        return 10

    def instanceOf(self, ver):
        return True

blueprint = PGServer(__name__, static_url_path='/static')
