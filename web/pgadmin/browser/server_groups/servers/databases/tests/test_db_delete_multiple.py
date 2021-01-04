##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.utils import server_utils as server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class DatabaseMultipleDeleteTestCase(BaseTestGenerator):
    """ This class will delete the multiple database under
     last added server. """
    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node URL', dict(url='/browser/database/obj/'))
    ]

    def setUp(self):
        self.db_names = ["db_delete_%s" % str(uuid.uuid4())[1:8],
                         "db_delete_%s" % str(uuid.uuid4())[1:8]]

        self.db_ids = [utils.create_database(self.server, self.db_names[0]),
                       utils.create_database(self.server, self.db_names[1])]

        self.server_id = parent_node_dict["server"][-1]["server_id"]

    def runTest(self):
        """ This function will delete the databases."""
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["data"]["connected"]:
            data = {'ids': self.db_ids}
            response = self.tester.delete(
                self.url + str(utils.SERVER_GROUP) + '/' +
                str(self.server_id) + '/',
                follow_redirects=True,
                data=json.dumps(data),
                content_type='html/json')
            self.assertEqual(response.status_code, 200)
        else:
            raise Exception("Could not connect to server to delete the "
                            "database.")

    def tearDown(self):
        """This function drop the added databases"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        utils.drop_database_multiple(connection, self.db_names)
