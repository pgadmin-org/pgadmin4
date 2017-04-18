##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask_babel import gettext
from pgadmin.browser.server_groups.servers.types import ServerType


class PPAS(ServerType):
    UTILITY_PATH_LABEL = gettext("EDB Advanced Server Binary Path")
    UTILITY_PATH_HELP = gettext(
        "Path to the directory containing the EDB Advanced Server utility"
        " programs (pg_dump, pg_restore etc)."
    )

    def instanceOf(self, ver):
        return ver.startswith("EnterpriseDB")


# Default Server Type
PPAS('ppas', gettext("EDB Advanced Server"), 2)
