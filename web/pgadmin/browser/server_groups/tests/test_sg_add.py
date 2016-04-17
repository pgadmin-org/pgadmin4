###########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
###########################################################################

import json

from pgadmin.browser.tests.test_login import LoginTestCase
from regression.config import config_data


class SgNodeTestCase(LoginTestCase):
    """
     This class will check available server groups in pgAdmin.
    """

    priority = 1

    scenarios = [
        # Fetching the default url for server group node
        ('Check Server Group Node', dict(url='/browser/server-group/obj/'))
    ]

    def runTest(self):
        """This function will check available server groups."""

        i = config_data['test_server_group']

        response = self.tester.get(self.url + str(i), content_type='html/json')
        self.assertTrue(response.status_code, 200)
        respdata = json.loads(response.data)
        self.assertTrue(respdata['id'], i)
