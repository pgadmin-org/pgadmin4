##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as database_utils


class DatabaseAddTestCase(BaseTestGenerator):
    """This class will test the ADD database API"""
    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node URL', dict(url='/browser/database/obj/'))
    ]

    def setUp(self):
        pass

    def runTest(self):
        """ This function will add database under 1st server of tree node. """
        self.db_name = ''
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] == "Server connected.":
            db_owner = server_response['data']['user']['name']
            server_version = server_response['data']['version']
            self.data = database_utils.get_db_data(db_owner, server_version)
            self.data['template'] = 'template0'
            self.db_name = self.data['name']
            response = self.tester.post(self.url + str(utils.SERVER_GROUP) +
                                        "/" + str(self.server_id) + "/",
                                        data=json.dumps(self.data),
                                        content_type='html/json')
            self.assertEqual(response.status_code, 200)
            response_data = json.loads(response.data.decode('utf-8'))
            db_id = response_data['node']['_id']
            db_dict = {"server_id": self.server_id, "db_id": db_id,
                       "db_name": self.db_name}
            utils.write_node_info("did", db_dict)
        else:
            raise Exception("Error while connecting server to add the"
                            " database.")

    def tearDown(self):
        """
        This function delete the database from server added in SQLite.
        """
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
