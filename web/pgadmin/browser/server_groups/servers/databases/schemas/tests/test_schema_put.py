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
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression.test_setup import advanced_config_data
from . import utils as schema_utils


class SchemaPutTestCase(BaseTestGenerator):
    """ This class will update the schema under database node. """

    scenarios = [
        # Fetching default URL for extension node.
        ('Check Schema Node URL', dict(url='/browser/schema/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """
        This function perform the three tasks
         1. Add the test server
         2. Connect to server
         3. Add the databases

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

    def runTest(self):
        """ This function will delete schema under database node. """

        all_id = utils.get_ids()
        db_ids_dict = all_id["did"][0]
        schema_ids_dict = all_id["scid"][0]

        for server_connect_data, server_id in zip(self.server_connect_response,
                                             self.server_ids):
            db_id = db_ids_dict[int(server_id)]
            db_con = database_utils.verify_database(self.tester,
                                                    utils.SERVER_GROUP,
                                                    server_id, db_id)
            if db_con['data']["connected"]:
                schema_id = schema_ids_dict[int(server_id)][0]
                schema_response = schema_utils.verify_schemas(self.tester,
                                                              server_id, db_id,
                                                              schema_id)
                schema_response = json.loads(
                    schema_response.data.decode('utf-8'))
                if not schema_response:
                    raise Exception("No schema(s) to update.")

                adv_config_data = None
                data = None
                db_user = server_connect_data['data']['user']['name']
                # Get the config data of appropriate db user
                for config_test_data in advanced_config_data['schema_update_data']:
                    if db_user == config_test_data['owner']:
                        adv_config_data = config_test_data

                if adv_config_data is not None:
                    data = {
                        "deffuncacl": adv_config_data["func_acl"],
                        "defseqacl": adv_config_data["seq_acl"],
                        "deftblacl": adv_config_data["tbl_acl"],
                        "id": schema_id
                    }
                put_response = self.tester.put(
                    self.url + str(utils.SERVER_GROUP) + '/' + str(server_id) +
                    '/' + str(db_id) + '/' + str(schema_id),
                    data=json.dumps(data), follow_redirects=True)

                self.assertEquals(put_response.status_code, 200)
                response_data = json.loads(put_response.data.decode('utf-8'))
                self.assertTrue(response_data['success'], 1)

    @classmethod
    def tearDownClass(cls):
        """
        This function deletes the added schemas, database, server
        and the 'parent_id.pkl' file which is created in setup() function.

        :return: None
        """

        schema_utils.delete_schema(cls.tester)
        database_utils.delete_database(cls.tester)
        server_utils.delete_server(cls.tester)
        utils.delete_parent_id_file()
