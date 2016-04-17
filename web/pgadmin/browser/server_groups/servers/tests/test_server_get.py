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


class ServersGetTestCase(LoginTestCase):
    """
    This class will check server node present on the object browser's tree node
    by response code.
    """

    priority = 5

    scenarios = [
        # Fetch the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def runTest(self):
        """
        This function will get all available servers present under
        object browser.
        """

        srv_grp = config_data['test_server_group']

        for srv in config_data['test_server_credentials']:
            data = {"name": srv['test_name'],
                    "host": srv['test_host'],
                    "port": srv['test_db_port'],
                    "db": srv['test_maintenance_db'],
                    "username": srv['test_db_username'],
                    "role": "",
                    "sslmode": srv['test_sslmode']}

            url = self.url + str(srv_grp) + "/"
            response = self.tester.get(url, data=json.dumps(data),
                                       content_type='html/json')
            self.assertTrue(response.status_code, 200)
