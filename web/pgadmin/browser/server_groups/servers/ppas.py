##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from flask.ext.babel import gettext
from pgadmin.browser.server_groups.servers.types import ServerType


class PPAS(ServerType):

    def instanceOf(self, ver):
        return ver.startswith("EnterpriseDB")

# Default Server Type
PPAS('ppas', gettext("Postgres Plus Advanced Server"), 2)
