# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

import json

from pgadmin.browser.tests.test_login import LoginTestCase
from regression.config import config_data


class ServersAddTestCase(LoginTestCase):
    """
    This class will add the servers under default server group and verify with
    server's name.
    """

    priority = 4

    scenarios = [
        # Fetch the default url for server object
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def runTest(self):
        """
        This function will add the server under default server group.
        Verify the added server with response code as well as server name.
        """

        srv_grp = config_data['test_server_group']

        for srv in config_data['test_server_credentials']:
            data = {"name": srv['test_name'],
                    "comment": "",
                    "host": srv['test_host'],
                    "port": srv['test_db_port'],
                    "db": srv['test_maintenance_db'],
                    "username": srv['test_db_username'],
                    "role": "",
                    "sslmode": srv['test_sslmode']}

            url = self.url + str(srv_grp) + "/"

            response = self.tester.post(url, data=json.dumps(data),
                                        content_type='html/json')
            self.assertTrue(response.status_code, 200)
            respdata = json.loads(response.data)
            self.assertTrue(respdata['node']['label'], srv['test_name'])
