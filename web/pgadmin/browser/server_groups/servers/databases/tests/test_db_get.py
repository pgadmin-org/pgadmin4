##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as database_utils


class DatabasesGetTestCase(BaseTestGenerator):
    """
    This class will fetch database added under last added server.
    """
    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node URL', dict(url='/browser/database/obj/'))
    ]

    def runTest(self):
        """ This function will fetch added database. """
        server_data = parent_node_dict["database"][-1]
        server_id = server_data["server_id"]
        db_id = server_data['db_id']
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 server_id,
                                                 db_id)
        try:
            if db_con["info"] == "Database connected.":
                response = self.tester.get(
                    self.url + str(utils.SERVER_GROUP) + '/' + str(
                        server_id) + '/' +
                    str(db_id), follow_redirects=True)
                self.assertEquals(response.status_code, 200)
            else:
                raise Exception("Could not connect to database.")
        except Exception as exception:
            raise Exception("Error while getting database. %s" % exception)
        finally:
            # Disconnect database to delete it
            database_utils.disconnect_database(self, server_id, db_id)
