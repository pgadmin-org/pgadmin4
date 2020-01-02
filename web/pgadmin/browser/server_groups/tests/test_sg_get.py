##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data


class SgNodeTestCase(BaseTestGenerator):
    """
     This class will check available server groups in pgAdmin.
    """

    scenarios = [
        # Fetching the default url for server group node
        ('Check Server Group Node', dict(url='/browser/server_group/obj/'))
    ]

    def runTest(self):
        """This function will check available server groups."""

        server_group_id = config_data['server_group']
        response = self.tester.get(self.url + str(server_group_id),
                                   content_type='html/json')
        self.assertTrue(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf8'))
        self.assertTrue(response_data['id'], server_group_id)
