##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as database_utils


class DatabasesUpdateTestCase(BaseTestGenerator):
    """This class will update the database under last added server."""
    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node', dict(url='/browser/database/obj/'))
    ]

    def setUp(self):
        self.db_name = "test_db_put_%s" % str(uuid.uuid4())[1:8]
        self.db_id = utils.create_database(self.server, self.db_name)
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        db_dict = {"server_id": self.server_id, "db_id": self.db_id,
                   "db_name": self.db_name}
        utils.write_node_info("did", db_dict)

    def runTest(self):
        """ This function will update the comments field of database."""
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 self.server_id,
                                                 self.db_id)
        if db_con["info"] == "Database connected.":
            try:
                data = {
                    "comments": "This is db update comment",
                    "id": self.db_id,
                    "schema_res": ["public"]
                }
                response = self.tester.put(
                    self.url + str(utils.SERVER_GROUP) + '/' + str(
                        self.server_id) + '/' +
                    str(self.db_id), data=json.dumps(data),
                    follow_redirects=True)
                self.assertEqual(response.status_code, 200)
            except Exception as exception:
                from traceback import print_exc
                print_exc()
                raise Exception("Error while updating database details. %s" %
                                exception)
            finally:
                # Disconnect database to delete it
                database_utils.disconnect_database(self, self.server_id,
                                                   self.db_id)
        else:
            raise Exception("Error while updating database details.")

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
