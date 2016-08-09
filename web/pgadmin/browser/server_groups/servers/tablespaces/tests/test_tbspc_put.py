# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from test_setup import advanced_config_data
from . import utils as tablespace_utils


class TableSpaceUpdateTestCase(BaseTestGenerator):
    """This class has update tablespace scenario"""

    scenarios = [
        # Fetching default URL for roles node.
        ('Check Tablespace Node', dict(url='/browser/tablespace/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function used to add the sever

        :return: None
        """

        # Add the server
        server_utils.add_server(cls.tester)

        # Connect to server
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the roles!!!")

        # Add tablespace
        tablespace_utils.add_table_space(cls.tester,
                                         cls.server_connect_response,
                                         cls.server_group, cls.server_ids)

    def runTest(self):
        """This function tests the update tablespace data scenario"""

        tablespace_ids_dict = None
        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        if "tsid" in all_id and all_id["tsid"]:
            tablespace_ids_dict = all_id["tsid"][0]

        if tablespace_ids_dict:
            for server_id in server_ids:
                tablespace_id = tablespace_ids_dict[int(server_id)]
                tablespace_response = tablespace_utils.verify_table_space(
                    self.tester,
                    utils.SERVER_GROUP, server_id,
                    tablespace_id)
                if len(tablespace_response) == 0:
                    raise Exception("No tablespace(s) to update!!!")

                data = {
                    "description": advanced_config_data["tbspc_update_data"]
                    ["comment"],
                    "table_space_id": tablespace_id
                }

                put_response = self.tester.put(
                    self.url + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(
                        tablespace_id),
                    data=json.dumps(data),
                    follow_redirects=True)

                self.assertEquals(put_response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the tablespaces,server and parent id file"""

        tablespace_utils.delete_table_space(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
