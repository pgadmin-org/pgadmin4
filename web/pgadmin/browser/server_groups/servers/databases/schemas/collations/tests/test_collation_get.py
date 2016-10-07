# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from . import utils as collation_utils


class CollationGetTestCase(BaseTestGenerator):
    """ This class will fetch new collation under schema node. """
    scenarios = [
        # Fetching default URL for collation node.
        ('Fetch collation Node URL', dict(url='/browser/collation/obj/'))
    ]

    def setUp(self):
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        coll_name = "collation_get_%s" % str(uuid.uuid4())[1:6]
        self.collation = collation_utils.create_collation(self.server,
                                                          self.schema_name,
                                                          coll_name,
                                                          self.db_name)

    def runTest(self):
        """ This function will fetch collation under schema node. """
        server_id = self.schema_info["server_id"]
        db_id = self.schema_info["db_id"]
        db_con = database_utils.connect_database(self,
                                                 utils.SERVER_GROUP,
                                                 server_id,
                                                 db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database.")

        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema.")
        collation_id = self.collation[0]
        schema_id = self.schema_info["schema_id"]
        get_response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' + str(
                server_id) + '/' +
            str(db_id) + '/' + str(schema_id) + '/' + str(collation_id),
            content_type='html/json')
        self.assertEquals(get_response.status_code, 200)
        # Disconnect database to delete it
        database_utils.disconnect_database(self, server_id, db_id)

    def tearDown(self):
        pass
