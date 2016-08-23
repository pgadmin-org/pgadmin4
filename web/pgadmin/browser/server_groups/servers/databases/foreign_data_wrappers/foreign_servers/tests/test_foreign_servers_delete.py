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
from pgadmin.browser.server_groups.servers.databases.extensions.tests import\
    utils as extension_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import \
    utils as database_utils
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.tests\
    import utils as fdw_utils
from . import utils as fsrv_utils


class ForeignServerDeleteTestCase(BaseTestGenerator):
    """
    This class will add foreign server under FDW node.
    """

    scenarios = [
        # Fetching default URL for foreign server node.
        ('Check FSRV Node', dict(url='/browser/foreign_server/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
         This function perform the following tasks:
         1. Add and connect to the test server(s)
         2. Add database(s) connected to server(s)
         3. Add schemas to connected database(s)
         4. Add extension(s) to schema(s)
         5. Add foreign data wrapper(s) to extension(s)
         6. Add foreign server(s) to foreign data wrapper(s)

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

        # Add schema(s) under connected database(s)
        schema_utils.add_schemas(cls.tester)

        # Add extension(s) to schema(s)
        extension_utils.add_extensions(cls.tester)

        # Add foreign data wrapper(s) to extension(s)
        fdw_utils.add_fdw(cls.tester)

        # Add foreign server(s) to foreign data wrapper
        fsrv_utils.add_fsrv(cls.tester)

#
    def runTest(self):
        """ This function will delete foreign server under FDW node. """

        delete_respdata = fsrv_utils.delete_fsrv(self.tester)
        self.assertTrue(delete_respdata['success'], 1)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the added schema, database, server and parent
        id file

        :return: None
        """

        fdw_utils.delete_fdw(cls.tester)
        extension_utils.delete_extension(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
