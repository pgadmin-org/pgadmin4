# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils


class SchemaGetTestCase(BaseTestGenerator):
    """ This class will add new schema under database node. """
    scenarios = [
        # Fetching default URL for extension node.
        ('Check Schema Node URL', dict(url='/browser/schema/obj/'))
    ]

    def runTest(self):
        """ This function will delete schema under database node. """
        schema = parent_node_dict["schema"][-1]
        db_id = schema["db_id"]
        server_id = schema["server_id"]

        server_response = server_utils.connect_server(self, server_id)
        if not server_response["data"]["connected"]:
            raise Exception("Could not connect to server to connect the"
                            " database.")

        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 server_id,
                                                 db_id)
        if not db_con["info"] == "Database connected.":
            raise Exception("Could not connect to database to get the schema.")

        schema_id = schema["schema_id"]
        schema_response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(server_id) + '/' + str(db_id) +
            '/' + str(schema_id),
            content_type='html/json')
        self.assertEquals(schema_response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, server_id, db_id)
