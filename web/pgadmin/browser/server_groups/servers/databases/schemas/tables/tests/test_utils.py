##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.schemas.tables import \
    BaseTableView
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch, MagicMock


class TestBaseView(BaseTableView):
    @BaseTableView.check_precondition
    def test(self, did, sid):
        pass
