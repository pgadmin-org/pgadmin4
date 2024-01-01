##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import pgadmin.browser.server_groups.servers.roles.tests.utils as roles_utils
import pgadmin.browser.server_groups.servers.tablespaces.tests.utils as \
    tablespace_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import\
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.schemas.functions.tests\
    import utils as trigger_funcs_utils


global node_info_dict
node_info_dict = {
    "sid": [],  # server
    "did": [],  # database
    "lrid": [],  # role
    "tsid": [],  # tablespace
    "scid": []  # schema
}

global parent_node_dict
parent_node_dict = {
    "server": [],
    "database": [],
    "tablespace": [],
    "role": [],
    "schema": []
}
