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
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.tests \
    import utils as fdw_utils
from pgadmin.browser.server_groups.servers.databases.foreign_data_wrappers.\
    foreign_servers.tests import utils as fsrv_utils
from . import utils as um_utils
from regression.test_setup import advanced_config_data
import json


class UserMappingPutTestCase(BaseTestGenerator):
    """
    This class will update user mapping under foreign server node.
    """

    scenarios = [
        # Fetching default URL for user mapping node.
        ('Check user mapping Node', dict(url='/browser/user_mapping/obj/'))
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
         7. Add user mapping(s) to foreign server(s)

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

        # Add user mapping(s) to foreign server(s)
        um_utils.add_um(cls.tester)

    def runTest(self):
        """ This function update user mapping under foreign server node. """

        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        db_ids_dict = all_id["did"][0]
        fdw_ids_dict = all_id["fid"][0]
        fsrv_ids_dict = all_id["fsid"][0]
        um_ids_dict = all_id["umid"][0]

        for server_id in server_ids:
            db_id = db_ids_dict[int(server_id)]
            fdw_id = fdw_ids_dict[server_id]
            fsrv_id = fsrv_ids_dict[server_id]
            um_id = um_ids_dict[server_id]

            response = um_utils.verify_um(self.tester, utils.SERVER_GROUP,
                                          server_id, db_id,
                                          fdw_id, fsrv_id, um_id)
            if response.status_code == 200:

                data = \
                    {
                        "id": um_id,
                        "umoptions":
                            advanced_config_data['user_mapping_update_data']
                            ['options']
                    }

                put_response = self.tester.put(
                    self.url + str(utils.SERVER_GROUP) + '/' +
                    str(server_id) + '/' + str(db_id) +
                    '/' + str(fdw_id) + '/' +
                    str(fsrv_id) + '/' + str(um_id),
                    data=json.dumps(data),
                    follow_redirects=True)

                self.assertEquals(put_response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added foreign server(s) ,
        foreign data wrapper(s), extension(s), schema(s), database(s),
        server(s) and parent id file

        :return: None
        """

        um_utils.delete_um(cls.tester)
        fsrv_utils.delete_fsrv(cls.tester)
        fdw_utils.delete_fdw(cls.tester)
        extension_utils.delete_extension(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
