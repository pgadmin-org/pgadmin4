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
from . import utils as extension_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import\
    utils as schema_utils



class ExtensionsAddTestCase(BaseTestGenerator):

    scenarios = [
            # Fetching default URL for extension node.
            ('Check Extension Node', dict(url='/browser/extension/obj/'))
        ]

    @classmethod
    def setUpClass(cls):
        """
              This function perform the following tasks:
              1. Add and connect to the test server(s)
              2. Add database(s) connected to server(s)
              3. Add schemas to connected database(s)

             :return: None
        """

        # Add the server
        server_utils.add_server(cls.tester)

        # Connect to servers
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)

        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the database!!!")

        # Add databases to connected servers
        database_utils.add_database(cls.tester, cls.server_connect_response,
                                    cls.server_ids)

        schema_utils.add_schemas(cls.tester)

    def runTest(self):
        """ This function will add extension under 1st server of tree node. """

        extension_utils.add_extensions(self.tester)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the added schema, database, server and parent
        id file

        :return: None
        """

        extension_utils.delete_extension(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
