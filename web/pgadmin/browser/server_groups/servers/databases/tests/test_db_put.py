# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression import test_server_dict
from regression.test_setup import advanced_config_data
from . import utils as database_utils


class DatabasesUpdateTestCase(BaseTestGenerator):
    """This class will update the database under last added server."""
    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node', dict(url='/browser/database/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        cls.db_name = "test_db_put"
        cls.db_id = utils.create_database(cls.server, cls.db_name)

    def runTest(self):
        """ This function will update the comments field of database."""
        server_id = test_server_dict["server"][0]["server_id"]
        db_id = self.db_id
        db_con = database_utils.verify_database(self,
                                                utils.SERVER_GROUP,
                                                server_id,
                                                db_id)
        if db_con["info"] == "Database connected.":
            try:
                data = {
                    "comments": advanced_config_data["db_update_data"]["comment"],
                    "id": db_id
                }
                response = self.tester.put(self.url + str(utils.SERVER_GROUP) + '/' + str(
                        server_id) + '/' +
                    str(db_id), data=json.dumps(data), follow_redirects=True)
                self.assertEquals(response.status_code, 200)
            except Exception as exception:
                raise Exception("Error while updating database details. %s" %
                                exception)
            finally:
                # Disconnect database to delete it
                database_utils.disconnect_database(self, server_id, db_id)
        else:
            raise Exception("Error while updating database details.")

    @classmethod
    def tearDownClass(cls):
        """
        This function delete the database from server added in SQLite and
        clears the node_info_dict
        """
        connection = utils.get_db_connection(cls.server['db'],
                                             cls.server['username'],
                                             cls.server['db_password'],
                                             cls.server['host'],
                                             cls.server['port'])
        utils.drop_database(connection, cls.db_name)
        utils.clear_node_info_dict()
