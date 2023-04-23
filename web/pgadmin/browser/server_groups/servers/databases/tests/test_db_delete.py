##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class DatabaseDeleteTestCase(BaseTestGenerator):
    """ This class will delete the database under last added server. """
    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node URL', dict(url='/browser/database/obj/'))
    ]

    def setUp(self):
        self.db_name = "db_delete_%s" % str(uuid.uuid4())[1:8]
        self.db_id = utils.create_database(self.server, self.db_name)
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        db_dict = {"server_id": self.server_id, "db_id": self.db_id,
                   "db_name": self.db_name}
        utils.write_node_info("did", db_dict)

    def runTest(self):
        """ This function will delete the database."""
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["data"]["connected"]:
            db_id = self.db_id
            response = self.tester.delete(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(self.server_id) + '/' + str(db_id),
                follow_redirects=True)
            self.assertEqual(response.status_code, 200)
        else:
            raise Exception("Could not connect to server to delete the "
                            "database.")

    def tearDown(self):
        """This function drop the added database"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        utils.drop_database(connection, self.db_name)
