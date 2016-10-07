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


class DomainAddTestCase(BaseTestGenerator):
    """ This class will add new domain under schema node. """

    scenarios = [
        # Fetching default URL for domain node.
        ('Fetch domain Node URL', dict(url='/browser/domain/obj/'))
    ]

    def setUp(self):
        pass

    def runTest(self):
        """ This function will add domain under schema node. """
        db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add collation.")
        schema_id = schema_info["schema_id"]
        schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      db_name,
                                                      schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add the collation.")

        data = {
            "basensp": schema_name,
            "basetype": "character",
            "collname": "pg_catalog.\"POSIX\"",
            "constraints": [{
                "conname": "num",
                "convalidated": True
            }],
            "is_tlength": True,
            "max_val": 2147483647,
            "min_val": 1,
            "name": "domain_add_%s" % (str(uuid.uuid4())[1:6]),
            "owner": self.server["username"],
            "seclabels": [],
            "typdefault": "1",
            "typlen": "10"
        }
        # Call POST API to add domain
        response = self.tester.post(self.url + str(utils.SERVER_GROUP) + '/' +
                                    str(self.server_id) + '/' + str(
            self.db_id) +
                                    '/' + str(schema_id) + '/',
                                    data=json.dumps(data),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
