# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid
import json

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils


class CollationAddTestCase(BaseTestGenerator):
    """ This class will add new collation under schema node. """
    scenarios = [
        # Fetching default URL for collation node.
        ('Default Node URL', dict(url='/browser/collation/obj/'))
    ]

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        # Change the db name, so that schema will create in newly created db
        self.schema_name = "schema_get_%s" % str(uuid.uuid4())[1:6]
        connection = utils.get_db_connection(self.db_name,
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        self.schema_details = schema_utils.create_schema(connection,
                                                         self.schema_name)

    def runTest(self):
        """ This function will add collation under schema node. """
        schema_info = parent_node_dict["schema"][-1]
        server_id = schema_info["server_id"]
        db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 server_id, db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add collation.")
        schema_id = self.schema_details[0]
        schema_name = self.schema_details[1]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add the collation.")

        data = {
            "copy_collation": "pg_catalog.\"POSIX\"",
            "name": "collation_add_%s" % str(uuid.uuid4())[1:6],
            "owner": self.server["username"],
            "schema": schema_name
        }
        response = self.tester.post(self.url + str(utils.SERVER_GROUP) + '/' +
                                    str(server_id) + '/' + str(
            db_id) + '/' + str(schema_id) + '/',
                                    data=json.dumps(data),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, server_id, db_id)

    def tearDown(self):
        pass
