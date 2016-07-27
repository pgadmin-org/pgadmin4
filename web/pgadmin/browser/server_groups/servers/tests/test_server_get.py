# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression.test_setup import config_data
from regression.test_utils import get_ids


class ServersGetTestCase(BaseTestGenerator):
    """
    This class will fetch added servers under default server group
    by response code.
    """

    scenarios = [
        # Fetch the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def setUp(self):
        """
        This function is used to add the server

        :return: None
        """

        utils.add_server(self.tester)

    def runTest(self):
        """ This function will fetch the added servers to object browser. """

        all_id = get_ids()
        server_ids = all_id["sid"]
        srv_grp = config_data['test_server_group']

        for server_id in server_ids:
            url = "{0}{1}/{2}".format(self.url, srv_grp, server_id)
            response = self.tester.get(url, content_type='html/json')
            self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """
        This function deletes the added server and the 'parent_id.pkl' file
        which is created in setup() function.

        :return: None
        """

        utils.delete_server(self.tester)
        utils.delete_parent_id_file()
