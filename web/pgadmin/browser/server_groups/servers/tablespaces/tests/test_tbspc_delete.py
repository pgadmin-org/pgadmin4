# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################


from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from . import utils as tablespace_utils


class TableSpaceDeleteTestCase(BaseTestGenerator):
    """This class has delete table space scenario"""

    scenarios = [
        # Fetching default URL for tablespace node.
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
        """This function tests the delete table space scenario"""

        tablespace_utils.delete_table_space(self.tester)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the server and parent id file"""

        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
