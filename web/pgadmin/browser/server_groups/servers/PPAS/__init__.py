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
from flask.ext.babel import gettext


class PPASServer(ServerTypeModule, PGChildModule):
    NODE_TYPE = "ppas"

    @property
    def node_type(self):
        return self.NODE_TYPE

    @property
    def jssnippets(self):
        return []

    @property
    def type(self):
        return "PPAS"

    @property
    def description(self):
        return "Postgres Plus Advanced Server"

    @property
    def driver(self):
        return "psycopg2"

    @property
    def priority(self):
        return 1

    def instanceOf(self, ver):
        return ver.startswith("EnterpriseDB")

blueprint = PPASServer(__name__, static_url_path='/static')
