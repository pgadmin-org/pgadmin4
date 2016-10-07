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
from . import utils as domain_utils


class DomainPutTestCase(BaseTestGenerator):
    """ This class will fetch new collation under schema node. """
    scenarios = [
        # Fetching default URL for domain node.
        ('Fetch domain Node URL', dict(url='/browser/domain/obj/'))
    ]

    def setUp(self):
        self.database_info = parent_node_dict["database"][-1]
        self.db_name = self.database_info["db_name"]
        self.schema_info = parent_node_dict["schema"][-1]
        self.schema_name = self.schema_info["schema_name"]
        self.schema_id = self.schema_info["schema_id"]
        self.domain_name = "domain_put_%s" % (str(uuid.uuid4())[1:6])
        self.domain_info = domain_utils.create_domain(self.server,
                                                      self.db_name,
                                                      self.schema_name,
                                                      self.schema_id,
                                                      self.domain_name)

    def runTest(self):
        """ This function will update domain under schema node. """
        db_id = self.database_info["db_id"]
        server_id = self.database_info["server_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 server_id, db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to get the domain.")
        db_name = self.database_info["db_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to get the domain.")
        domain_response = domain_utils.verify_domain(self.server,
                                                     db_name,
                                                     self.schema_id,
                                                     self.domain_name)
        if not domain_response:
            raise Exception("Could not find the domain to update.")
        domain_id = self.domain_info[0]
        data = {"description": "This is domain update comment",
                "id": domain_id,
                }
        response = self.tester.put(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(server_id) + '/' +
            str(db_id) + '/' +
            str(self.schema_id) + '/' +
            str(domain_id),
            data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)
        # Disconnect the database
        database_utils.disconnect_database(self, server_id, db_id)

    def tearDown(self):
        pass
