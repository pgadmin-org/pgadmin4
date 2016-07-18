# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression.test_setup import config_data
from regression.test_utils import get_ids


class ServersAddTestCase(BaseTestGenerator):
    """ This class will add the servers under default server group. """

    scenarios = [
        # Fetch the default url for server object
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def setUp(self):
        """
        This function login the test account before running the logout
        test case
        """

        utils.login_tester_account(self.tester)

    def runTest(self):
        """ This function will add the server under default server group."""

        server_group, config_data, pickle_id_dict = utils.get_config_data()
        for server_data in config_data:
            url = "{0}{1}/".format(self.url, server_group)
            response = self.tester.post(url, data=json.dumps(server_data),
                                        content_type='html/json')

            self.assertTrue(response.status_code, 200)

            response_data = json.loads(response.data.decode())
            utils.write_parent_id(response_data, pickle_id_dict)

    def tearDown(self):
        """
        This function deletes the 'parent_id.pkl' file which is created in
        setup() function. Also this function logout the test client

        :return: None
        """

        utils.delete_server(self.tester)
        utils.delete_parent_id_file()
        utils.logout_tester_account(self.tester)
