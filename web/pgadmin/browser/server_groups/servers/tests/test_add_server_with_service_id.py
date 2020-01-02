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
from regression.python_test_utils import test_utils as utils


class ServersWithServiceIDAddTestCase(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = [
        # Fetch the default url for server object
        (
            'Default Server Node url', dict(
                url='/browser/server/obj/'
            )
        )
    ]

    def setUp(self):
        pass

    def runTest(self):
        """ This function will add the server under default server group."""
        url = "{0}{1}/".format(self.url, utils.SERVER_GROUP)
        # Add service name in the config
        self.server['service'] = "TestDB"
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.server_id = response_data['node']['_id']

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
