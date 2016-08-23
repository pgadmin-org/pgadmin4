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
from . import utils as fdw_utils


class FDWDGetTestCase(BaseTestGenerator):
    """ This class will add foreign data wrappers under database node. """

    scenarios = [
            # Fetching default URL for foreign_data_wrapper node.
            ('Check FDW Node',
             dict(url='/browser/foreign_data_wrapper/obj/'))
        ]

    @classmethod
    def setUpClass(cls):
        """This function use to add/connect the servers and create databases"""

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

        extension_utils.add_extensions(cls.tester)

        fdw_utils.add_fdw(cls.tester)

    def runTest(self):
        """ This function will get added FDW. """

        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        db_ids_dict = all_id["did"][0]
        fdw_ids_dict = all_id["fid"][0]

        for server_id in server_ids:
            db_id = db_ids_dict[int(server_id)]
            fdw_id = fdw_ids_dict[server_id]

            response = fdw_utils.verify_fdws(self.tester,
                                             utils.SERVER_GROUP,
                                             server_id, db_id,
                                             fdw_id)

            self.assertEquals(response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """This function deletes the added schema, database, server and parent
        id file
        """
        fdw_utils.delete_fdw(cls.tester)
        extension_utils.delete_extension(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
