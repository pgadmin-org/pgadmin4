# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import json
import uuid

from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils


class TypesAddTestCase(BaseTestGenerator):
    """ This class will add type under schema node. """
    scenarios = [
        ('Add type under schema node', dict(url='/browser/type/obj/'))
    ]

    def setUp(self):
        self.db_name = parent_node_dict["database"][-1]["db_name"]
        schema_info = parent_node_dict["schema"][-1]
        self.server_id = schema_info["server_id"]
        self.db_id = schema_info["db_id"]
        db_con = database_utils.connect_database(self, utils.SERVER_GROUP,
                                                 self.server_id, self.db_id)
        if not db_con['data']["connected"]:
            raise Exception("Could not connect to database to add a type.")
        self.schema_id = schema_info["schema_id"]
        self.schema_name = schema_info["schema_name"]
        schema_response = schema_utils.verify_schemas(self.server,
                                                      self.db_name,
                                                      self.schema_name)
        if not schema_response:
            raise Exception("Could not find the schema to add a type.")

    def runTest(self):
        """ This function will add type under schema node. """
        db_user = self.server["username"]
        self.type_name = "test_type_add_%s" % (str(uuid.uuid4())[1:6])
        data = {"name": self.type_name,
                "is_sys_type": False,
                "typtype": "c",
                "typeowner": db_user,
                "schema": self.schema_name,
                "composite": [{"member_name": "one", "type": "abstime",
                               "is_tlength": False, "is_precision": False},
                              {"member_name": "two", "type": "\"char\"[]",
                               "is_tlength": False, "is_precision": False}],
                "enum": [], "typacl": [], "seclabels": []}
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.db_id) +
            '/' + str(self.schema_id) + '/',
            data=json.dumps(data),
            content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        # Disconnect the database
        database_utils.disconnect_database(self, self.server_id, self.db_id)
