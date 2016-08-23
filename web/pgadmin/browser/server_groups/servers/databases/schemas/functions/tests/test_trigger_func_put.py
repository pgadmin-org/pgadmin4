# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import json

from regression import test_utils as utils
from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import advanced_config_data
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from . import utils as trigger_funcs_utils


class TriggerFuncPutTestCase(BaseTestGenerator):
    """ This class will update new trigger function under schema node. """

    scenarios = [
        # Fetching default URL for trigger function node.
        ('Fetch Trigger Function Node URL',
         dict(url='/browser/trigger_function/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function perform the three tasks
         1. Add the test server
         2. Connect to server
         3. Add the databases
         4. Add the schemas
         5. Add the trigger functions

        :return: None
        """

        # Firstly, add the server
        server_utils.add_server(cls.tester)
        # Connect to server
        cls.server_connect_response, cls.server_group, cls.server_ids = \
            server_utils.connect_server(cls.tester)
        if len(cls.server_connect_response) == 0:
            raise Exception("No Server(s) connected to add the database!!!")
        # Add database
        database_utils.add_database(cls.tester, cls.server_connect_response,
                                    cls.server_ids)
        # Add schemas
        schema_utils.add_schemas(cls.tester)
        # Add trigger functions
        trigger_funcs_utils.add_trigger_function(
            cls.tester, cls.server_connect_response, cls.server_ids)

    def runTest(self):
        """ This function will update trigger function under database node. """

        all_id = utils.get_ids()
        server_ids = all_id["sid"]
        db_ids_dict = all_id["did"][0]
        schema_ids_dict = all_id["scid"][0]
        trigger_ids_dict = all_id["tfnid"][0]
        for server_id in server_ids:
            db_id = db_ids_dict[int(server_id)]
            db_con = database_utils.verify_database(self.tester,
                                                    utils.SERVER_GROUP,
                                                    server_id, db_id)
            if db_con['data']["connected"]:
                schema_id = schema_ids_dict[int(server_id)]
                schema_response = schema_utils.verify_schemas(self.tester,
                                                              server_id,
                                                              db_id,
                                                              schema_id)
                if schema_response.status_code == 200:
                    trigger_func_list = trigger_ids_dict[int(server_id)]
                    for trigger_func in trigger_func_list:
                        trigger_func_id = trigger_func[0]
                        trigger_response = \
                            trigger_funcs_utils.verify_trigger_function(
                                self.tester, server_id, db_id, schema_id,
                                trigger_func_id)
                        if trigger_response.status_code == 200:
                            data = {
                                "description": advanced_config_data[
                                    'trigger_func_update_data']['comment'],
                                "id": trigger_func_id
                            }

                            put_response = self.tester.put(
                                self.url + str(utils.SERVER_GROUP) + '/' +
                                str(server_id) + '/' +
                                str(db_id) + '/' +
                                str(schema_id) + '/' +
                                str(trigger_func_id),
                                data=json.dumps(data),
                                follow_redirects=True)

                            self.assertEquals(put_response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added trigger function, schemas, database,
        server and the 'parent_id.pkl' file which is created in setup()
        function.

        :return: None
        """

        trigger_funcs_utils.delete_trigger_function(cls.tester)
        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
